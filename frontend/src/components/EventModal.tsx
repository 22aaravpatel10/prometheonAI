import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface Equipment {
  id: number;
  name: string;
}

interface EventModalProps {
  event: any;
  equipment: Equipment[];
  onSave: (event: any) => void;
  onDelete: (eventId: number, eventType: string) => void;
  onClose: () => void;
  canEdit: boolean;
}

const EventModal: React.FC<EventModalProps> = ({
  event,
  equipment,
  onSave,
  onDelete,
  onClose,
  canEdit
}) => {
  const [formData, setFormData] = useState({
    type: event.type || 'batch',
    equipmentId: event.equipmentId || event.equipment?.id || '',
    // Batch fields
    batchNo: event.batchNo || '',
    productName: event.productName || '',
    batchSize: event.batchSize || '',
    inputs: event.inputs || {},
    // Maintenance fields
    reason: event.reason || 'scheduled',
    supervisorName: event.supervisorName || '',
    expectedDuration: event.expectedDuration || '',
    spareParts: event.spareParts || {},
    changesMade: event.changesMade || '',
    // Common fields
    start: event.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : '',
    end: event.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : '',
    actualStart: event.actualStart ? format(new Date(event.actualStart), "yyyy-MM-dd'T'HH:mm") : '',
    actualEnd: event.actualEnd ? format(new Date(event.actualEnd), "yyyy-MM-dd'T'HH:mm") : ''
  });

  const [inputsJson, setInputsJson] = useState(
    JSON.stringify(event.inputs || {}, null, 2)
  );
  const [sparePartsJson, setSparePartsJson] = useState(
    JSON.stringify(event.spareParts || {}, null, 2)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let inputs = {};
    let spareParts = {};
    
    try {
      inputs = JSON.parse(inputsJson || '{}');
    } catch (error) {
      alert('Invalid JSON in inputs field');
      return;
    }
    
    try {
      spareParts = JSON.parse(sparePartsJson || '{}');
    } catch (error) {
      alert('Invalid JSON in spare parts field');
      return;
    }

    const eventData = {
      ...event,
      ...formData,
      equipmentId: parseInt(formData.equipmentId.toString()),
      batchSize: formData.batchSize ? parseFloat(formData.batchSize.toString()) : undefined,
      inputs,
      spareParts,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
      actualStart: formData.actualStart ? new Date(formData.actualStart).toISOString() : null,
      actualEnd: formData.actualEnd ? new Date(formData.actualEnd).toISOString() : null
    };

    onSave(eventData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete(event.id, event.type);
    }
  };

  const isNewEvent = event.isNew;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isNewEvent ? 'Create Event' : 'Event Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type */}
          {isNewEvent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!canEdit}
              >
                <option value="batch">Batch Event</option>
                <option value="maintenance">Maintenance Event</option>
              </select>
            </div>
          )}

          {/* Equipment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment
            </label>
            <select
              value={formData.equipmentId}
              onChange={(e) => setFormData(prev => ({ ...prev, equipmentId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={!canEdit}
            >
              <option value="">Select Equipment</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>

          {/* Time fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Start
              </label>
              <input
                type="datetime-local"
                value={formData.start}
                onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned End
              </label>
              <input
                type="datetime-local"
                value={formData.end}
                onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Actual times */}
          {!isNewEvent && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Start
                </label>
                <input
                  type="datetime-local"
                  value={formData.actualStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualStart: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual End
                </label>
                <input
                  type="datetime-local"
                  value={formData.actualEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualEnd: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}

          {/* Batch-specific fields */}
          {formData.type === 'batch' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formData.batchNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Size (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.batchSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchSize: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inputs (JSON format)
                </label>
                <textarea
                  value={inputsJson}
                  onChange={(e) => setInputsJson(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder='{"temperature": 80, "pressure": 1.5}'
                  disabled={!canEdit}
                />
              </div>
            </>
          )}

          {/* Maintenance-specific fields */}
          {formData.type === 'maintenance' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!canEdit}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="breakdown">Breakdown</option>
                    <option value="preventive">Preventive</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="upgrade">Upgrade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supervisor Name
                  </label>
                  <input
                    type="text"
                    value={formData.supervisorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supervisorName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Duration
                </label>
                <input
                  type="text"
                  value={formData.expectedDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedDuration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 4 hours, 2 days"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spare Parts (JSON format)
                </label>
                <textarea
                  value={sparePartsJson}
                  onChange={(e) => setSparePartsJson(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder='{"filter": 2, "gasket": 1}'
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Changes Made
                </label>
                <textarea
                  value={formData.changesMade}
                  onChange={(e) => setFormData(prev => ({ ...prev, changesMade: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canEdit}
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="flex justify-between pt-4">
              <div>
                {!isNewEvent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  {isNewEvent ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EventModal;