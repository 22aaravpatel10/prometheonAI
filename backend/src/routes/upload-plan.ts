import express from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedData {
    batchMetadata: {
        productName: string;
        batchId: string;
        plannedStart: string;
        plannedEnd: string;
    };
    equipment: {
        id: string;
        name: string; // Description
        type: string; // e.g., Reactor, Filter
    }[];
    inventory: {
        name: string;
        quantity: number;
        unit: string;
    }[];
    steps: {
        stepNumber: number;
        title: string;
        equipmentId: string;
        startTime: string;
        endTime: string;
        type: 'BATCH' | 'MAINTENANCE' | 'OTHER';
    }[];
}

async function parsePDFWithOpenAI(text: string): Promise<ExtractedData> {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: `You are an expert manufacturing data parser. Your job is to extract structured data from a "Batch Execution Plan" or "Process Plan" document text.
                
                Extract the following:
                1. Batch Metadata (Product Name, Batch ID, Planned Start/End).
                2. Equipment List (ID, Description/Name). Infer a simple type (Reactor, Filter, Dryer, Tank) from the description.
                3. Inventory Requirements (Material Name, Quantity, Unit). Look for "Ingredients", "Bill of Materials", or "Inputs".
                4. Process Steps (Step Number, Title, Equipment ID, Start Time, End Time, Type).
                
                Return ONLY a valid JSON object with this structure:
                {
                    "batchMetadata": { "productName": "...", "batchId": "...", "plannedStart": "ISOString", "plannedEnd": "ISOString" },
                    "equipment": [ { "id": "...", "name": "...", "type": "..." } ],
                    "inventory": [ { "name": "...", "quantity": 123.45, "unit": "kg" } ],
                    "steps": [ { "stepNumber": 1, "title": "...", "equipmentId": "...", "startTime": "ISOString", "endTime": "ISOString", "type": "BATCH" } ]
                }
                
                If dates are relative or missing year, assume the current year or the year found in the metadata.
                Ensure dates are in valid ISO 8601 format (YYYY-MM-DDTHH:mm:ss).
                `
            },
            {
                role: "user",
                content: `Here is the document text:\n\n${text}`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Failed to get JSON from OpenAI");
    return JSON.parse(content) as ExtractedData;
}

router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        let text = '';

        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            text = data.text;
        } else {
            // Fallback for Excel (convert to CSV-like text for LLM)
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            text = xlsx.utils.sheet_to_csv(sheet);
        }

        // 1. Parse with OpenAI
        console.log("Sending text to OpenAI for parsing...");
        const extractedData = await parsePDFWithOpenAI(text);
        console.log("Extracted Data:", JSON.stringify(extractedData, null, 2));

        const createdEvents = [];
        const createdEquipment = [];
        const createdMaterials = [];

        // 2. Upsert Equipment
        for (const eq of extractedData.equipment) {
            // Check if exists by name or ID
            const existing = await prisma.equipment.findFirst({
                where: {
                    OR: [
                        { equipmentId: { equals: eq.id, mode: 'insensitive' } },
                        { name: { equals: eq.id, mode: 'insensitive' } } // Sometimes ID is used as name
                    ]
                }
            });

            if (!existing) {
                const newEq = await prisma.equipment.create({
                    data: {
                        name: eq.name || eq.id,
                        equipmentId: eq.id,
                        status: 'available',
                        isCustom: true,
                        // Default values
                        location: 'Main Plant',
                    }
                });
                createdEquipment.push(newEq);
            }
        }

        // 3. Create Events
        for (const step of extractedData.steps) {
            // Find the equipment (we just ensured it exists or we try to find it again)
            const equipment = await prisma.equipment.findFirst({
                where: {
                    OR: [
                        { equipmentId: { equals: step.equipmentId, mode: 'insensitive' } },
                        { name: { equals: step.equipmentId, mode: 'insensitive' } }
                    ]
                }
            });

            if (equipment) {
                // Determine event type
                if (step.type === 'MAINTENANCE') {
                    const event = await prisma.maintenanceEvent.create({
                        data: {
                            equipmentId: equipment.id,
                            reason: 'scheduled',
                            changesMade: step.title, // Store the description here
                            startTimestamp: new Date(step.startTime),
                            endTimestamp: new Date(step.endTime),
                            supervisorName: 'System Import'
                        }
                    });
                    createdEvents.push(event);
                } else {
                    // Batch Event
                    const event = await prisma.batchEvent.create({
                        data: {
                            equipmentId: equipment.id,
                            batchNo: extractedData.batchMetadata.batchId,
                            productName: extractedData.batchMetadata.productName,
                            startTimestamp: new Date(step.startTime),
                            endTimestamp: new Date(step.endTime),
                            status: 'scheduled',
                            inputs: { stepName: step.title, stepNumber: step.stepNumber }
                        }
                    });
                    createdEvents.push(event);

                    // 4. Link Inventory (only for the first step or if we can map it better, 
                    // but for now let's add all inventory to the first batch event of the sequence 
                    // or just add it to the first event we create for this batch)
                    if (createdEvents.length === 1 && extractedData.inventory && extractedData.inventory.length > 0) {
                        for (const item of extractedData.inventory) {
                            // Find or create material
                            let material = await prisma.material.findFirst({
                                where: { name: { equals: item.name, mode: 'insensitive' } }
                            });

                            if (!material) {
                                material = await prisma.material.create({
                                    data: {
                                        name: item.name,
                                        materialId: item.name.toUpperCase().replace(/\s+/g, '-'),
                                        currentQuantity: 0,
                                        minimumStock: 100,
                                        unit: item.unit
                                    }
                                });
                                createdMaterials.push(material);
                            }

                            // Create BatchMaterial
                            await prisma.batchMaterial.create({
                                data: {
                                    batchEventId: event.id,
                                    materialId: material.id,
                                    plannedQuantity: item.quantity
                                }
                            });
                        }
                    }
                }
            } else {
                console.warn(`Could not find equipment for step: ${step.title} (ID: ${step.equipmentId})`);
            }
        }

        res.json({
            message: 'Plan processed successfully',
            eventsCreated: createdEvents.length,
            equipmentCreated: createdEquipment.length,
            materialsCreated: createdMaterials.length,
            details: {
                batchId: extractedData.batchMetadata.batchId,
                product: extractedData.batchMetadata.productName
            }
        });

    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message || 'Failed to process upload' });
    }
});

export default router;
