import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import SDSUploadModal from '../components/SDSUploadModal';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface SDS {
  id: number;
  chemicalName: string;
  casNumber?: string;
  manufacturer?: string;
  productCode?: string;
  version: string;
  revisionDate: string;
  expirationDate?: string;
  status: 'current' | 'expiring_soon' | 'expired' | 'under_review';
  fileName: string;
  fileSize: number;
  hazardClassifications: string[];
  material?: {
    id: number;
    name: string;
    materialId?: string;
  };
  uploadedBy?: {
    id: number;
    email: string;
  };
  createdAt: string;
}

const SafetyDataSheets: React.FC = () => {
  const { user } = useAuth();
  const [sdsList, setSdsList] = useState<SDS[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchSDS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchSDS = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get('/sds', { params });
      setSdsList(response.data);
    } catch (error) {
      console.error('Error fetching SDS:', error);
      toast.error('Failed to load SDS documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchSDS();
  };

  const handleDownload = async (sds: SDS) => {
    try {
      const response = await axios.get(`/sds/${sds.id}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', sds.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('SDS downloaded successfully');
    } catch (error) {
      console.error('Error downloading SDS:', error);
      toast.error('Failed to download SDS');
    }
  };

  const handleDelete = async (sds: SDS) => {
    if (!window.confirm(`Are you sure you want to delete the SDS for "${sds.chemicalName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/sds/${sds.id}`);
      setSdsList(prev => prev.filter(item => item.id !== sds.id));
      toast.success('SDS deleted successfully');
    } catch (error: any) {
      console.error('Error deleting SDS:', error);
      const message = error.response?.data?.error || 'Failed to delete SDS';
      toast.error(message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      current: 'bg-green-100 text-green-800',
      expiring_soon: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      under_review: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      current: 'Current',
      expiring_soon: 'Expiring Soon',
      expired: 'Expired',
      under_review: 'Under Review'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getHazardBadge = (hazard: string) => {
    const colors: any = {
      flammable: 'bg-orange-100 text-orange-800',
      corrosive: 'bg-purple-100 text-purple-800',
      toxic: 'bg-red-100 text-red-800',
      carcinogenic: 'bg-red-100 text-red-800',
      explosive: 'bg-red-100 text-red-800'
    };
    const defaultColor = 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[hazard] || defaultColor}`}>
        {hazard.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canEdit = user?.role !== 'viewer';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Safety Data Sheets</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage chemical safety documentation and hazard information
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Upload SDS
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by chemical name, CAS number, or manufacturer..."
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="current">Current</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* SDS List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sdsList.map((sds) => (
              <li key={sds.id} className="hover:bg-gray-50">
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {sds.chemicalName}
                          </h3>
                          {sds.casNumber && (
                            <p className="text-sm text-gray-500">CAS: {sds.casNumber}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {getStatusBadge(sds.status)}
                        {sds.status === 'expired' && (
                          <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            Action Required
                          </span>
                        )}
                        {sds.material && (
                          <span className="text-xs text-gray-500">
                            Material: {sds.material.name}
                          </span>
                        )}
                      </div>

                      {sds.hazardClassifications && sds.hazardClassifications.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sds.hazardClassifications.slice(0, 5).map((hazard, idx) => (
                            <span key={idx}>{getHazardBadge(hazard)}</span>
                          ))}
                          {sds.hazardClassifications.length > 5 && (
                            <span className="text-xs text-gray-500">
                              +{sds.hazardClassifications.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {sds.manufacturer && <p>Manufacturer: {sds.manufacturer}</p>}
                        <p>Version: {sds.version} | Revision: {new Date(sds.revisionDate).toLocaleDateString()}</p>
                        {sds.expirationDate && (
                          <p>Expires: {new Date(sds.expirationDate).toLocaleDateString()}</p>
                        )}
                        <p>File: {sds.fileName} ({formatFileSize(sds.fileSize)})</p>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleDownload(sds)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="Download SDS"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sds)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Delete SDS"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {sdsList.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No SDS documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter
                  ? 'No SDS documents match your search criteria.'
                  : 'Get started by uploading a Safety Data Sheet.'}
              </p>
              {canEdit && !searchTerm && !statusFilter && (
                <div className="mt-6">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Upload SDS
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <SDSUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchSDS}
      />
    </Layout>
  );
};

export default SafetyDataSheets;
