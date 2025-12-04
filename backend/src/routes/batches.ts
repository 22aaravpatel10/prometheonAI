import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireWriteAccess, requireReadAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const batchEventSchema = Joi.object({
  equipmentId: Joi.number().integer().positive().required(),
  batchNo: Joi.string().required(),
  productName: Joi.string().required(),
  batchSize: Joi.number().positive().optional(),
  startTimestamp: Joi.date().iso().required(),
  endTimestamp: Joi.date().iso().required(),
  actualStart: Joi.date().iso().optional().allow(null),
  actualEnd: Joi.date().iso().optional().allow(null),
  inputs: Joi.object().optional()
}).custom((value, helpers) => {
  if (new Date(value.endTimestamp) <= new Date(value.startTimestamp)) {
    return helpers.error('any.invalid', { message: 'End time must be after start time' });
  }

  if (value.actualStart && value.actualEnd && new Date(value.actualEnd) <= new Date(value.actualStart)) {
    return helpers.error('any.invalid', { message: 'Actual end time must be after actual start time' });
  }

  return value;
});

// Check for equipment conflicts
const checkEquipmentConflict = async (equipmentId: number, startTime: Date, endTime: Date, excludeId?: number) => {
  const conflictingEvents = await prisma.batchEvent.findMany({
    where: {
      equipmentId,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        {
          AND: [
            { startTimestamp: { lte: startTime } },
            { endTimestamp: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startTimestamp: { lt: endTime } },
            { endTimestamp: { gte: endTime } }
          ]
        },
        {
          AND: [
            { startTimestamp: { gte: startTime } },
            { endTimestamp: { lte: endTime } }
          ]
        }
      ]
    },
    include: {
      equipment: { select: { name: true } }
    }
  });

  return conflictingEvents;
};

// GET /batches - Get all batch events
router.get('/', authenticateToken, requireReadAccess, async (req: AuthRequest, res) => {
  try {
    const { equipmentId, startDate, endDate } = req.query;

    const where: any = {};

    if (equipmentId) {
      where.equipmentId = parseInt(equipmentId as string);
    }

    if (startDate || endDate) {
      where.OR = [
        {
          startTimestamp: {
            ...(startDate && { gte: new Date(startDate as string) }),
            ...(endDate && { lte: new Date(endDate as string) })
          }
        },
        {
          endTimestamp: {
            ...(startDate && { gte: new Date(startDate as string) }),
            ...(endDate && { lte: new Date(endDate as string) })
          }
        }
      ];
    }

    const batchEvents = await prisma.batchEvent.findMany({
      where,
      include: {
        equipment: { select: { id: true, name: true } }
      },
      orderBy: { startTimestamp: 'asc' }
    });

    res.json(batchEvents);
  } catch (error) {
    console.error('Error fetching batch events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /batches/:id - Get specific batch event
router.get('/:id', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const batchEvent = await prisma.batchEvent.findUnique({
      where: { id },
      include: {
        equipment: { select: { id: true, name: true } }
      }
    });

    if (!batchEvent) {
      return res.status(404).json({ error: 'Batch event not found' });
    }

    res.json(batchEvent);
  } catch (error) {
    console.error('Error fetching batch event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /batches - Create batch event
router.post('/', authenticateToken, requireWriteAccess, async (req: AuthRequest, res) => {
  try {
    const { error, value } = batchEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { equipmentId, startTimestamp, endTimestamp } = value;

    // Check for conflicts
    const conflicts = await checkEquipmentConflict(
      equipmentId,
      new Date(startTimestamp),
      new Date(endTimestamp)
    );

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Equipment conflict detected',
        message: `Equipment "${conflicts[0].equipment.name}" is already scheduled during this time period`,
        conflicts: conflicts.map(c => ({
          id: c.id,
          batchNo: c.batchNo,
          productName: c.productName,
          startTimestamp: c.startTimestamp,
          endTimestamp: c.endTimestamp
        }))
      });
    }

    const batchEvent = await prisma.batchEvent.create({
      data: value,
      include: {
        equipment: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(batchEvent);
  } catch (error) {
    console.error('Error creating batch event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /batches/:id - Update batch event
router.put('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error, value } = batchEventSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { equipmentId, startTimestamp, endTimestamp } = value;

    // Check for conflicts (excluding current event)
    const conflicts = await checkEquipmentConflict(
      equipmentId,
      new Date(startTimestamp),
      new Date(endTimestamp),
      id
    );

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Equipment conflict detected',
        message: `Equipment is already scheduled during this time period`,
        conflicts: conflicts.map(c => ({
          id: c.id,
          batchNo: c.batchNo,
          productName: c.productName,
          startTimestamp: c.startTimestamp,
          endTimestamp: c.endTimestamp
        }))
      });
    }

    const batchEvent = await prisma.batchEvent.update({
      where: { id },
      data: value,
      include: {
        equipment: { select: { id: true, name: true } }
      }
    });

    res.json(batchEvent);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Batch event not found' });
    }
    console.error('Error updating batch event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /batches/:id - Delete batch event
router.delete('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.batchEvent.delete({
      where: { id }
    });

    res.json({ message: 'Batch event deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Batch event not found' });
    }
    console.error('Error deleting batch event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import { schedulingService } from '../services/schedulingService';

// ... existing imports ...

// Schedule a batch from a recipe
router.post('/schedule', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { recipeId, equipmentId, startTime, batchSize } = req.body;

    if (!recipeId || !equipmentId || !startTime || !batchSize) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const batch = await schedulingService.scheduleBatchFromRecipe(
      Number(recipeId),
      Number(equipmentId),
      new Date(startTime),
      Number(batchSize)
    );

    res.status(201).json(batch);
  } catch (error: any) {
    console.error('Error scheduling batch:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;