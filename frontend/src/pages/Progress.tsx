import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import EventModal from '../components/EventModal';
import ExportButtons from '../components/ExportButtons';
import ScheduleRecipeModal from '../components/ScheduleRecipeModal';
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

const Progress: React.FC = () => {
    const { user } = useAuth();
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [batchEvents, setBatchEvents] = useState<BatchEvent[]>([]);
    const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [calendarView, setCalendarView] = useState('resourceTimeGridDay'); // Default to Vertical Resource View
    const [showActualTimes, setShowActualTimes] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: string, resourceId: number } | null>(null);

    useEffect(() => {
        fetchData(true);
    }, []);

    const fetchData = async (isInitial = false) => {
        if (isInitial) setInitialLoading(true);
        else setIsRefreshing(true);

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
            setInitialLoading(false);
            setIsRefreshing(false);
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

        // Store slot info and open Recipe Scheduler
        setSelectedSlot({
            start: selectInfo.startStr,
            resourceId: equipmentItem.id
        });
        setIsScheduleModalOpen(true);
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

    if (initialLoading) {
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
            <div className="px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-8 animate-fade-in-up flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white font-tech tracking-wider">
                            PROGRESS <span className="text-[#007A73]">TRACKING</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-mono tracking-[0.2em] mt-1">
                            BATCH SCHEDULE AND TIMELINE
                        </p>
                    </div>
                    {isRefreshing && (
                        <div className="text-blue-400 text-xs font-mono animate-pulse">
                            UPDATING LIVE DATA...
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCalendarView('resourceTimelineWeek')}
                            className={`px-4 py-2 text-xs font-bold tracking-wider font-tech rounded-sm transition-all duration-300 border ${calendarView === 'resourceTimelineWeek'
                                ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-white/50 hover:text-white'
                                }`}
                        >
                            TIMELINE WEEK
                        </button>
                        <button
                            onClick={() => setCalendarView('resourceTimeGridDay')}
                            className={`px-4 py-2 text-xs font-bold tracking-wider font-tech rounded-sm transition-all duration-300 border ${calendarView === 'resourceTimeGridDay'
                                ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-white/50 hover:text-white'
                                }`}
                        >
                            SCHEDULE DAY
                        </button>
                        <button
                            onClick={() => setCalendarView('dayGridMonth')}
                            className={`px-4 py-2 text-xs font-bold tracking-wider font-tech rounded-sm transition-all duration-300 border ${calendarView === 'dayGridMonth'
                                ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-white/50 hover:text-white'
                                }`}
                        >
                            MONTH
                        </button>
                    </div>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={showActualTimes}
                            onChange={(e) => setShowActualTimes(e.target.checked)}
                            className="rounded border-gray-600 bg-gray-800 text-white focus:ring-white focus:ring-offset-black"
                        />
                        <span className="ml-2 text-xs text-gray-400 font-tech tracking-wider uppercase">Show Actuals</span>
                    </label>

                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="px-6 py-2 bg-blue-600 text-white text-xs font-bold tracking-widest font-tech rounded-sm hover:bg-blue-500 transition-all duration-300 shadow-lg shadow-blue-900/20"
                    >
                        SCHEDULE BATCH
                    </button>

                    <button
                        onClick={() => fetchData(false)}
                        className="px-6 py-2 bg-white/10 text-white border border-white/50 text-xs font-bold tracking-widest font-tech rounded-sm hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-300"
                    >
                        REFRESH DATA
                    </button>

                    <ExportButtons />
                </div>

                {/* Calendar */}
                <div className="bg-black/50 backdrop-blur-sm rounded-sm shadow-2xl border border-gray-800 overflow-hidden animate-fade-in-up relative group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <FullCalendar
                        plugins={[resourceTimelinePlugin, resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView={calendarView}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: ''
                        }}
                        events={calendarEvents}
                        resources={resources} // Always pass resources, views that don't need them will ignore
                        resourceAreaHeaderContent="Equipment"
                        selectable={user?.role !== 'viewer'}
                        selectMirror={true}
                        eventClick={handleEventClick}
                        select={handleDateSelect}
                        height="auto"
                        slotMinTime="00:00:00"
                        slotMaxTime="24:00:00"
                        slotDuration="01:00:00"
                        eventDisplay="block"
                        nowIndicator={true} // Shows current time line
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

            {/* Schedule Recipe Modal */}
            {isScheduleModalOpen && (
                <ScheduleRecipeModal
                    isOpen={isScheduleModalOpen}
                    onClose={() => {
                        setIsScheduleModalOpen(false);
                        setSelectedSlot(null);
                    }}
                    onSuccess={() => fetchData(false)}
                    equipmentList={equipment}
                    initialEquipmentId={selectedSlot?.resourceId}
                    initialStartTime={selectedSlot?.start}
                />
            )}
        </Layout>
    );
};

export default Progress;
