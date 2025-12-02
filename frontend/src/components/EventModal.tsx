import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from './Modal';
import RecipeContextModal from './RecipeContextModal';

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
  const [showRecipeContext, setShowRecipeContext] = useState(false);

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isNewEvent ? 'CREATE EVENT' : 'EVENT DETAILS'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type */}
        {isNewEvent && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
              Event Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
              disabled={!canEdit}
            >
              <option value="batch">BATCH EVENT</option>
              <option value="maintenance">MAINTENANCE EVENT</option>
            </select>
          </div>
        )}

        {/* Equipment */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
            Equipment
          </label>
          <select
            value={formData.equipmentId}
            onChange={(e) => setFormData(prev => ({ ...prev, equipmentId: e.target.value }))}
            className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
            required
            disabled={!canEdit}
          >
            <option value="">SELECT EQUIPMENT</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Time fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
              Planned Start
            </label>
            <input
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
              className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
              required
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
              Planned End
            </label>
            <input
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
              className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
              required
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Actual times */}
        {!isNewEvent && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Actual Start
              </label>
              <input
                type="datetime-local"
                value={formData.actualStart}
                onChange={(e) => setFormData(prev => ({ ...prev, actualStart: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Actual End
              </label>
              <input
                type="datetime-local"
                value={formData.actualEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, actualEnd: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
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
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  required
                  disabled={!canEdit}
                  placeholder="ENTER BATCH NO"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  required
                  disabled={!canEdit}
                  placeholder="ENTER PRODUCT"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Batch Size (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.batchSize}
                onChange={(e) => setFormData(prev => ({ ...prev, batchSize: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                disabled={!canEdit}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Inputs (JSON format)
              </label>
              <textarea
                value={inputsJson}
                onChange={(e) => setInputsJson(e.target.value)}
                rows={4}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-xs"
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
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                  Reason
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-sm"
                  required
                  disabled={!canEdit}
                >
                  <option value="scheduled">SCHEDULED</option>
                  <option value="breakdown">BREAKDOWN</option>
                  <option value="preventive">PREVENTIVE</option>
                  <option value="cleaning">CLEANING</option>
                  <option value="upgrade">UPGRADE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                  Supervisor Name
                </label>
                <input
                  type="text"
                  value={formData.supervisorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, supervisorName: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                  disabled={!canEdit}
                  placeholder="ENTER NAME"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Expected Duration
              </label>
              <input
                type="text"
                value={formData.expectedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedDuration: e.target.value }))}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                placeholder="e.g., 4 HOURS"
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Spare Parts (JSON format)
              </label>
              <textarea
                value={sparePartsJson}
                onChange={(e) => setSparePartsJson(e.target.value)}
                rows={3}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 font-mono text-xs"
                placeholder='{"filter": 2, "gasket": 1}'
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 font-mono uppercase">
                Changes Made
              </label>
              <textarea
                value={formData.changesMade}
                onChange={(e) => setFormData(prev => ({ ...prev, changesMade: e.target.value }))}
                rows={3}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-3 py-2 text-white focus:border-white/50 focus:ring-0 placeholder-gray-600 font-mono text-sm"
                disabled={!canEdit}
                placeholder="DESCRIBE CHANGES"
              />
            </div>
          </>
        )}

        {/* Action buttons */}
        {canEdit && (
          <div className="flex justify-between pt-4 border-t border-white/10">
            <div>
              {!isNewEvent && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-900/50 rounded-sm hover:bg-red-900/40 hover:text-red-300 font-tech text-sm tracking-wider"
                >
                  DELETE
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {!isNewEvent && formData.type === 'batch' && event.recipeId && (
                <button
                  type="button"
                  onClick={() => setShowRecipeContext(true)}
                  className="px-4 py-2 bg-blue-900/20 text-blue-400 border border-blue-900/50 rounded-sm hover:bg-blue-900/40 hover:text-blue-300 font-tech text-sm tracking-wider"
                >
                  VIEW AI ANALYSIS
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-white/20 text-gray-300 rounded-sm hover:bg-white/10 hover:text-white font-tech text-sm tracking-wider"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-white/10 text-white border border-white/50 rounded-sm hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] font-tech text-sm tracking-wider font-bold"
              >
                {isNewEvent ? 'CREATE EVENT' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        )}
      </form>
      {showRecipeContext && event.recipeId && (
        <RecipeContextModal
          recipeId={event.recipeId}
          onClose={() => setShowRecipeContext(false)}
        />
      )}
    </Modal >
  );
};

export default EventModal;