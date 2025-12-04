import pdf from 'pdf-parse';
import { aiService } from './aiService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ingestionService = {
    async processRecipePdf(fileBuffer: Buffer) {
        // 1. Extract Text from PDF
        const rawText = await this.extractText(fileBuffer);

        // 2. Structure Extraction (LLM Pass 1)
        const structure = await aiService.extractStructure(rawText);

        // 3. Entity Resolution (The "Palantir" Link)
        const resolved = await this.resolveEntities(structure);

        // 4. Context Enrichment (LLM Pass 2)
        const enrichedSteps = await Promise.all(resolved.steps.map(async (step: any) => {
            const context = await aiService.analyzeReactionStep(
                step.name,
                step.description,
                step.materials,
                step.conditions
            );
            return { ...step, context };
        }));

        // 5. Return the DRAFT object
        return {
            recipeName: structure.suggestedName,
            steps: enrichedSteps,
            ingredients: resolved.ingredients,
            outputs: resolved.outputs,
            confidence: 0.85 // Placeholder confidence score
        };
    },

    async extractText(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            console.error("PDF Parse Error:", error);
            throw new Error("Failed to parse PDF");
        }
    },

    async resolveEntities(structure: any) {
        // Logic to find Equipment and Materials in DB

        // Resolve Ingredients
        const resolvedIngredients = await Promise.all(structure.ingredients.map(async (ing: any) => {
            const material = await prisma.material.findFirst({
                where: { name: { contains: ing.name, mode: 'insensitive' } }
            });
            return {
                ...ing,
                materialId: material?.id || null,
                status: material ? 'mapped' : 'new'
            };
        }));

        // Resolve Equipment in Steps
        const resolvedSteps = await Promise.all(structure.steps.map(async (step: any) => {
            // Simple heuristic: check if step description mentions any equipment name
            // In a real app, LLM would extract equipment name specifically
            const equipment = await prisma.equipment.findFirst({
                where: {
                    OR: [
                        { name: { contains: step.description, mode: 'insensitive' } }
                    ]
                }
            });

            return {
                ...step,
                equipmentId: equipment?.id || null,
                equipmentName: equipment?.name || null
            };
        }));

        return {
            ...structure,
            ingredients: resolvedIngredients,
            steps: resolvedSteps
        };
    }
};
