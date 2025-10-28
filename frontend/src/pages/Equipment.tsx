import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Equipment {
  id: number;
  name: string;
  isCustom: boolean;
  createdBy?: {
    email: string;
  };
  _count: {
    batchEvents: number;
    maintenanceEvents: number;
  };
}

const Equipment: React.FC = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });

  const commonEquipmentTypes = [
    'Reactor 1', 'Reactor 2', 'Reactor 3',
    'Filter Dryer 1', 'Filter Dryer 2',
    'Distillation Column 1', 'Distillation Column 2',
    'Crystallizer 1', 'Crystallizer 2',
    'Centrifuge 1', 'Centrifuge 2',
    'Blender 1', 'Blender 2',
    'Packaging Line 1', 'Packaging Line 2',
    'Heat Exchanger 1', 'Heat Exchanger 2',
    'Storage Tank 1', 'Storage Tank 2'
  ];

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/equipment');
      setEquipment(response.data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEquipment(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({ name: eq.name });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEquipment) {
        // Update existing equipment
        const response = await axios.put(`/equipment/${editingEquipment.id}`, formData);
        setEquipment(prev => prev.map(eq => 
          eq.id === editingEquipment.id ? response.data : eq
        ));
        toast.success('Equipment updated successfully');
      } else {
        // Create new equipment
        const response = await axios.post('/equipment', {
          ...formData,
          isCustom: true
        });
        setEquipment(prev => [...prev, response.data]);
        toast.success('Equipment created successfully');
      }
      
      setIsModalOpen(false);
      setEditingEquipment(null);
      setFormData({ name: '' });
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      const message = error.response?.data?.error || 'Failed to save equipment';
      toast.error(message);
    }
  };

  const handleDelete = async (eq: Equipment) => {
    if (!window.confirm(`Are you sure you want to delete "${eq.name}"?`)) {
      return;
    }

    try {
      await axios.delete(`/equipment/${eq.id}`);
      setEquipment(prev => prev.filter(item => item.id !== eq.id));
      toast.success('Equipment deleted successfully');
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      const message = error.response?.data?.error || 'Failed to delete equipment';
      toast.error(message);
    }
  };

  const handleQuickAdd = async (name: string) => {
    try {
      const response = await axios.post('/equipment', {
        name,
        isCustom: false
      });
      setEquipment(prev => [...prev, response.data]);
      toast.success(`${name} added successfully`);
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      const message = error.response?.data?.error || 'Failed to add equipment';
      toast.error(message);
    }
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your production equipment
            </p>
          </div>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Custom Equipment
            </button>
          )}
        </div>

        {/* Quick Add Section */}
        {canEdit && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Add Common Equipment</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {commonEquipmentTypes
                .filter(name => !equipment.some(eq => eq.name === name))
                .map((name) => (
                  <button
                    key={name}
                    onClick={() => handleQuickAdd(name)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                  >
                    {name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Equipment List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {equipment.map((eq) => (
              <li key={eq.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {eq.name}
                      </h3>
                      {eq.isCustom && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {eq._count.batchEvents} batch events • {eq._count.maintenanceEvents} maintenance events
                      {eq.createdBy && (
                        <span className="ml-2">• Created by {eq.createdBy.email}</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(eq)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Edit equipment"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(eq)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete equipment"
                        disabled={eq._count.batchEvents > 0 || eq._count.maintenanceEvents > 0}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
          {equipment.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No equipment found. Add some equipment to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEquipment ? 'Edit Equipment' : 'Add Custom Equipment'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="Enter equipment name"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  {editingEquipment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Equipment;