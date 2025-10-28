import express from 'express';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireReadAccess, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /export.xlsx - Export events to Excel
router.get('/events.xlsx', authenticateToken, requireReadAccess, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, equipmentId } = req.query;
    
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

    // Fetch batch events and maintenance events
    const [batchEvents, maintenanceEvents] = await Promise.all([
      prisma.batchEvent.findMany({
        where,
        include: {
          equipment: { select: { name: true } }
        },
        orderBy: { startTimestamp: 'asc' }
      }),
      prisma.maintenanceEvent.findMany({
        where,
        include: {
          equipment: { select: { name: true } }
        },
        orderBy: { startTimestamp: 'asc' }
      })
    ]);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Batch Events sheet
    const batchSheet = workbook.addWorksheet('Batch Events');
    batchSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Equipment', key: 'equipment', width: 20 },
      { header: 'Batch No', key: 'batchNo', width: 15 },
      { header: 'Product Name', key: 'productName', width: 25 },
      { header: 'Batch Size', key: 'batchSize', width: 15 },
      { header: 'Planned Start', key: 'startTimestamp', width: 20 },
      { header: 'Planned End', key: 'endTimestamp', width: 20 },
      { header: 'Actual Start', key: 'actualStart', width: 20 },
      { header: 'Actual End', key: 'actualEnd', width: 20 },
      { header: 'Inputs', key: 'inputs', width: 30 }
    ];

    batchEvents.forEach(event => {
      batchSheet.addRow({
        id: event.id,
        equipment: event.equipment.name,
        batchNo: event.batchNo,
        productName: event.productName,
        batchSize: event.batchSize?.toString(),
        startTimestamp: event.startTimestamp,
        endTimestamp: event.endTimestamp,
        actualStart: event.actualStart,
        actualEnd: event.actualEnd,
        inputs: event.inputs ? JSON.stringify(event.inputs) : ''
      });
    });

    // Maintenance Events sheet
    const maintenanceSheet = workbook.addWorksheet('Maintenance Events');
    maintenanceSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Equipment', key: 'equipment', width: 20 },
      { header: 'Reason', key: 'reason', width: 15 },
      { header: 'Expected Duration', key: 'expectedDuration', width: 20 },
      { header: 'Supervisor', key: 'supervisorName', width: 20 },
      { header: 'Planned Start', key: 'startTimestamp', width: 20 },
      { header: 'Planned End', key: 'endTimestamp', width: 20 },
      { header: 'Actual Start', key: 'actualStart', width: 20 },
      { header: 'Actual End', key: 'actualEnd', width: 20 },
      { header: 'Spare Parts', key: 'spareParts', width: 30 },
      { header: 'Changes Made', key: 'changesMade', width: 40 }
    ];

    maintenanceEvents.forEach(event => {
      maintenanceSheet.addRow({
        id: event.id,
        equipment: event.equipment.name,
        reason: event.reason,
        expectedDuration: event.expectedDuration,
        supervisorName: event.supervisorName,
        startTimestamp: event.startTimestamp,
        endTimestamp: event.endTimestamp,
        actualStart: event.actualStart,
        actualEnd: event.actualEnd,
        spareParts: event.spareParts ? JSON.stringify(event.spareParts) : '',
        changesMade: event.changesMade
      });
    });

    // Style headers
    [batchSheet, maintenanceSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Set response headers
    const filename = `batch_processing_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /export/summary.xlsx - Export summary report
router.get('/summary.xlsx', authenticateToken, requireReadAccess, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.startTimestamp = {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) })
      };
    }

    // Fetch summary data
    const [equipment, batchStats, maintenanceStats] = await Promise.all([
      prisma.equipment.findMany({
        include: {
          _count: {
            select: {
              batchEvents: true,
              maintenanceEvents: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.batchEvent.groupBy({
        by: ['equipmentId'],
        where: dateFilter,
        _count: { id: true },
        _avg: { batchSize: true }
      }),
      prisma.maintenanceEvent.groupBy({
        by: ['equipmentId', 'reason'],
        where: dateFilter,
        _count: { id: true }
      })
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Equipment summary sheet
    const summarySheet = workbook.addWorksheet('Equipment Summary');
    summarySheet.columns = [
      { header: 'Equipment Name', key: 'name', width: 25 },
      { header: 'Total Batch Events', key: 'batchCount', width: 20 },
      { header: 'Total Maintenance Events', key: 'maintenanceCount', width: 25 },
      { header: 'Average Batch Size', key: 'avgBatchSize', width: 20 },
      { header: 'Equipment Type', key: 'type', width: 15 }
    ];

    equipment.forEach(eq => {
      const batchStat = batchStats.find(stat => stat.equipmentId === eq.id);
      
      summarySheet.addRow({
        name: eq.name,
        batchCount: eq._count.batchEvents,
        maintenanceCount: eq._count.maintenanceEvents,
        avgBatchSize: batchStat?._avg.batchSize?.toString() || '0',
        type: eq.isCustom ? 'Custom' : 'Standard'
      });
    });

    // Style header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    const filename = `batch_processing_summary_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;