import express from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import axios from 'axios';
import { authenticateToken, requireWriteAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation schemas
const materialSchema = Joi.object({
  materialId: Joi.string().optional(),
  name: Joi.string().required(),
  currentQuantity: Joi.number().required(),
  unit: Joi.string().required(),
  minimumStock: Joi.number().required(),
  supplier: Joi.string().optional().allow(''),
  costPerUnit: Joi.number().optional(),
  casNumber: Joi.string().optional().allow(''),
  safetyTags: Joi.array().items(Joi.string()).optional()
});

const transactionSchema = Joi.object({
  materialId: Joi.number().required(),
  batchEventId: Joi.number().optional(),
  transactionType: Joi.string().valid('consumed', 'received', 'adjusted').required(),
  quantity: Joi.number().required(),
  notes: Joi.string().optional().allow('')
});

// Lookup GHS Tags via AI and PubChem
router.post('/lookup-ghs', authenticateToken, async (req, res) => {
  try {
    const { casNumber } = req.body;

    if (!casNumber) {
      return res.status(400).json({ error: 'CAS Number is required' });
    }

    // Step 1: Fetch from PubChem
    let pubChemData = '';
    try {
      // Get CID
      const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${casNumber}/cids/JSON`;
      const cidRes = await axios.get(cidUrl);
      const cid = cidRes.data.IdentifierList?.CID?.[0];
      console.log(`[GHS Lookup] CAS: ${casNumber}, CID: ${cid}`);

      if (cid) {
        // Get Safety Data
        const safetyUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=Safety+and+Hazards`;
        const safetyRes = await axios.get(safetyUrl);

        const sections = safetyRes.data.Record?.Section || [];
        const safetySection = sections.find((s: any) => s.TOCHeading === 'Safety and Hazards');
        const hazardsSection = safetySection?.Section?.find((s: any) => s.TOCHeading === 'Hazards Identification');
        const ghsSection = hazardsSection?.Section?.find((s: any) => s.TOCHeading === 'GHS Classification');

        if (ghsSection) {
          const information = ghsSection.Information || [];
          const hazardStatements = information.find((i: any) => i.Name === 'GHS Hazard Statements');

          if (hazardStatements) {
            pubChemData = hazardStatements.Value.StringWithMarkup.map((item: any) => item.String).join('\n');
            console.log(`[GHS Lookup] PubChem Data Found: ${pubChemData.length} chars`);
          } else {
            console.log('[GHS Lookup] No GHS Hazard Statements found in PubChem response');
          }
        } else {
          console.log('[GHS Lookup] No GHS Classification section found');
        }
      } else {
        console.log('[GHS Lookup] No CID found for CAS');
      }
    } catch (pubChemError) {
      console.warn('[GHS Lookup] PubChem lookup failed:', pubChemError);
      // Continue to AI fallback if PubChem fails
    }

    const prompt = `
      You are a chemical safety expert. 
      ${pubChemData ? `I have retrieved the following GHS Hazard Statements from PubChem for CAS ${casNumber}:\n${pubChemData}\n\nBased on these statements,` : `Given the CAS Number "${casNumber}",`}
      identify the applicable GHS Hazard Classes from the Master List below.
      
      Return ONLY a JSON array of strings from the Master List. Do not include any other text.
      
      Master List:
      - Explosives
      - Flammable gases
      - Flammable aerosols
      - Oxidizing gases
      - Gases under pressure
      - Flammable liquids
      - Flammable solids
      - Self-reactive substances and mixtures
      - Pyrophoric liquids
      - Pyrophoric solids
      - Pyrophoric gases
      - Self-heating substances and mixtures
      - Substances which, in contact with water, emit flammable gases
      - Oxidizing liquids
      - Oxidizing solids
      - Organic peroxides
      - Corrosive to metals
      - Desensitized explosives
      - Acute toxicity (oral)
      - Acute toxicity (dermal)
      - Acute toxicity (inhalation)
      - Skin corrosion / irritation
      - Serious eye damage / eye irritation
      - Respiratory sensitization
      - Skin sensitization
      - Germ cell mutagenicity
      - Carcinogenicity
      - Reproductive toxicity
      - Specific target organ toxicity – Single exposure
      - Specific target organ toxicity – Repeated exposure
      - Aspiration hazard
      - Hazardous to aquatic environment — acute
      - Hazardous to aquatic environment — chronic
      - Hazardous to the ozone layer
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o',
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    const result = JSON.parse(content || '{"tags": []}');

    // Handle if the AI returns an object with a key like "tags" or just the array
    const tags = Array.isArray(result) ? result : (result.tags || result.hazardClasses || []);

    res.json({ tags });
  } catch (error) {
    console.error('Error looking up GHS tags:', error);
    res.status(500).json({ error: 'Failed to lookup GHS tags' });
  }
});

// Get all materials
router.get('/', authenticateToken, async (req, res) => {
  // ... (rest of the file)

  try {
    const materials = await prisma.material.findMany({
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Check for low stock
    const materialsWithAlerts = materials.map(material => ({
      ...material,
      isLowStock: Number(material.currentQuantity) <= Number(material.minimumStock)
    }));

    res.json(materialsWithAlerts);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Get low stock materials
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' }
    });

    const lowStockMaterials = materials.filter(
      material => Number(material.currentQuantity) <= Number(material.minimumStock)
    );

    res.json(lowStockMaterials);
  } catch (error) {
    console.error('Error fetching low stock materials:', error);
    res.status(500).json({ error: 'Failed to fetch low stock materials' });
  }
});

// Get single material
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findUnique({
      where: { id: parseInt(id) },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 50,
          include: {
            batchEvent: {
              select: { batchNo: true, productName: true }
            }
          }
        }
      }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// Create material
router.post('/', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { error, value } = materialSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const material = await prisma.material.create({
      data: {
        materialId: value.materialId,
        name: value.name,
        currentQuantity: value.currentQuantity,
        unit: value.unit,
        minimumStock: value.minimumStock,
        supplier: value.supplier,
        costPerUnit: value.costPerUnit,
        casNumber: value.casNumber,
        safetyTags: value.safetyTags
      }
    });

    // Create initial transaction
    await prisma.inventoryTransaction.create({
      data: {
        materialId: material.id,
        transactionType: 'received',
        quantity: value.currentQuantity,
        remainingBalance: value.currentQuantity,
        notes: 'Initial inventory'
      }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Update material
router.put('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = materialSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: {
        materialId: value.materialId,
        name: value.name,
        currentQuantity: value.currentQuantity,
        unit: value.unit,
        minimumStock: value.minimumStock,
        supplier: value.supplier,
        costPerUnit: value.costPerUnit,
        casNumber: value.casNumber,
        safetyTags: value.safetyTags
      }
    });

    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Delete material
router.delete('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.material.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// Create inventory transaction
router.post('/transactions', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get current material
    const material = await prisma.material.findUnique({
      where: { id: value.materialId }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    let newQuantity = Number(material.currentQuantity);

    if (value.transactionType === 'consumed') {
      newQuantity -= value.quantity;
    } else if (value.transactionType === 'received') {
      newQuantity += value.quantity;
    } else if (value.transactionType === 'adjusted') {
      newQuantity = value.quantity; // Set to absolute value
    }

    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        materialId: value.materialId,
        batchEventId: value.batchEventId,
        transactionType: value.transactionType,
        quantity: value.quantity,
        remainingBalance: newQuantity,
        notes: value.notes
      }
    });

    // Update material quantity
    await prisma.material.update({
      where: { id: value.materialId },
      data: { currentQuantity: newQuantity }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get transactions for a material
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { materialId: parseInt(id) },
      include: {
        batchEvent: {
          select: { batchNo: true, productName: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
