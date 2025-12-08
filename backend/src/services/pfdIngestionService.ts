import * as xlsx from 'xlsx';
import { aiService } from './aiService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const pfdIngestionService = {
    async processPFD(fileBuffer: Buffer) {
        // 1. Parse Excel to CSV/Text
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const csvContent = xlsx.utils.sheet_to_csv(sheet);

        // 2. Send to AI for extraction
        const extractionResult = await aiService.extractPFDStructure(csvContent);

        // 3. Create Entities (Equipment, Streams -> Materials/Recipes)
        const result = {
            equipment: [] as any[],
            streams: [] as any[],
        };

        // Create Equipment
        for (const item of extractionResult.equipment) {
            // Check if exists
            const existing = await prisma.equipment.findFirst({ where: { name: item.name } });

            if (existing) {
                // Update existing
                const equip = await prisma.equipment.update({
                    where: { id: existing.id },
                    data: {
                        equipmentId: item.tag || existing.equipmentId
                    }
                });
                result.equipment.push(equip);
            } else {
                const equip = await prisma.equipment.create({
                    data: {
                        name: item.name,
                        equipmentId: item.tag,
                    }
                });
                result.equipment.push(equip);
            }
        }

        return {
            raw: extractionResult,
            created: result
        };
    },

    async ingestEquipmentFromEnergyBalance(fileBuffer: Buffer) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        const results = [];

        for (const row of data) {
            // Heuristic: Look for Equipment Tag or Name column
            // Assuming simplified rows: { "Equipment Tag": "B-101", "Name": "Boiler", "Max Steam": 5.0, ... }
            const tag = row['Tag'] || row['Equipment Tag'] || row['Equipment_Tag'];
            const name = row['Name'] || row['Description'];

            if (!tag && !name) continue;

            const maxSteamLoad = parseFloat(row['Max Steam Load'] || row['Steam Load'] || row['Steam_Load'] || '0');
            const maxPowerLoad = parseFloat(row['Max Power Load'] || row['Power Load'] || row['Power_Load'] || '0');
            // Assuming Cooling/Chilled Water from user prompt context
            const maxCoolingLoad = parseFloat(row['Max Cooling Load'] || '0');
            const maxChilledWaterLoad = parseFloat(row['Max Chilled Water Load'] || '0');

            // Find by tag or name
            let equipment = await prisma.equipment.findFirst({
                where: { OR: [{ equipmentId: tag }, { name: name }] }
            });

            if (equipment) {
                equipment = await prisma.equipment.update({
                    where: { id: equipment.id },
                    data: {
                        maxSteamLoad: maxSteamLoad || undefined,
                        maxPowerLoad: maxPowerLoad || undefined,
                        maxCoolingLoad: maxCoolingLoad || undefined,
                        maxChilledWaterLoad: maxChilledWaterLoad || undefined
                    }
                });
                results.push({ status: 'updated', equipment });
            } else if (name) {
                equipment = await prisma.equipment.create({
                    data: {
                        name: name,
                        equipmentId: tag,
                        maxSteamLoad: maxSteamLoad || 0,
                        maxPowerLoad: maxPowerLoad || 0,
                        maxCoolingLoad: maxCoolingLoad || 0,
                        maxChilledWaterLoad: maxChilledWaterLoad || 0
                    }
                });
                results.push({ status: 'created', equipment });
            }
        }
        return results;
    },

    async ingestUtilityRequirements(fileBuffer: Buffer, recipeId: number) {
        // Updates RecipeStep records based on 'Heat Calculation' data
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        // Assume specific sheet or auto-detect
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        const results = [];

        // Check if recipe exists
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: { steps: true }
        });
        if (!recipe) throw new Error(`Recipe ${recipeId} not found`);

        for (const row of data) {
            // Find matching step
            const stepNameMatch = row['Step Name'] || row['Operation'] || row['Step'];
            if (!stepNameMatch) continue;

            const steamReq = parseFloat(row['Steam Required'] || row['Steam'] || '0'); // TPH
            const powerReq = parseFloat(row['Power Required'] || row['Power'] || '0'); // KW
            const coolingReq = parseFloat(row['Cooling Required'] || row['Cooling'] || '0'); // TR
            const chilledWaterReq = parseFloat(row['Chilled Water Required'] || row['Chilled Water'] || '0'); // TR

            // Fuzzy match step name or exact match via step number if available
            // For now, strict name match or partial match
            const step = recipe.steps.find(s => s.name.toLowerCase().includes(stepNameMatch.toLowerCase()));

            if (step) {
                const updatedStep = await prisma.recipeStep.update({
                    where: { id: step.id },
                    data: {
                        steamRequired: steamReq,
                        powerRequired: powerReq,
                        coolingRequired: coolingReq,
                        chilledWaterRequired: chilledWaterReq
                    }
                });
                results.push({ status: 'updated', step: updatedStep });
            }
        }
        return results;
    }
};
