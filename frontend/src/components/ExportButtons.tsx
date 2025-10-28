import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';
import { DocumentArrowDownIcon, TableCellsIcon } from '@heroicons/react/24/outline';

interface ExportButtonsProps {
  startDate?: string;
  endDate?: string;
  equipmentId?: number;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ startDate, endDate, equipmentId }) => {
  const handleExcelExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (equipmentId) params.append('equipmentId', equipmentId.toString());

      const response = await axios.get(`/export/events.xlsx?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `batch_events_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    }
  };

  const handlePDFExport = async () => {
    try {
      // Get the calendar container
      const calendarElement = document.querySelector('.fc');
      
      if (!calendarElement) {
        toast.error('Calendar not found for PDF export');
        return;
      }

      toast.loading('Generating PDF...', { id: 'pdf-export' });

      // Configure PDF options
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `batch_schedule_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      // Generate PDF
      await html2pdf().set(opt).from(calendarElement as HTMLElement).save();
      
      toast.success('PDF exported successfully', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export to PDF', { id: 'pdf-export' });
    }
  };

  const handleSummaryExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(`/export/summary.xlsx?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `batch_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Summary exported successfully');
    } catch (error) {
      console.error('Error exporting summary:', error);
      toast.error('Failed to export summary');
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePDFExport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Export current view to PDF"
      >
        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
        Export PDF
      </button>
      
      <button
        onClick={handleExcelExport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Export detailed events to Excel"
      >
        <TableCellsIcon className="h-4 w-4 mr-2" />
        Export Excel
      </button>
      
      <button
        onClick={handleSummaryExport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Export equipment summary to Excel"
      >
        <TableCellsIcon className="h-4 w-4 mr-2" />
        Summary Report
      </button>
    </div>
  );
};

export default ExportButtons;