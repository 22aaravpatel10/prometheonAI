import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface Material {
  id: number;
  name: string;
  materialId?: string;
  casNumber?: string;
}

interface SDSUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const hazardOptions = [
  { value: 'flammable', label: 'Flammable' },
  { value: 'corrosive', label: 'Corrosive' },
  { value: 'toxic', label: 'Toxic' },
  { value: 'irritant', label: 'Irritant' },
  { value: 'oxidizer', label: 'Oxidizer' },
  { value: 'explosive', label: 'Explosive' },
  { value: 'compressed_gas', label: 'Compressed Gas' },
  { value: 'carcinogenic', label: 'Carcinogenic' },
  { value: 'mutagenic', label: 'Mutagenic' },
  { value: 'reproductive_toxin', label: 'Reproductive Toxin' },
  { value: 'environmental_hazard', label: 'Environmental Hazard' },
  { value: 'acute_toxicity', label: 'Acute Toxicity' },
  { value: 'health_hazard', label: 'Health Hazard' }
];

const SDSUploadModal: React.FC<SDSUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    materialId: '',
    chemicalName: '',
    casNumber: '',
    manufacturer: '',
    productCode: '',
    version: '1.0',
    revisionDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    status: 'current',
    hazardClassifications: [] as string[],
    signalWord: '',
    hazardStatements: '',
    precautionaryStatements: '',
    ppeRequirements: '',
    emergencyProcedures: '',
    firstAidMeasures: '',
    fireFightingMeasures: '',
    spillHandling: '',
    storageConditions: '',
    handlingPrecautions: '',
    incompatibleMaterials: '',
    physicalState: '',
    color: '',
    odor: '',
    pH: '',
    flashPoint: '',
    flashPointUnit: 'C',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen]);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get('/materials');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleHazardToggle = (hazard: string) => {
    setFormData(prev => ({
      ...prev,
      hazardClassifications: prev.hazardClassifications.includes(hazard)
        ? prev.hazardClassifications.filter(h => h !== hazard)
        : [...prev.hazardClassifications, hazard]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    if (!formData.chemicalName) {
      toast.error('Chemical name is required');
      return;
    }

    if (!formData.revisionDate) {
      toast.error('Revision date is required');
      return;
    }

    setUploading(true);

    try {
      const submitData = new FormData();
      submitData.append('file', file);

      // Prepare data object
      const data = {
        ...formData,
        materialId: formData.materialId ? parseInt(formData.materialId) : null,
        pH: formData.pH ? parseFloat(formData.pH) : null,
        flashPoint: formData.flashPoint ? parseFloat(formData.flashPoint) : null,
        expirationDate: formData.expirationDate || null
      };

      submitData.append('data', JSON.stringify(data));

      await axios.post('/sds', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('SDS uploaded successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error uploading SDS:', error);
      const message = error.response?.data?.error || 'Failed to upload SDS';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFormData({
      materialId: '',
      chemicalName: '',
      casNumber: '',
      manufacturer: '',
      productCode: '',
      version: '1.0',
      revisionDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      status: 'current',
      hazardClassifications: [],
      signalWord: '',
      hazardStatements: '',
      precautionaryStatements: '',
      ppeRequirements: '',
      emergencyProcedures: '',
      firstAidMeasures: '',
      fireFightingMeasures: '',
      spillHandling: '',
      storageConditions: '',
      handlingPrecautions: '',
      incompatibleMaterials: '',
      physicalState: '',
      color: '',
      odor: '',
      pH: '',
      flashPoint: '',
      flashPointUnit: 'C',
      notes: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content max-h-[90vh] overflow-y-auto" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Upload Safety Data Sheet</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF File <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="sr-only"
                      disabled={uploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
                {file && (
                  <p className="text-sm text-green-600 font-medium">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chemical Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.chemicalName}
                  onChange={(e) => setFormData(prev => ({ ...prev, chemicalName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CAS Number
                </label>
                <input
                  type="text"
                  value={formData.casNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, casNumber: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 64-17-5"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Material (Optional)
                </label>
                <select
                  value={formData.materialId}
                  onChange={(e) => setFormData(prev => ({ ...prev, materialId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                >
                  <option value="">No material linked</option>
                  {materials.map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} {material.casNumber ? `(CAS: ${material.casNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Code
                </label>
                <input
                  type="text"
                  value={formData.productCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revision Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.revisionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, revisionDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                >
                  <option value="current">Current</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hazard Classifications */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hazard Classifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {hazardOptions.map(hazard => (
                <label key={hazard.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hazardClassifications.includes(hazard.value)}
                    onChange={() => handleHazardToggle(hazard.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <span className="text-sm text-gray-700">{hazard.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hazard Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Hazard Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signal Word
                </label>
                <select
                  value={formData.signalWord}
                  onChange={(e) => setFormData(prev => ({ ...prev, signalWord: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                >
                  <option value="">Select...</option>
                  <option value="Danger">Danger</option>
                  <option value="Warning">Warning</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hazard Statements (H-statements)
                </label>
                <textarea
                  value={formData.hazardStatements}
                  onChange={(e) => setFormData(prev => ({ ...prev, hazardStatements: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="e.g., H225, H319, H336"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precautionary Statements (P-statements)
                </label>
                <textarea
                  value={formData.precautionaryStatements}
                  onChange={(e) => setFormData(prev => ({ ...prev, precautionaryStatements: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="e.g., P210, P233, P240"
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* Safety Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Safety Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PPE Requirements
                </label>
                <textarea
                  value={formData.ppeRequirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, ppeRequirements: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="e.g., Safety glasses, gloves, lab coat"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Procedures
                </label>
                <textarea
                  value={formData.emergencyProcedures}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyProcedures: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Aid Measures
                </label>
                <textarea
                  value={formData.firstAidMeasures}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstAidMeasures: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* Storage & Handling */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Storage & Handling</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage Conditions
                </label>
                <textarea
                  value={formData.storageConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, storageConditions: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Handling Precautions
                </label>
                <textarea
                  value={formData.handlingPrecautions}
                  onChange={(e) => setFormData(prev => ({ ...prev, handlingPrecautions: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incompatible Materials
                </label>
                <textarea
                  value={formData.incompatibleMaterials}
                  onChange={(e) => setFormData(prev => ({ ...prev, incompatibleMaterials: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* Physical Properties */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Physical & Chemical Properties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Physical State
                </label>
                <select
                  value={formData.physicalState}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalState: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                >
                  <option value="">Select...</option>
                  <option value="solid">Solid</option>
                  <option value="liquid">Liquid</option>
                  <option value="gas">Gas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Odor
                </label>
                <input
                  type="text"
                  value={formData.odor}
                  onChange={(e) => setFormData(prev => ({ ...prev, odor: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.pH}
                  onChange={(e) => setFormData(prev => ({ ...prev, pH: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="14"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flash Point
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.flashPoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, flashPoint: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={uploading}
                  />
                  <select
                    value={formData.flashPointUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, flashPointUnit: e.target.value }))}
                    className="w-20 border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={uploading}
                  >
                    <option value="C">°C</option>
                    <option value="F">°F</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white pb-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
              disabled={uploading || !file}
            >
              {uploading ? 'Uploading...' : 'Upload SDS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SDSUploadModal;
