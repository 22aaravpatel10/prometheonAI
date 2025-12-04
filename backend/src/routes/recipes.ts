import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireWriteAccess, requireReadAccess } from '../middleware/auth';
import { aiService } from '../services/aiService';

const router = express.Router();
const prisma = new PrismaClient();

// POST /recipes/:id/analyze - Trigger AI analysis for recipe steps
router.post('/:id/analyze', authenticateToken, requireWriteAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Fetch recipe with steps and materials
        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                steps: {
                    include: {
                        reactionContext: true
                    },
                    orderBy: { stepNumber: 'asc' }
                },
                materials: {
                    include: {
                        material: true
                    }
                }
            }
        });

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const results = [];

        // Iterate through steps and analyze
        for (const step of recipe.steps) {
            // Skip if already analyzed recently (e.g., within last 24 hours) - optional logic
            // For now, we force re-analysis if requested

            // Filter materials for this step
            const stepMaterials = recipe.materials
                .filter(rm => rm.stepNumber === step.stepNumber)
                .map(rm => ({
                    name: rm.material.name,
                    quantity: Number(rm.quantity),
                    unit: rm.unit
                }));

            const conditions = {
                temp: step.temperature ? Number(step.temperature) : undefined,
                pressure: step.pressure ? Number(step.pressure) : undefined
            };

            try {
                const analysis = await aiService.analyzeReactionStep(
                    step.name,
                    step.description || '',
                    stepMaterials,
                    conditions
                );

                // Save to database
                const savedContext = await prisma.reactionContext.upsert({
                    where: { recipeStepId: step.id },
                    create: {
                        recipeStepId: step.id,
                        reactionType: analysis.reactionType,
                        description: analysis.description,
                        thermodynamics: analysis.thermodynamics as any,
                        kinetics: analysis.kinetics as any,
                        safetyData: analysis.safetyData as any,
                        optimization: analysis.optimization as any,
                        literatureRefs: analysis.literatureRefs as any,
                        lastResearched: new Date()
                    },
                    update: {
                        reactionType: analysis.reactionType,
                        description: analysis.description,
                        thermodynamics: analysis.thermodynamics as any,
                        kinetics: analysis.kinetics as any,
                        safetyData: analysis.safetyData as any,
                        optimization: analysis.optimization as any,
                        literatureRefs: analysis.literatureRefs as any,
                        lastResearched: new Date()
                    }
                });

                results.push({ stepId: step.id, status: 'analyzed', context: savedContext });
            } catch (error) {
                console.error(`Error analyzing step ${step.stepNumber}:`, error);
                results.push({ stepId: step.id, status: 'failed', error: 'Analysis failed' });
            }
        }

        res.json({ message: 'Analysis complete', results });
    } catch (error) {
        console.error('Error analyzing recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /recipes/:id - Get recipe details including AI context
router.get('/:id', authenticateToken, requireReadAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                steps: {
                    include: {
                        reactionContext: true,
                        equipment: true
                    },
                    orderBy: { stepNumber: 'asc' }
                },
                materials: {
                    include: {
                        material: true
                    }
                },
                createdBy: {
                    select: { email: true }
                }
            }
        });

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.json(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

import multer from 'multer';
import { ingestionService } from '../services/ingestionService';

const upload = multer({ storage: multer.memoryStorage() });

// ... existing code ...

// Ingest PDF to create Recipe Draft
router.post('/ingest-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const draftRecipe = await ingestionService.processRecipePdf(req.file.buffer);
        res.json(draftRecipe);
    } catch (error: any) {
        console.error('Error ingesting PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new recipe
router.post('/', authenticateToken, requireWriteAccess, async (req, res) => {
    try {
        const {
            name,
            product,
            version,
            yield: yieldAmount,
            yieldUnit,
            totalTime,
            status,
            description,
            totalYield,
            contextData,
            sourceFile,
            steps,
            ingredients,
            outputs
        } = req.body;

        const recipe = await prisma.recipe.create({
            data: {
                name,
                product: product || name, // Default to name if product not provided
                version: version || 1,
                yield: yieldAmount,
                yieldUnit,
                totalTime,
                status: status || 'draft',
                description,
                totalYield,
                contextData,
                sourceFile,
                createdByUserId: (req as any).user.userId,
                steps: {
                    create: steps?.map((step: any, index: number) => ({
                        stepNumber: step.stepNumber || index + 1,
                        name: step.name,
                        description: step.description,
                        equipmentId: step.equipmentId,
                        duration: step.duration,
                        temperature: step.conditions?.temp,
                        temperatureUnit: 'C', // Default
                        pressure: step.conditions?.pressure,
                        pressureUnit: 'bar', // Default
                        reactionContext: step.context ? {
                            create: {
                                reactionType: step.context.reactionType,
                                description: step.context.description,
                                thermodynamics: step.context.thermodynamics,
                                kinetics: step.context.kinetics,
                                safetyData: step.context.safetyData,
                                optimization: step.context.optimization,
                                literatureRefs: step.context.literatureRefs
                            }
                        } : undefined
                    }))
                },
                ingredients: {
                    create: ingredients?.map((ing: any) => ({
                        materialId: ing.materialId,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        stepNumber: ing.stepNumber
                    }))
                },
                outputs: {
                    create: outputs?.map((out: any) => ({
                        name: out.name,
                        type: out.type,
                        amount: out.amount,
                        targetTank: out.targetTank
                    }))
                }
            },
            include: {
                steps: true,
                ingredients: true,
                outputs: true
            }
        });

        res.status(201).json(recipe);
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List all recipes
router.get('/', authenticateToken, requireReadAccess, async (req, res) => {
    try {
        const recipes = await prisma.recipe.findMany({
            include: {
                _count: {
                    select: { steps: true, ingredients: true }
                },
                createdBy: {
                    select: { email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(recipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
