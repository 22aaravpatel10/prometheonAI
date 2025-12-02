import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Material {
  id: number;
  materialId?: string;
  name: string;
  currentQuantity: number;
  unit: string;
  minimumStock: number;
  supplier?: string;
  costPerUnit?: number;
  isLowStock?: boolean;
  casNumber?: string;
  safetyTags?: string[];
  _count?: {
    transactions: number;
  };
}

interface Transaction {
  id: number;
  transactionType: string;
  quantity: number;
  remainingBalance: number;
  notes?: string;
  timestamp: string;
  batchEvent?: {
    batchNo: string;
    productName: string;
  };
}

const Inventory: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [formData, setFormData] = useState<Partial<Material>>({
    name: '',
    currentQuantity: 0,
    unit: 'kg',
    minimumStock: 0,
    supplier: '',
    costPerUnit: 0,
    casNumber: '',
    safetyTags: []
  });
  const [transactionData, setTransactionData] = useState({
    transactionType: 'received',
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/materials');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (materialId: number) => {
    try {
      const response = await axios.get(`/materials/${materialId}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedMaterial) {
        await axios.put(`/materials/${selectedMaterial.id}`, formData);
        toast.success('Material updated successfully');
      } else {
        await axios.post('/materials', formData);
        toast.success('Material created successfully');
      }
      fetchMaterials();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving material:', error);
      toast.error(error.response?.data?.error || 'Failed to save material');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;

    try {
      await axios.delete(`/materials/${id}`);
      toast.success('Material deleted successfully');
      fetchMaterials();
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast.error(error.response?.data?.error || 'Failed to delete material');
    }
  };

  const ghsCategories = {
    'Physical Hazards': [
      'Explosives', 'Flammable gases', 'Flammable aerosols', 'Oxidizing gases',
      'Gases under pressure', 'Flammable liquids', 'Flammable solids',
      'Self-reactive substances and mixtures', 'Pyrophoric liquids',
      'Pyrophoric solids', 'Pyrophoric gases', 'Self-heating substances and mixtures',
      'Substances which, in contact with water, emit flammable gases',
      'Oxidizing liquids', 'Oxidizing solids', 'Organic peroxides',
      'Corrosive to metals', 'Desensitized explosives'
    ],
    'Health Hazards': [
      'Acute toxicity (oral)', 'Acute toxicity (dermal)', 'Acute toxicity (inhalation)',
      'Skin corrosion / irritation', 'Serious eye damage / eye irritation',
      'Respiratory sensitization', 'Skin sensitization', 'Germ cell mutagenicity',
      'Carcinogenicity', 'Reproductive toxicity',
      'Specific target organ toxicity – Single exposure',
      'Specific target organ toxicity – Repeated exposure',
      'Aspiration hazard'
    ],
    'Environmental Hazards': [
      'Hazardous to aquatic environment — acute',
      'Hazardous to aquatic environment — chronic',
      'Hazardous to the ozone layer'
    ]
  };

  const handleCASLookup = async () => {
    if (!formData.casNumber) {
      toast.error('Please enter a CAS Number');
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await axios.post('/materials/lookup-ghs', { casNumber: formData.casNumber });
      const tags = response.data.tags;

      if (tags.length === 0) {
        toast('No GHS tags found for this CAS number', { icon: 'ℹ️' });
      } else {
        setFormData(prev => ({
          ...prev,
          safetyTags: Array.from(new Set([...(prev.safetyTags || []), ...tags]))
        }));
        toast.success(`Found ${tags.length} GHS tags`);
      }
    } catch (error) {
      console.error('Error looking up CAS:', error);
      toast.error('Failed to lookup GHS tags');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    try {
      await axios.post('/materials/transactions', {
        materialId: selectedMaterial.id,
        ...transactionData
      });
      toast.success('Transaction recorded successfully');
      fetchMaterials();
      fetchTransactions(selectedMaterial.id);
      setIsTransactionModalOpen(false);
      setIsHistoryModalOpen(true); // Re-open history modal to show new transaction
      setTransactionData({ transactionType: 'received', quantity: 0, notes: '' });
    } catch (error: any) {
      console.error('Error recording transaction:', error);
      toast.error(error.response?.data?.error || 'Failed to record transaction');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMaterial(null);
    setFormData({
      name: '',
      currentQuantity: 0,
      unit: 'kg',
      minimumStock: 0,
      supplier: '',
      costPerUnit: 0,
      casNumber: '',
      safetyTags: []
    });
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setFormData({
      materialId: material.materialId,
      name: material.name,
      currentQuantity: material.currentQuantity,
      unit: material.unit,
      minimumStock: material.minimumStock,
      supplier: material.supplier,
      costPerUnit: material.costPerUnit,
      casNumber: material.casNumber || '',
      safetyTags: material.safetyTags || []
    });
    setIsModalOpen(true);
  };

  const handleViewTransactions = (material: Material) => {
    setSelectedMaterial(material);
    fetchTransactions(material.id);
    setIsHistoryModalOpen(true);
  };

  const lowStockCount = materials.filter(m => m.isLowStock).length;

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white font-tech tracking-wider">
              INVENTORY <span className="text-[#007A73]">MANAGEMENT</span>
            </h1>
            <p className="text-gray-500 text-xs font-mono tracking-[0.2em] mt-1">
              TRACK RAW MATERIALS, STOCK LEVELS, AND TRANSACTIONS
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-white/50 text-sm font-bold font-tech text-white bg-white/10 hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-300 rounded-sm"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              ADD MATERIAL
            </button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <div className="mt-4 bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-8 backdrop-blur-sm">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm text-yellow-200 font-mono">
                  <span className="font-bold text-yellow-400">{lowStockCount} MATERIAL{lowStockCount > 1 ? 'S' : ''}</span> BELOW MINIMUM STOCK LEVEL
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Materials Table */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">ID</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Name</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Current Qty</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Min Stock</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Unit</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Supplier</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Safety</th>
                  <th className="px-3 py-3.5 text-left text-xs font-bold text-gray-300 uppercase tracking-wider font-tech">Status</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-transparent">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-sm text-gray-500 font-mono">
                      LOADING DATA...
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-sm text-gray-500 font-mono">
                      NO MATERIALS FOUND
                    </td>
                  </tr>
                ) : (
                  materials.map((material) => (
                    <tr key={material.id} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 font-mono">
                        {material.materialId || `MAT-${material.id}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-white font-tech tracking-wide">
                        {material.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 font-mono">
                        {Number(material.currentQuantity).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">
                        {Number(material.minimumStock).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">
                        {material.unit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                        {material.supplier || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                        {material.safetyTags && material.safetyTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {material.safetyTags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-900/40 text-orange-200 border border-orange-500/30" title={tag}>
                                {tag.split(' ')[0]}...
                              </span>
                            ))}
                            {material.safetyTags.length > 2 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-300 border border-gray-600" title={material.safetyTags.slice(2).join(', ')}>
                                +{material.safetyTags.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {material.isLowStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/50 text-red-200 border border-red-500/30 uppercase tracking-wider">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/50 text-green-200 border border-green-500/30 uppercase tracking-wider">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleViewTransactions(material)}
                          className="text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                          title="View History"
                        >
                          <ClockIcon className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleEdit(material)}
                          className="text-gray-400 hover:text-white mr-4 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Material Form Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={selectedMaterial ? 'EDIT MATERIAL' : 'ADD NEW MATERIAL'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Material ID (Optional)</label>
              <input
                type="text"
                value={formData.materialId || ''}
                onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="AUTO-GENERATED IF EMPTY"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="ENTER NAME"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Current Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.currentQuantity}
                  onChange={(e) => setFormData({ ...formData, currentQuantity: parseFloat(e.target.value) })}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Unit *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
                >
                  <option value="kg">KG</option>
                  <option value="L">L</option>
                  <option value="g">G</option>
                  <option value="mL">ML</option>
                  <option value="units">UNITS</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Minimum Stock Level *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) })}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="ENTER SUPPLIER"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Cost Per Unit</label>
              <input
                type="number"
                step="0.01"
                value={formData.costPerUnit || ''}
                onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">CAS Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.casNumber || ''}
                  onChange={(e) => setFormData({ ...formData, casNumber: e.target.value })}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  placeholder="ENTER CAS NO. (e.g. 67-64-1)"
                />
                <button
                  type="button"
                  onClick={handleCASLookup}
                  disabled={isLookingUp}
                  className="px-3 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-sm hover:bg-blue-600/40 text-xs font-bold font-tech whitespace-nowrap disabled:opacity-50"
                >
                  {isLookingUp ? 'SEARCHING...' : 'AUTO-FILL'}
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mt-4">
              <label className="block text-xs font-medium text-gray-400 mb-3 font-mono uppercase">
                GHS Hazard Classes
              </label>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(ghsCategories).map(([category, hazards]) => (
                  <div key={category}>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 font-tech tracking-wider">{category}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {hazards.map(hazard => (
                        <label key={hazard} className="flex items-start gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={formData.safetyTags?.includes(hazard)}
                            onChange={(e) => {
                              const currentTags = formData.safetyTags || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, safetyTags: [...currentTags, hazard] });
                              } else {
                                setFormData({ ...formData, safetyTags: currentTags.filter(t => t !== hazard) });
                              }
                            }}
                            className="mt-0.5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-offset-black focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{hazard}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-white/20 text-gray-300 rounded-sm hover:bg-white/10 hover:text-white font-tech text-sm tracking-wider"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-white/10 text-white border border-white/50 rounded-sm hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] font-tech text-sm tracking-wider font-bold"
              >
                {selectedMaterial ? 'UPDATE' : 'CREATE'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Transactions History Modal */}
        {selectedMaterial && (
          <Modal
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              setSelectedMaterial(null);
              setTransactions([]);
            }}
            title={`HISTORY: ${selectedMaterial.name.toUpperCase()}`}
            size="2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-400 font-mono">
                CURRENT STOCK: <span className="text-white font-bold">{Number(selectedMaterial.currentQuantity).toFixed(2)} {selectedMaterial.unit}</span>
              </div>
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setIsTransactionModalOpen(true);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-white/30 text-xs font-bold font-tech text-white bg-blue-600/20 hover:bg-blue-600/40 hover:border-blue-400 transition-all duration-300 rounded-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                NEW TRANSACTION
              </button>
            </div>

            <div className="overflow-hidden border border-white/10 rounded-sm mb-6">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider font-tech">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider font-tech">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider font-tech">Qty</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider font-tech">Balance</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider font-tech">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-black/30">
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-400 font-mono">
                        {new Date(txn.timestamp).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${txn.transactionType === 'consumed' ? 'bg-red-900/40 text-red-300 border border-red-500/30' :
                          txn.transactionType === 'received' ? 'bg-green-900/40 text-green-300 border border-green-500/30' :
                            'bg-blue-900/40 text-blue-300 border border-blue-500/30'
                          }`}>
                          {txn.transactionType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-white font-mono">
                        {txn.transactionType === 'consumed' ? '-' : '+'}{Number(txn.quantity).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-400 font-mono">
                        {Number(txn.remainingBalance).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 italic">
                        {txn.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedMaterial(null);
                  setTransactions([]);
                }}
                className="px-4 py-2 border border-white/20 text-gray-300 rounded-sm hover:bg-white/10 hover:text-white font-tech text-sm tracking-wider"
              >
                CLOSE
              </button>
            </div>
          </Modal>
        )}

        {/* Add Transaction Modal */}
        {selectedMaterial && (
          <Modal
            isOpen={isTransactionModalOpen}
            onClose={() => {
              setIsTransactionModalOpen(false);
              setIsHistoryModalOpen(true); // Go back to history
            }}
            title={`NEW TRANSACTION: ${selectedMaterial.name.toUpperCase()}`}
            size="md"
          >
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Transaction Type</label>
                <select
                  value={transactionData.transactionType}
                  onChange={(e) => setTransactionData({ ...transactionData, transactionType: e.target.value })}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
                >
                  <option value="received">RECEIVED (ADD)</option>
                  <option value="consumed">CONSUMED (REMOVE)</option>
                  <option value="adjusted">ADJUSTED (SET)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Quantity ({selectedMaterial.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: parseFloat(e.target.value) })}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">Notes</label>
                <textarea
                  value={transactionData.notes}
                  onChange={(e) => setTransactionData({ ...transactionData, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  placeholder="ENTER NOTES"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransactionModalOpen(false);
                    setIsHistoryModalOpen(true);
                  }}
                  className="px-4 py-2 border border-white/20 text-gray-300 rounded-sm hover:bg-white/10 hover:text-white font-tech text-sm tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white/10 text-white border border-white/50 rounded-sm hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] font-tech text-sm tracking-wider font-bold"
                >
                  RECORD TRANSACTION
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default Inventory;
