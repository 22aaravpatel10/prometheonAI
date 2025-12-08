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
        // This is a simplified implementation focusing on creating Equipment first as per instructions
        const result = {
            equipment: [] as any[],
            streams: [] as any[],
        };

        // Create Equipment
        for (const item of extractionResult.equipment) {
            const equip = await prisma.equipment.create({
                data: {
                    name: item.name,
                    equipmentId: item.tag, // e.g. "R-101"
                    // Map other fields if available
                }
            });
            result.equipment.push(equip);
        }

        // Create Streams (Materials) - explicit "Input/Output stream" logic to be expanded
        // For now returning the extraction result for review
        return {
            raw: extractionResult,
            created: result
        };
    }
};
