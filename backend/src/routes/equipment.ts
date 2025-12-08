import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireWriteAccess, requireReadAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const equipmentSchema = Joi.object({
  name: Joi.string().required(),
  equipmentId: Joi.string().allow('', null).optional(),
  location: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('available', 'in_use', 'maintenance', 'offline').default('available'),
  size: Joi.number().allow(null).optional(),
  sizeUnit: Joi.string().allow('', null).optional(),
  capacity: Joi.number().allow(null).optional(),
  capacityUnit: Joi.string().allow('', null).optional(),
  materialOfConstruction: Joi.string().allow('', null).optional(),
  isCustom: Joi.boolean().default(true)
});

// GET /equipment - Get all equipment
router.get('/', authenticateToken, requireReadAccess, async (req: AuthRequest, res) => {
  try {
    const equipment = await prisma.equipment.findMany({
      include: {
        createdBy: {
          select: { id: true, email: true }
        },
        _count: {
          select: {
            batchEvents: true,
            maintenanceEvents: true
          }
        },
        linkedTanks: true
      },
      orderBy: [
        { isCustom: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /equipment/:id - Get specific equipment
router.get('/:id', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true }
        },
        batchEvents: {
          orderBy: { startTimestamp: 'desc' },
          take: 10
        },
        maintenanceEvents: {
          orderBy: { startTimestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /equipment - Create equipment
router.post('/', authenticateToken, requireWriteAccess, async (req: AuthRequest, res) => {
  try {
    const { error, value } = equipmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if equipment name already exists
    const existingEquipment = await prisma.equipment.findFirst({
      where: { name: value.name }
    });

    if (existingEquipment) {
      return res.status(400).json({ error: 'Equipment with this name already exists' });
    }

    const equipment = await prisma.equipment.create({
      data: {
        ...value,
        createdByUserId: req.user!.id
      },
      include: {
        createdBy: {
          select: { id: true, email: true }
        }
      }
    });

    res.status(201).json(equipment);
  } catch (error) {
    console.error('Error creating equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /equipment/:id - Update equipment
router.put('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error, value } = equipmentSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if another equipment with the same name exists
    const existingEquipment = await prisma.equipment.findFirst({
      where: {
        name: value.name,
        id: { not: id }
      }
    });

    if (existingEquipment) {
      return res.status(400).json({ error: 'Equipment with this name already exists' });
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: value,
      include: {
        createdBy: {
          select: { id: true, email: true }
        }
      }
    });

    res.json(equipment);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /equipment/:id - Delete equipment
router.delete('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if equipment has associated events
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            batchEvents: true,
            maintenanceEvents: true
          }
        }
      }
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    if (equipment._count.batchEvents > 0 || equipment._count.maintenanceEvents > 0) {
      return res.status(400).json({
        error: 'Cannot delete equipment with associated events',
        message: `This equipment has ${equipment._count.batchEvents} batch events and ${equipment._count.maintenanceEvents} maintenance events`
      });
    }

    await prisma.equipment.delete({
      where: { id }
    });

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;