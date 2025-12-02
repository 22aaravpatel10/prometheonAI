import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, PencilIcon, TrashIcon, BoltIcon } from '@heroicons/react/24/outline';

interface Equipment {
  id: number;
  name: string;
  equipmentId?: string | null;
  location?: string | null;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  size?: number | null;
  sizeUnit?: string | null;
  capacity?: number | null;
  capacityUnit?: string | null;
  materialOfConstruction?: string | null;
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
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    equipmentId: '',
    location: '',
    status: 'available' as 'available' | 'in_use' | 'maintenance' | 'offline',
    size: '',
    sizeUnit: '',
    capacity: '',
    capacityUnit: '',
    materialOfConstruction: ''
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
    setIsQuickAdd(false);
    setFormData({
      name: '',
      equipmentId: '',
      location: '',
      status: 'available',
      size: '',
      sizeUnit: '',
      capacity: '',
      capacityUnit: '',
      materialOfConstruction: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setIsQuickAdd(false);
    setFormData({
      name: eq.name,
      equipmentId: eq.equipmentId || '',
      location: eq.location || '',
      status: eq.status,
      size: eq.size?.toString() || '',
      sizeUnit: eq.sizeUnit || '',
      capacity: eq.capacity?.toString() || '',
      capacityUnit: eq.capacityUnit || '',
      materialOfConstruction: eq.materialOfConstruction || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare data with proper types
      const submitData = {
        name: formData.name,
        equipmentId: formData.equipmentId || null,
        location: formData.location || null,
        status: formData.status,
        size: formData.size ? parseFloat(formData.size) : null,
        sizeUnit: formData.sizeUnit || null,
        capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        capacityUnit: formData.capacityUnit || null,
        materialOfConstruction: formData.materialOfConstruction || null,
        isCustom: editingEquipment ? editingEquipment.isCustom : !isQuickAdd
      };

      if (editingEquipment) {
        // Update existing equipment
        const response = await axios.put(`/equipment/${editingEquipment.id}`, submitData);
        setEquipment(prev => prev.map(eq =>
          eq.id === editingEquipment.id ? response.data : eq
        ));
        toast.success('Equipment updated successfully');
      } else {
        // Create new equipment
        const response = await axios.post('/equipment', submitData);
        setEquipment(prev => [...prev, response.data]);
        toast.success('Equipment created successfully');
      }

      setIsModalOpen(false);
      setEditingEquipment(null);
      setIsQuickAdd(false);
      setFormData({
        name: '',
        equipmentId: '',
        location: '',
        status: 'available',
        size: '',
        sizeUnit: '',
        capacity: '',
        capacityUnit: '',
        materialOfConstruction: ''
      });
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

  const handleQuickAdd = (name: string) => {
    // Open modal with pre-filled name and default values for other fields
    setEditingEquipment(null);
    setIsQuickAdd(true);
    setIsQuickAddModalOpen(false); // Close the selection modal
    setFormData({
      name: name,
      equipmentId: '',
      location: '',
      status: 'available',
      size: '',
      sizeUnit: '',
      capacity: '',
      capacityUnit: '',
      materialOfConstruction: ''
    });
    setIsModalOpen(true); // Open the edit modal
  };

  const canEdit = user?.role !== 'viewer';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/20"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8 animate-fade-in-up flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white font-tech tracking-wider">
              EQUIPMENT <span className="text-[#007A73]">MANAGEMENT</span>
            </h1>
            <p className="text-gray-500 text-xs font-mono tracking-[0.2em] mt-1">
              MANAGE YOUR PRODUCTION EQUIPMENT
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsQuickAddModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-white/30 text-sm font-bold font-tech text-white bg-white/5 hover:bg-white/10 hover:border-white/50 transition-all duration-300 rounded-sm"
              >
                <BoltIcon className="-ml-1 mr-2 h-5 w-5" />
                QUICK ADD
              </button>
              <button
                onClick={handleCreate}
                className="inline-flex items-center justify-center px-4 py-2 border border-white/50 text-sm font-bold font-tech text-white bg-white/10 hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-300 rounded-sm"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                ADD CUSTOM
              </button>
            </div>
          )}
        </div>

        {/* Equipment List */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-sm overflow-hidden">
          <ul className="divide-y divide-white/10">
            {equipment.map((eq) => (
              <li key={eq.id} className="hover:bg-white/5 transition-colors duration-200">
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-white font-tech tracking-wider">
                        {eq.name}
                      </h3>
                      {eq.isCustom && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/50 text-blue-200 border border-blue-500/30">
                          CUSTOM
                        </span>
                      )}
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${eq.status === 'available' ? 'bg-green-900/50 text-green-200 border-green-500/30' :
                        eq.status === 'in_use' ? 'bg-yellow-900/50 text-yellow-200 border-yellow-500/30' :
                          'bg-red-900/50 text-red-200 border-red-500/30'
                        }`}>
                        {eq.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 font-mono">
                      {eq._count.batchEvents} BATCHES • {eq._count.maintenanceEvents} MAINTENANCE
                      {eq.createdBy && (
                        <span className="ml-2">• BY {eq.createdBy.email}</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(eq)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                        title="Edit equipment"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(eq)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-sm transition-colors"
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
            <div className="text-center py-12">
              <p className="text-gray-500 font-mono text-sm">NO EQUIPMENT FOUND IN DATABASE</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title="QUICK ADD EQUIPMENT"
        size="2xl"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {commonEquipmentTypes
            .filter(name => !equipment.some(eq => eq.name === name))
            .map((name) => (
              <button
                key={name}
                onClick={() => handleQuickAdd(name)}
                className="px-4 py-3 text-sm border border-white/20 rounded-sm hover:bg-white/10 hover:border-white/50 text-left text-gray-300 hover:text-white transition-all duration-200 font-mono"
              >
                {name}
              </button>
            ))}
        </div>
      </Modal>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEquipment ? 'EDIT EQUIPMENT' : 'ADD CUSTOM EQUIPMENT'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Equipment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                required
                placeholder="ENTER NAME"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Equipment ID
              </label>
              <input
                type="text"
                value={formData.equipmentId}
                onChange={(e) => setFormData(prev => ({ ...prev, equipmentId: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="ENTER ID"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="ENTER LOCATION"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
              >
                <option value="available">AVAILABLE</option>
                <option value="in_use">IN USE</option>
                <option value="maintenance">MAINTENANCE</option>
                <option value="offline">OFFLINE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Size
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.size}
                  onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  placeholder="0.00"
                />
                <input
                  type="text"
                  value={formData.sizeUnit}
                  onChange={(e) => setFormData(prev => ({ ...prev, sizeUnit: e.target.value }))}
                  className="w-24 bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  placeholder="UNIT"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Capacity
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  placeholder="0.00"
                />
                <input
                  type="text"
                  value={formData.capacityUnit}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacityUnit: e.target.value }))}
                  className="w-24 bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  placeholder="UNIT"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Material of Construction
              </label>
              <input
                type="text"
                value={formData.materialOfConstruction}
                onChange={(e) => setFormData(prev => ({ ...prev, materialOfConstruction: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="e.g. STAINLESS STEEL 316L"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-white/20 text-gray-300 rounded-sm hover:bg-white/10 hover:text-white font-tech text-sm tracking-wider"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-white/10 text-white border border-white/50 rounded-sm hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] font-tech text-sm tracking-wider font-bold"
            >
              {editingEquipment ? 'UPDATE EQUIPMENT' : 'CREATE EQUIPMENT'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default Equipment;