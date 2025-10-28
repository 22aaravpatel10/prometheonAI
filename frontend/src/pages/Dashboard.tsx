import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import EventModal from '../components/EventModal';
import ExportButtons from '../components/ExportButtons';
import { useAuth } from '../contexts/AuthContext';

interface Equipment {
  id: number;
  name: string;
}

interface BatchEvent {
  id: number;
  equipmentId: number;
  batchNo: string;
  productName: string;
  batchSize?: number;
  startTimestamp: string;
  endTimestamp: string;
  actualStart?: string;
  actualEnd?: string;
  inputs?: any;
  equipment: Equipment;
}

interface MaintenanceEvent {
  id: number;
  equipmentId: number;
  reason: string;
  supervisorName?: string;
  startTimestamp: string;
  endTimestamp: string;
  actualStart?: string;
  actualEnd?: string;
  equipment: Equipment;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [batchEvents, setBatchEvents] = useState<BatchEvent[]>([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState('resourceTimelineWeek');
  const [showActualTimes, setShowActualTimes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [equipmentRes, batchRes, maintenanceRes] = await Promise.all([
        axios.get('/equipment'),
        axios.get('/batches'),
        axios.get('/maintenance')
      ]);

      setEquipment(equipmentRes.data);
      setBatchEvents(batchRes.data);
      setMaintenanceEvents(maintenanceRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    const eventData = event.extendedProps;
    
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      type: eventData.type,
      ...eventData
    });
    setIsModalOpen(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    if (user?.role === 'viewer') {
      toast.error('You do not have permission to create events');
      return;
    }

    const resourceId = selectInfo.resource?.id;
    const equipmentItem = equipment.find(eq => eq.id.toString() === resourceId);

    if (!equipmentItem) {
      toast.error('Please select a valid equipment');
      return;
    }

    setSelectedEvent({
      start: selectInfo.start,
      end: selectInfo.end,
      equipmentId: equipmentItem.id,
      equipment: equipmentItem,
      type: 'batch', // Default to batch event
      isNew: true
    });
    setIsModalOpen(true);
  };

  const handleEventUpdate = async (updatedEvent: any) => {
    try {
      if (updatedEvent.isNew) {
        // Create new event
        if (updatedEvent.type === 'batch') {
          const response = await axios.post('/batches', {
            equipmentId: updatedEvent.equipmentId,
            batchNo: updatedEvent.batchNo,
            productName: updatedEvent.productName,
            batchSize: updatedEvent.batchSize,
            startTimestamp: updatedEvent.start,
            endTimestamp: updatedEvent.end,
            inputs: updatedEvent.inputs
          });
          setBatchEvents(prev => [...prev, response.data]);
        } else {
          const response = await axios.post('/maintenance', {
            equipmentId: updatedEvent.equipmentId,
            reason: updatedEvent.reason,
            supervisorName: updatedEvent.supervisorName,
            expectedDuration: updatedEvent.expectedDuration,
            startTimestamp: updatedEvent.start,
            endTimestamp: updatedEvent.end,
            spareParts: updatedEvent.spareParts,
            changesMade: updatedEvent.changesMade
          });
          setMaintenanceEvents(prev => [...prev, response.data]);
        }
        toast.success('Event created successfully');
      } else {
        // Update existing event
        if (updatedEvent.type === 'batch') {
          const response = await axios.put(`/batches/${updatedEvent.id}`, {
            equipmentId: updatedEvent.equipmentId,
            batchNo: updatedEvent.batchNo,
            productName: updatedEvent.productName,
            batchSize: updatedEvent.batchSize,
            startTimestamp: updatedEvent.start,
            endTimestamp: updatedEvent.end,
            actualStart: updatedEvent.actualStart,
            actualEnd: updatedEvent.actualEnd,
            inputs: updatedEvent.inputs
          });
          setBatchEvents(prev => prev.map(event => 
            event.id === updatedEvent.id ? response.data : event
          ));
        } else {
          const response = await axios.put(`/maintenance/${updatedEvent.id}`, {
            equipmentId: updatedEvent.equipmentId,
            reason: updatedEvent.reason,
            supervisorName: updatedEvent.supervisorName,
            expectedDuration: updatedEvent.expectedDuration,
            startTimestamp: updatedEvent.start,
            endTimestamp: updatedEvent.end,
            actualStart: updatedEvent.actualStart,
            actualEnd: updatedEvent.actualEnd,
            spareParts: updatedEvent.spareParts,
            changesMade: updatedEvent.changesMade
          });
          setMaintenanceEvents(prev => prev.map(event => 
            event.id === updatedEvent.id ? response.data : event
          ));
        }
        toast.success('Event updated successfully');
      }
      
      setIsModalOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      console.error('Error saving event:', error);
      const message = error.response?.data?.error || 'Failed to save event';
      toast.error(message);
    }
  };

  const handleEventDelete = async (eventId: number, eventType: string) => {
    try {
      if (eventType === 'batch') {
        await axios.delete(`/batches/${eventId}`);
        setBatchEvents(prev => prev.filter(event => event.id !== eventId));
      } else {
        await axios.delete(`/maintenance/${eventId}`);
        setMaintenanceEvents(prev => prev.filter(event => event.id !== eventId));
      }
      toast.success('Event deleted successfully');
      setIsModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Prepare calendar events
  const calendarEvents = [
    // Batch events
    ...batchEvents.map(event => ({
      id: `batch-${event.id}`,
      title: `${event.batchNo} - ${event.productName}`,
      start: event.startTimestamp,
      end: event.endTimestamp,
      resourceId: event.equipmentId.toString(),
      className: 'fc-event-batch',
      extendedProps: {
        type: 'batch',
        ...event
      }
    })),
    // Maintenance events
    ...maintenanceEvents.map(event => ({
      id: `maintenance-${event.id}`,
      title: `Maintenance - ${event.reason}`,
      start: event.startTimestamp,
      end: event.endTimestamp,
      resourceId: event.equipmentId.toString(),
      className: 'fc-event-maintenance',
      extendedProps: {
        type: 'maintenance',
        ...event
      }
    })),
    // Actual times overlay (if enabled)
    ...(showActualTimes ? [
      ...batchEvents.filter(e => e.actualStart && e.actualEnd).map(event => ({
        id: `batch-actual-${event.id}`,
        title: `${event.batchNo} (Actual)`,
        start: event.actualStart!,
        end: event.actualEnd!,
        resourceId: event.equipmentId.toString(),
        className: 'fc-event-batch fc-event-actual',
        extendedProps: {
          type: 'batch',
          isActual: true,
          ...event
        }
      })),
      ...maintenanceEvents.filter(e => e.actualStart && e.actualEnd).map(event => ({
        id: `maintenance-actual-${event.id}`,
        title: `Maintenance (Actual)`,
        start: event.actualStart!,
        end: event.actualEnd!,
        resourceId: event.equipmentId.toString(),
        className: 'fc-event-maintenance fc-event-actual',
        extendedProps: {
          type: 'maintenance',
          isActual: true,
          ...event
        }
      }))
    ] : [])
  ];

  // Prepare resources for timeline view
  const resources = equipment.map(eq => ({
    id: eq.id.toString(),
    title: eq.name
  }));

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage batch and maintenance schedules
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setCalendarView('resourceTimelineWeek')}
              className={`px-3 py-2 text-sm rounded-md ${
                calendarView === 'resourceTimelineWeek'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Timeline Week
            </button>
            <button
              onClick={() => setCalendarView('resourceTimelineDay')}
              className={`px-3 py-2 text-sm rounded-md ${
                calendarView === 'resourceTimelineDay'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Timeline Day
            </button>
            <button
              onClick={() => setCalendarView('dayGridMonth')}
              className={`px-3 py-2 text-sm rounded-md ${
                calendarView === 'dayGridMonth'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Month
            </button>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showActualTimes}
              onChange={(e) => setShowActualTimes(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show Actual Times</span>
          </label>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>

          <ExportButtons />
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow">
          <FullCalendar
            plugins={[resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calendarView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            events={calendarEvents}
            resources={calendarView.includes('Timeline') ? resources : undefined}
            resourceAreaHeaderContent="Equipment"
            selectable={user?.role !== 'viewer'}
            selectMirror={true}
            eventClick={handleEventClick}
            select={handleDateSelect}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="01:00:00"
            eventDisplay="block"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
            <span>Batch Events</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
            <span>Maintenance Events</span>
          </div>
          {showActualTimes && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-600 border-2 border-gray-800 rounded mr-2"></div>
              <span>Actual Times</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {isModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          equipment={equipment}
          onSave={handleEventUpdate}
          onDelete={handleEventDelete}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null);
          }}
          canEdit={user?.role !== 'viewer'}
        />
      )}
    </Layout>
  );
};

export default Dashboard;