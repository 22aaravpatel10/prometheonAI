import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
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
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Material>>({
    name: '',
    currentQuantity: 0,
    unit: 'kg',
    minimumStock: 0,
    supplier: '',
    costPerUnit: 0
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
      costPerUnit: 0
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
      costPerUnit: material.costPerUnit
    });
    setIsModalOpen(true);
  };

  const handleViewTransactions = (material: Material) => {
    setSelectedMaterial(material);
    fetchTransactions(material.id);
  };

  const lowStockCount = materials.filter(m => m.isLowStock).length;

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-sm text-gray-700">
              Track raw materials, stock levels, and transactions
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Material
            </button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">{lowStockCount} material{lowStockCount > 1 ? 's' : ''}</span> below minimum stock level
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Materials Table */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ID</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Current Qty</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Min Stock</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Unit</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Supplier</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-4 text-center text-sm text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : materials.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-4 text-center text-sm text-gray-500">
                          No materials found
                        </td>
                      </tr>
                    ) : (
                      materials.map((material) => (
                        <tr key={material.id} className={material.isLowStock ? 'bg-yellow-50' : ''}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {material.materialId || `MAT-${material.id}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                            {material.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {Number(material.currentQuantity).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {Number(material.minimumStock).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {material.unit}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {material.supplier || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {material.isLowStock ? (
                              <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => handleViewTransactions(material)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              <ClockIcon className="h-5 w-5 inline" />
                            </button>
                            <button
                              onClick={() => handleEdit(material)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              <PencilIcon className="h-5 w-5 inline" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="text-red-600 hover:text-red-900"
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
          </div>
        </div>

        {/* Material Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedMaterial ? 'Edit Material' : 'Add New Material'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Material ID (Optional)</label>
                    <input
                      type="text"
                      value={formData.materialId || ''}
                      onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Quantity *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.currentQuantity}
                        onChange={(e) => setFormData({ ...formData, currentQuantity: parseFloat(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit *</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                        <option value="mL">mL</option>
                        <option value="units">units</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minimum Stock Level *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.minimumStock}
                      onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost Per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPerUnit || ''}
                      onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {selectedMaterial ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transactions Modal */}
        {selectedMaterial && !isModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Transaction History - {selectedMaterial.name}
                </h3>
                <button
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New Transaction
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <dl className="grid grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current Stock</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {Number(selectedMaterial.currentQuantity).toFixed(2)} {selectedMaterial.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Minimum Stock</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {Number(selectedMaterial.minimumStock).toFixed(2)} {selectedMaterial.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      {selectedMaterial.isLowStock ? (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          In Stock
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date/Time</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Balance</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Batch</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(txn.timestamp).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          txn.transactionType === 'consumed' ? 'bg-red-100 text-red-800' :
                          txn.transactionType === 'received' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {txn.transactionType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {txn.transactionType === 'consumed' ? '-' : '+'}{Number(txn.quantity).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {Number(txn.remainingBalance).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {txn.batchEvent ? `${txn.batchEvent.batchNo} - ${txn.batchEvent.productName}` : '-'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {txn.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedMaterial(null);
                    setTransactions([]);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Transaction Modal */}
        {isTransactionModalOpen && selectedMaterial && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                New Transaction - {selectedMaterial.name}
              </h3>
              <form onSubmit={handleAddTransaction}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                    <select
                      value={transactionData.transactionType}
                      onChange={(e) => setTransactionData({ ...transactionData, transactionType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="received">Received</option>
                      <option value="consumed">Consumed</option>
                      <option value="adjusted">Adjusted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity ({selectedMaterial.unit})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transactionData.quantity}
                      onChange={(e) => setTransactionData({ ...transactionData, quantity: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={transactionData.notes}
                      onChange={(e) => setTransactionData({ ...transactionData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransactionModalOpen(false);
                      setTransactionData({ transactionType: 'received', quantity: 0, notes: '' });
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Record Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Inventory;
