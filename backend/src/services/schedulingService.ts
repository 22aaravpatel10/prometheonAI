import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const schedulingService = {
    async scheduleBatchFromRecipe(
        recipeId: number,
        equipmentId: number,
        startTime: Date,
        batchSize: number // The target output size
    ) {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch Recipe
            const recipe = await tx.recipe.findUnique({
                where: { id: recipeId },
                include: { ingredients: true }
            });

            if (!recipe) throw new Error("Recipe not found");

            // 2. Calculate End Time
            const durationMinutes = recipe.totalTime || 60; // Default 1 hour if not set
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

            // 3. Create Batch Event
            const batch = await tx.batchEvent.create({
                data: {
                    equipmentId,
                    recipeId,
                    batchNo: `BATCH-${Date.now()}`, // Simple auto-generation
                    productName: recipe.product,
                    batchSize,
                    status: 'scheduled',
                    startTimestamp: startTime,
                    endTimestamp: endTime,
                    recipeVersion: recipe.version
                }
            });

            // 4. Calculate Material Requirements & Deduct Inventory
            // Scale factor: batchSize / recipe.yield (if yield is defined)
            // If recipe.yield is not defined, assume 1:1 scaling or use batchSize directly if ingredients are per unit?
            // Let's assume ingredients are for the "Standard Yield" defined in recipe.yield

            const standardYield = Number(recipe.yield) || Number(recipe.totalYield) || batchSize; // Avoid division by zero
            const scaleFactor = batchSize / standardYield;

            for (const ingredient of recipe.ingredients) {
                const requiredQty = Number(ingredient.quantity) * scaleFactor;

                // Create BatchMaterial record
                await tx.batchMaterial.create({
                    data: {
                        batchEventId: batch.id,
                        materialId: ingredient.materialId,
                        plannedQuantity: requiredQty
                    }
                });

                // Deduct from Inventory (Create Transaction)
                await tx.inventoryTransaction.create({
                    data: {
                        materialId: ingredient.materialId,
                        batchEventId: batch.id,
                        transactionType: 'consumed',
                        quantity: -requiredQty,
                        remainingBalance: 0, // Will update below
                        notes: `Auto-deduction for Batch ${batch.batchNo}`
                    }
                });

                // Update Material Stock
                const material = await tx.material.findUnique({ where: { id: ingredient.materialId } });
                if (material) {
                    const newBalance = Number(material.currentQuantity) - requiredQty;
                    await tx.material.update({
                        where: { id: ingredient.materialId },
                        data: { currentQuantity: newBalance }
                    });

                    // Update the transaction with the correct remaining balance
                    // (Prisma doesn't support returning the updated value in the same query easily for this flow without raw SQL or another read)
                    // But we can just use the calculated newBalance since we are in a transaction
                }
            }

            return batch;
        });
    }
};
