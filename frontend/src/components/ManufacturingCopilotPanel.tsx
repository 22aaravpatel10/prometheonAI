import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Zap, Settings, X, Loader } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_calls?: any[];
}

interface CopilotPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onEventsUpdated?: () => void;
    embedded?: boolean;
}

const ManufacturingCopilotPanel: React.FC<CopilotPanelProps> = ({ isOpen, onClose, onEventsUpdated, embedded = false }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am PrometheonAI. I can help you check schedules, inventory, or optimize your process. How can I assist you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text: string, actionType?: string) => {
        if (!text.trim() && !actionType) return;

        const newMessages: Message[] = [...messages];
        if (text) {
            newMessages.push({ role: 'user', content: text });
        }
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/copilot`, {
                messages: newMessages.filter(m => m.role !== 'system'), // Don't send previous system messages if any
                actionType,
                context: {
                    currentDate: new Date().toISOString(),
                    // Add more context if needed
                }
            });

            const assistantMessage = response.data;
            setMessages(prev => [...prev, assistantMessage]);

            // If the assistant added events, trigger update
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.some((tc: any) => tc.function.name === 'add_events_from_plan')) {
                toast.success('Calendar updated with new events');
                if (onEventsUpdated) onEventsUpdated();
            }

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to get response from PrometheonAI');
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/upload-plan`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success(`Successfully processed plan. Added ${response.data.eventsCreated} events.`);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `I've processed your uploaded plan and added ${response.data.eventsCreated} events to the calendar.`
            }]);

            if (onEventsUpdated) onEventsUpdated();

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload plan');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!isOpen && !embedded) return null;

    const containerClasses = embedded
        ? "w-full h-full bg-black/50 backdrop-blur-sm border border-white/10 flex flex-col rounded-sm min-h-0"
        : "fixed inset-y-0 right-0 w-96 bg-black/95 backdrop-blur-xl border-l border-white/20 shadow-[0_0_50px_-10px_rgba(255,255,255,0.1)] transform transition-transform duration-300 ease-in-out z-50 flex flex-col";

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-black/50 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
                <div className="flex items-center space-x-2 text-white">
                    <div className="p-1.5 bg-white/10 rounded border border-white/20">
                        <Zap className="h-4 w-4" />
                    </div>
                    <h2 className="font-bold text-lg tracking-widest font-tech text-white">PROMETHEON <span className="text-xs text-gray-500 align-top">AI</span></h2>
                </div>
                {!embedded && (
                    <button onClick={onClose} className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent min-h-0">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div className={`max-w-[85%] rounded-sm p-3 text-sm border backdrop-blur-sm ${msg.role === 'user'
                            ? 'bg-white/10 border-white/30 text-white rounded-br-none'
                            : 'bg-gray-900/80 border-gray-800 text-gray-300 rounded-bl-none shadow-lg'
                            }`}>
                            {msg.role === 'assistant' && (
                                <div className="text-[10px] text-gray-500 font-mono mb-1 tracking-wider opacity-70">AI SYSTEM</div>
                            )}
                            <p className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content || (msg.tool_calls ? 'Processing...' : '')}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-gray-900/50 border border-white/20 rounded-sm p-3 rounded-bl-none flex items-center space-x-3">
                            <Loader className="h-4 w-4 animate-spin text-white" />
                            <span className="text-xs text-white font-mono tracking-widest">PROCESSING DATA STREAM...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="p-3 bg-black/80 border-t border-white/10 grid grid-cols-2 gap-2 backdrop-blur-md">
                <button
                    onClick={() => sendMessage('', 'optimize_process')}
                    disabled={isLoading}
                    className="group flex items-center justify-center space-x-2 px-3 py-3 bg-gray-900/50 text-white border border-white/20 rounded-sm hover:bg-white/10 hover:border-white transition-all duration-300"
                >
                    <Settings className="h-3 w-3 group-hover:rotate-90 transition-transform duration-500" />
                    <span className="text-[10px] font-bold tracking-widest font-tech">OPTIMIZE</span>
                </button>
                <button
                    onClick={() => sendMessage('', 'suggest_maintenance')}
                    disabled={isLoading}
                    className="group flex items-center justify-center space-x-2 px-3 py-3 bg-gray-900/50 text-white border border-white/20 rounded-sm hover:bg-white/10 hover:border-white transition-all duration-300"
                >
                    <FileText className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold tracking-widest font-tech">MAINTENANCE</span>
                </button>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/90 border-t border-white/10">
                <div className="flex items-center space-x-2 mb-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm border border-transparent hover:border-white/30 transition-all"
                        title="Upload Plan (PDF/Excel)"
                        disabled={isUploading || isLoading}
                    >
                        {isUploading ? <Loader className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.xlsx,.xls"
                        className="hidden"
                    />
                    <div className="flex-1 relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500 to-white rounded-sm opacity-10 group-hover:opacity-30 transition duration-500 blur"></div>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                            placeholder="ENTER COMMAND..."
                            disabled={isLoading}
                            className="relative w-full pl-3 pr-10 py-2.5 bg-black border border-gray-800 rounded-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 text-sm font-mono"
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-1 top-1 p-1.5 text-white hover:text-gray-300 disabled:opacity-30 transition-colors z-10"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-150"></div>
                    </div>
                    <p className="text-[9px] text-right text-gray-500 font-tech tracking-[0.2em]">
                        SYSTEM ONLINE
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ManufacturingCopilotPanel;
