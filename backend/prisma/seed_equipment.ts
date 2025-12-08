import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
    const filePath = path.join(__dirname, 'data', 'energy_balance_power.csv');
    console.log(`Reading equipment data from ${filePath}...`);

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet) as any[];

    console.log(`Found ${data.length} records.`);

    for (const row of data) {
        const tag = row['EQPT.'];
        const description = row['DESCRIPTION'];
        const capacityRaw = row['CAPACITY / H.T.A.'];

        if (!tag) continue;

        let maxSteamLoad: number | undefined;
        let maxCoolingLoad: number | undefined;
        let maxChilledWaterLoad: number | undefined;

        if (capacityRaw) {
            const capString = String(capacityRaw);
            if (capString.includes('TPH')) {
                maxSteamLoad = parseFloat(capString.replace('TPH', '').trim());
            } else if (capString.includes('TR')) {
                const val = parseFloat(capString.replace('TR', '').trim());
                // Heuristic: CT = Cooling Tower, CHW = Chilled Water
                if (tag.includes('CT') || description.toLowerCase().includes('cooling tower')) {
                    maxCoolingLoad = val;
                } else if (tag.includes('CHW') || description.toLowerCase().includes('chiller')) {
                    maxChilledWaterLoad = val;
                } else {
                    // Default to cooling if unsure? Or skip?
                    // Prompt implied specific logic but "CT" vs "CHW" is a good differentiator
                    maxCoolingLoad = val;
                }
            }
        }

        // Upsert Equipment
        // We check if it exists by equipmentId (tag) or name.
        // Ideally equipmentId should be unique.

        // First try to find by tag
        let equipment = await prisma.equipment.findFirst({
            where: { equipmentId: tag }
        });

        if (!equipment) {
            // Try create
            equipment = await prisma.equipment.create({
                data: {
                    name: description || tag,
                    equipmentId: tag,
                    maxSteamLoad,
                    maxCoolingLoad,
                    maxChilledWaterLoad
                }
            });
            console.log(`Created ${tag}: ${description}`);
        } else {
            // Update
            equipment = await prisma.equipment.update({
                where: { id: equipment.id },
                data: {
                    maxSteamLoad: maxSteamLoad || equipment.maxSteamLoad,
                    maxCoolingLoad: maxCoolingLoad || equipment.maxCoolingLoad,
                    maxChilledWaterLoad: maxChilledWaterLoad || equipment.maxChilledWaterLoad
                }
            });
            console.log(`Updated ${tag} with loads.`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
