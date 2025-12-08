import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
    const filePath = path.join(__dirname, 'data', 'energy_balance_heat.csv');
    console.log(`Reading heat calculation data from ${filePath}...`);

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet) as any[];

    console.log(`Found ${data.length} load records.`);

    // 1. Ensure Dummy Recipe "Dicamba" and Steps exist
    let recipe = await prisma.recipe.findFirst({
        where: { name: 'Dicamba' },
        include: { steps: true }
    });

    if (!recipe) {
        console.log('Creating placeholder "Dicamba" recipe...');
        recipe = await prisma.recipe.create({
            data: {
                name: 'Dicamba',
                product: 'Dicamba Technical',
                version: 1,
                status: 'approved',
                steps: {
                    create: [
                        { stepNumber: 10, name: 'Hydrolysis', duration: 120 },
                        { stepNumber: 20, name: 'Exothermic Reaction', duration: 240 },
                        { stepNumber: 30, name: 'Crystallization', duration: 180 },
                        { stepNumber: 40, name: 'Filtration', duration: 60 },
                    ]
                }
            },
            include: { steps: true }
        });
    } else {
        console.log('Using existing "Dicamba" recipe.');
    }

    // 2. Map CSV to RecipeSteps
    for (const row of data) {
        const stepName = row['PROCESS STEPS'];
        if (!stepName) continue;

        const steam = parseFloat(row['L. P. Steam (Peak Load)'] || '0');
        const cooling = parseFloat(row['Cooling Water'] || '0');
        const chilled = parseFloat(row['Chilled Water'] || '0');
        const power = parseFloat(row['Power'] || '0'); // If present

        // Find step
        const step = recipe.steps.find(s => s.name.toLowerCase() === stepName.toLowerCase());

        if (step) {
            await prisma.recipeStep.update({
                where: { id: step.id },
                data: {
                    steamRequired: steam,
                    // Note: schema uses coolingRequired (not Load)
                    coolingRequired: cooling,
                    chilledWaterRequired: chilled,
                    powerRequired: power
                }
            });
            console.log(`Updated Step "${stepName}": Steam=${steam}, Cooling=${cooling}, CW=${chilled}`);
        } else {
            console.warn(`Step "${stepName}" not found in recipe.`);
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
