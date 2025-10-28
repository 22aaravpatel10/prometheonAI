import express from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { authenticateToken, requireWriteAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const materialSchema = Joi.object({
  materialId: Joi.string().optional(),
  name: Joi.string().required(),
  currentQuantity: Joi.number().required(),
  unit: Joi.string().required(),
  minimumStock: Joi.number().required(),
  supplier: Joi.string().optional().allow(''),
  costPerUnit: Joi.number().optional()
});

const transactionSchema = Joi.object({
  materialId: Joi.number().required(),
  batchEventId: Joi.number().optional(),
  transactionType: Joi.string().valid('consumed', 'received', 'adjusted').required(),
  quantity: Joi.number().required(),
  notes: Joi.string().optional().allow('')
});

// Get all materials
router.get('/', authenticateToken, async (req, res) => {
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
        costPerUnit: value.costPerUnit
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
        costPerUnit: value.costPerUnit
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
