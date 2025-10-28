import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireWriteAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const emailNotificationSchema = Joi.object({
  userIds: Joi.array().items(Joi.number().integer().positive()).required(),
  subject: Joi.string().required(),
  message: Joi.string().required(),
  batchEventId: Joi.number().integer().positive().optional(),
  maintenanceEventId: Joi.number().integer().positive().optional(),
  type: Joi.string().valid('batch_reminder', 'maintenance_reminder', 'batch_complete', 'maintenance_complete').required()
}).custom((value, helpers) => {
  // Ensure either batchEventId or maintenanceEventId is provided, but not both
  const hasBatch = !!value.batchEventId;
  const hasMaintenance = !!value.maintenanceEventId;
  
  if (hasBatch && hasMaintenance) {
    return helpers.error('any.invalid', { message: 'Cannot specify both batchEventId and maintenanceEventId' });
  }
  
  if (!hasBatch && !hasMaintenance) {
    return helpers.error('any.invalid', { message: 'Must specify either batchEventId or maintenanceEventId' });
  }
  
  return value;
});

// POST /notifications/email - Send email notifications
router.post('/email', authenticateToken, requireWriteAccess, async (req: AuthRequest, res) => {
  try {
    const { error, value } = emailNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { userIds, subject, message, batchEventId, maintenanceEventId, type } = value;

    // Verify that the specified event exists
    if (batchEventId) {
      const batchEvent = await prisma.batchEvent.findUnique({
        where: { id: batchEventId },
        include: { equipment: true }
      });
      
      if (!batchEvent) {
        return res.status(404).json({ error: 'Batch event not found' });
      }
    }

    if (maintenanceEventId) {
      const maintenanceEvent = await prisma.maintenanceEvent.findUnique({
        where: { id: maintenanceEventId },
        include: { equipment: true }
      });
      
      if (!maintenanceEvent) {
        return res.status(404).json({ error: 'Maintenance event not found' });
      }
    }

    // Verify that all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    });

    if (users.length !== userIds.length) {
      const foundUserIds = users.map(u => u.id);
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      return res.status(404).json({ 
        error: 'Some users not found',
        missingUserIds 
      });
    }

    // Create notification records
    const notifications = await Promise.all(
      userIds.map(userId => 
        prisma.notification.create({
          data: {
            userId,
            batchEventId,
            maintenanceEventId,
            type,
            message,
            sentTimestamp: new Date()
          },
          include: {
            user: { select: { email: true } },
            batchEvent: { 
              select: { 
                batchNo: true, 
                productName: true, 
                equipment: { select: { name: true } } 
              } 
            },
            maintenanceEvent: { 
              select: { 
                reason: true, 
                equipment: { select: { name: true } } 
              } 
            }
          }
        })
      )
    );

    // TODO: Implement actual email sending here
    // For now, we'll just log the email details
    console.log('Email notifications to be sent:', {
      subject,
      message,
      recipients: users.map(u => u.email),
      type
    });

    res.status(201).json({
      message: 'Email notifications queued successfully',
      notifications: notifications.map(n => ({
        id: n.id,
        userEmail: n.user.email,
        type: n.type,
        sentTimestamp: n.sentTimestamp
      }))
    });
  } catch (error) {
    console.error('Error sending email notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /notifications - Get notifications for current user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      include: {
        batchEvent: {
          select: {
            id: true,
            batchNo: true,
            productName: true,
            startTimestamp: true,
            equipment: { select: { name: true } }
          }
        },
        maintenanceEvent: {
          select: {
            id: true,
            reason: true,
            startTimestamp: true,
            equipment: { select: { name: true } }
          }
        }
      },
      orderBy: { sentTimestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;