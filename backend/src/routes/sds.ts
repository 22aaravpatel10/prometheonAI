import express from 'express';
import Joi from 'joi';
import { PrismaClient, HazardClassification, SDSStatus } from '@prisma/client';
import { authenticateToken, requireWriteAccess, requireReadAccess, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for SDS file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/sds');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Validation schemas
const sdsSchema = Joi.object({
  materialId: Joi.number().optional().allow(null),
  chemicalName: Joi.string().required(),
  casNumber: Joi.string().optional().allow('', null),
  manufacturer: Joi.string().optional().allow('', null),
  productCode: Joi.string().optional().allow('', null),
  version: Joi.string().default('1.0'),
  revisionDate: Joi.date().required(),
  expirationDate: Joi.date().optional().allow(null),
  status: Joi.string().valid('current', 'expiring_soon', 'expired', 'under_review').default('current'),
  hazardClassifications: Joi.array().items(
    Joi.string().valid(
      'flammable', 'corrosive', 'toxic', 'irritant', 'oxidizer', 'explosive',
      'compressed_gas', 'carcinogenic', 'mutagenic', 'reproductive_toxin',
      'environmental_hazard', 'acute_toxicity', 'health_hazard'
    )
  ).optional(),
  signalWord: Joi.string().optional().allow('', null),
  hazardStatements: Joi.string().optional().allow('', null),
  precautionaryStatements: Joi.string().optional().allow('', null),
  ppeRequirements: Joi.string().optional().allow('', null),
  emergencyProcedures: Joi.string().optional().allow('', null),
  firstAidMeasures: Joi.string().optional().allow('', null),
  fireFightingMeasures: Joi.string().optional().allow('', null),
  spillHandling: Joi.string().optional().allow('', null),
  storageConditions: Joi.string().optional().allow('', null),
  handlingPrecautions: Joi.string().optional().allow('', null),
  incompatibleMaterials: Joi.string().optional().allow('', null),
  physicalState: Joi.string().optional().allow('', null),
  color: Joi.string().optional().allow('', null),
  odor: Joi.string().optional().allow('', null),
  pH: Joi.number().optional().allow(null),
  flashPoint: Joi.number().optional().allow(null),
  flashPointUnit: Joi.string().optional().allow('', null),
  notes: Joi.string().optional().allow('', null)
});

// GET /sds - Get all SDS documents
router.get('/', authenticateToken, requireReadAccess, async (req: AuthRequest, res) => {
  try {
    const { materialId, status, search } = req.query;

    const where: any = {};

    if (materialId) {
      where.materialId = parseInt(materialId as string);
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { chemicalName: { contains: search as string, mode: 'insensitive' } },
        { casNumber: { contains: search as string, mode: 'insensitive' } },
        { manufacturer: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const sdsList = await prisma.safetyDataSheet.findMany({
      where,
      include: {
        material: {
          select: { id: true, name: true, materialId: true }
        },
        uploadedBy: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sdsList);
  } catch (error) {
    console.error('Error fetching SDS documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sds/:id - Get specific SDS
router.get('/:id', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const sds = await prisma.safetyDataSheet.findUnique({
      where: { id },
      include: {
        material: {
          select: { id: true, name: true, materialId: true, casNumber: true }
        },
        uploadedBy: {
          select: { id: true, email: true }
        },
        recipeStepLinks: {
          include: {
            recipeStep: {
              include: {
                recipe: {
                  select: { id: true, name: true, product: true }
                }
              }
            }
          }
        }
      }
    });

    if (!sds) {
      return res.status(404).json({ error: 'SDS not found' });
    }

    res.json(sds);
  } catch (error) {
    console.error('Error fetching SDS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sds/:id/download - Download SDS file
router.get('/:id/download', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const sds = await prisma.safetyDataSheet.findUnique({
      where: { id }
    });

    if (!sds) {
      return res.status(404).json({ error: 'SDS not found' });
    }

    const filePath = path.join(__dirname, '../../', sds.filePath);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'SDS file not found on server' });
    }

    res.download(filePath, sds.fileName);
  } catch (error) {
    console.error('Error downloading SDS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sds - Upload and create new SDS
router.post('/', authenticateToken, requireWriteAccess, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the JSON data from the request body
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

    const { error, value } = sdsSchema.validate(data);
    if (error) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: error.details[0].message });
    }

    // Create SDS record
    const sds = await prisma.safetyDataSheet.create({
      data: {
        ...value,
        fileName: req.file.originalname,
        filePath: `uploads/sds/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedByUserId: req.user!.id,
        revisionDate: new Date(value.revisionDate),
        expirationDate: value.expirationDate ? new Date(value.expirationDate) : null
      },
      include: {
        material: {
          select: { id: true, name: true, materialId: true }
        },
        uploadedBy: {
          select: { id: true, email: true }
        }
      }
    });

    res.status(201).json(sds);
  } catch (error: any) {
    console.error('Error creating SDS:', error);
    // Clean up uploaded file in case of error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /sds/:id - Update SDS metadata (not the file)
router.put('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error, value } = sdsSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const sds = await prisma.safetyDataSheet.update({
      where: { id },
      data: {
        ...value,
        revisionDate: value.revisionDate ? new Date(value.revisionDate) : undefined,
        expirationDate: value.expirationDate ? new Date(value.expirationDate) : null
      },
      include: {
        material: {
          select: { id: true, name: true, materialId: true }
        },
        uploadedBy: {
          select: { id: true, email: true }
        }
      }
    });

    res.json(sds);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'SDS not found' });
    }
    console.error('Error updating SDS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /sds/:id - Delete SDS
router.delete('/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const sds = await prisma.safetyDataSheet.findUnique({
      where: { id }
    });

    if (!sds) {
      return res.status(404).json({ error: 'SDS not found' });
    }

    // Delete the file
    const filePath = path.join(__dirname, '../../', sds.filePath);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.safetyDataSheet.delete({
      where: { id }
    });

    res.json({ message: 'SDS deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'SDS not found' });
    }
    console.error('Error deleting SDS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sds/:id/link-to-recipe-step - Link SDS to a recipe step
router.post('/:id/link-to-recipe-step', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const sdsId = parseInt(req.params.id);
    const { recipeStepId, notes } = req.body;

    if (!recipeStepId) {
      return res.status(400).json({ error: 'recipeStepId is required' });
    }

    // Check if SDS exists
    const sds = await prisma.safetyDataSheet.findUnique({
      where: { id: sdsId }
    });

    if (!sds) {
      return res.status(404).json({ error: 'SDS not found' });
    }

    // Check if recipe step exists
    const recipeStep = await prisma.recipeStep.findUnique({
      where: { id: recipeStepId }
    });

    if (!recipeStep) {
      return res.status(404).json({ error: 'Recipe step not found' });
    }

    // Create or update link
    const link = await prisma.recipeStepSDS.upsert({
      where: {
        recipeStepId_sdsId: {
          recipeStepId,
          sdsId
        }
      },
      create: {
        recipeStepId,
        sdsId,
        notes
      },
      update: {
        notes
      }
    });

    res.json(link);
  } catch (error) {
    console.error('Error linking SDS to recipe step:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /sds/:id/unlink-from-recipe-step/:recipeStepId - Unlink SDS from recipe step
router.delete('/:id/unlink-from-recipe-step/:recipeStepId', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const sdsId = parseInt(req.params.id);
    const recipeStepId = parseInt(req.params.recipeStepId);

    await prisma.recipeStepSDS.delete({
      where: {
        recipeStepId_sdsId: {
          recipeStepId,
          sdsId
        }
      }
    });

    res.json({ message: 'SDS unlinked from recipe step successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Link not found' });
    }
    console.error('Error unlinking SDS from recipe step:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sds/recipe-step/:recipeStepId - Get all SDS documents linked to a recipe step
router.get('/recipe-step/:recipeStepId', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const recipeStepId = parseInt(req.params.recipeStepId);

    const links = await prisma.recipeStepSDS.findMany({
      where: { recipeStepId },
      include: {
        sds: {
          include: {
            material: {
              select: { id: true, name: true, materialId: true }
            }
          }
        }
      }
    });

    res.json(links);
  } catch (error) {
    console.error('Error fetching SDS for recipe step:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sds/expiring - Get expiring SDS documents
router.get('/status/expiring', authenticateToken, requireReadAccess, async (req, res) => {
  try {
    const daysThreshold = parseInt(req.query.days as string) || 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringSDS = await prisma.safetyDataSheet.findMany({
      where: {
        AND: [
          {
            expirationDate: {
              not: null,
              lte: thresholdDate
            }
          },
          {
            expirationDate: {
              gte: new Date()
            }
          }
        ]
      },
      include: {
        material: {
          select: { id: true, name: true, materialId: true }
        }
      },
      orderBy: { expirationDate: 'asc' }
    });

    res.json(expiringSDS);
  } catch (error) {
    console.error('Error fetching expiring SDS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
