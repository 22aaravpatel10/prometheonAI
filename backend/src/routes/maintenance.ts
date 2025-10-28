import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireWriteAccess, requireReadAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const maintenanceEventSchema = Joi.object({
  equipmentId: Joi.number().integer().positive().required(),
  reason: Joi.string().valid('scheduled', 'breakdown', 'preventive', 'cleaning', 'upgrade').required(),
  expectedDuration: Joi.string().optional(),
  supervisorName: Joi.string().optional(),
  spareParts: Joi.object().optional(),
  changesMade: Joi.string().optional(),
  startTimestamp: Joi.date().iso().required(),
  endTimestamp: Joi.date().iso().required(),
  actualStart: Joi.date().iso().optional().allow(null),
  actualEnd: Joi.date().iso().optional().allow(null)
}).custom((value, helpers) => {
  if (new Date(value.endTimestamp) <= new Date(value.startTimestamp)) {
    return helpers.error('any.invalid', { message: 'End time must be after start time' });
  }
  
  if (value.actualStart && value.actualEnd && new Date(value.actualEnd) <= new Date(value.actualStart)) {
    return helpers.error('any.invalid', { message: 'Actual end time must be after actual start time' });
  }
  
  return value;
});

// GET /maintenance - Get all maintenance events
router.get('/', authenticateToken, requireReadAccess, async (req: AuthRequest, res) => {
  try {
    const { equipmentId, startDate, endDate, reason } = req.query;
    
    const where: any = {};
    
    if (equipmentId) {
      where.equipmentId = parseInt(equipmentId as string);
    }
    
    if (reason) {
      where.reason = reason;
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

    const maintenanceEvents = await prisma.maintenanceEvent.findMany({
      where,
      include: {
        equipment: { select: { id: true, name: true } }
      },
      orderBy: { startTimestamp: 'asc' }
    });

    res.json(maintenanceEvents);
  } catch (error) {
    console.error('Error fetching maintenance events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /maintenance/:id - Get specific maintenance event
router.get('/:id', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const maintenanceEvent = await prisma.maintenanceEvent.findUnique({
      where: { id },
      include: {
        equipment: { select: { id: true, name: true } }
      }
    });

    if (!maintenanceEvent) {
      return res.status(404).json({ error: 'Maintenance event not found' });
    }

    res.json(maintenanceEvent);
  } catch (error) {
    console.error('Error fetching maintenance event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /maintenance - Create maintenance event
router.post('/', authenticateToken, requireWriteAccess, async (req: AuthRequest, res) => {
  try {
    const { error, value } = maintenanceEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const maintenanceEvent = await prisma.maintenanceEvent.create({
      data: value,
      include: {
        equipment: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(maintenanceEvent);
  } catch (error) {
    console.error('Error creating maintenance event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /maintenance/:id - Update maintenance event
router.put('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error, value } = maintenanceEventSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const maintenanceEvent = await prisma.maintenanceEvent.update({
      where: { id },
      data: value,
      include: {
        equipment: { select: { id: true, name: true } }
      }
    });

    res.json(maintenanceEvent);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance event not found' });
    }
    console.error('Error updating maintenance event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /maintenance/:id - Delete maintenance event
router.delete('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.maintenanceEvent.delete({
      where: { id }
    });

    res.json({ message: 'Maintenance event deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance event not found' });
    }
    console.error('Error deleting maintenance event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;