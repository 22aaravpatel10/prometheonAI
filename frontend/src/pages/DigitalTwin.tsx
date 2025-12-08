import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Layout from '../components/Layout';
import { Settings, Activity, Database, AlertTriangle } from 'lucide-react';
import axios from 'axios';

// Node Types
const EquipmentNode = ({ data }: { data: any }) => (
    <div className={`p-4 rounded-lg border-2 shadow-lg min-w-[200px] bg-[#0a0a0a] ${data.status === 'running' ? 'border-[#007A73] shadow-[#007A73]/20' :
            data.status === 'maintenance' ? 'border-red-500 shadow-red-500/20' :
                'border-yellow-500 shadow-yellow-500/20'
        }`}>
        <div className="flex items-center gap-2 mb-2">
            <Database size={16} className={
                data.status === 'running' ? 'text-[#007A73]' :
                    data.status === 'maintenance' ? 'text-red-500' : 'text-yellow-500'
            } />
            <span className="font-tech font-bold text-white uppercase">{data.label}</span>
            <span className="ml-auto text-[10px] bg-white/10 px-1 rounded text-gray-400">{data.type}</span>
        </div>
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
                <span>Temp:</span>
                <span className="text-white font-mono">{data.telemetry?.temp || '--'}°C</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
                <span>Press:</span>
                <span className="text-white font-mono">{data.telemetry?.pressure || '--'} bar</span>
            </div>
            {data.currentBatch && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-[#007A73]">
                    Batch: {data.currentBatch}
                </div>
            )}
        </div>
    </div>
);

const TankNode = ({ data }: { data: any }) => (
    <div className="p-4 rounded-full border border-gray-600 bg-[#0a0a0a] w-32 h-32 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
        <div
            className="absolute bottom-0 left-0 right-0 bg-blue-500/20 transition-all duration-1000"
            style={{ height: `${(data.level / data.capacity) * 100}%` }}
        ></div>
        <div className="z-10 text-center">
            <div className="font-tech font-bold text-white text-xs">{data.label}</div>
            <div className="font-mono text-[10px] text-gray-400">{data.material}</div>
            <div className="font-mono text-lg text-blue-400 mt-1">{Math.round((data.level / data.capacity) * 100)}%</div>
        </div>
    </div>
);

const nodeTypes = {
    equipment: EquipmentNode,
    tank: TankNode,
};

const initialNodes: Node[] = [
    { id: '1', type: 'equipment', position: { x: 100, y: 100 }, data: { label: 'Reactor 101', type: 'Reactor', status: 'running', telemetry: { temp: 120.5, pressure: 2.1 }, currentBatch: 'B-2025-001' } },
    { id: '2', type: 'equipment', position: { x: 400, y: 100 }, data: { label: 'Filter 201', type: 'Filter', status: 'idle' } },
    { id: '3', type: 'tank', position: { x: 100, y: 300 }, data: { label: 'Tank A', material: 'Solvent', level: 8000, capacity: 10000 } },
    { id: '4', type: 'tank', position: { x: 400, y: 300 }, data: { label: 'Tank B', material: 'Product', level: 2000, capacity: 10000 } },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#007A73' } },
    { id: 'e3-1', source: '3', target: '1', animated: true, label: 'Feed' },
    { id: 'e2-4', source: '2', target: '4', animated: true, label: 'Product' },
];

const DigitalTwin: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    };

    return (
        <Layout>
            <div className="h-full flex relative">
                <div className="flex-1 h-full bg-[#050505]">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        onNodeClick={onNodeClick}
                        fitView
                        className="bg-gray-900"
                    >
                        <Background color="#333" gap={20} />
                        <Controls className="bg-gray-800 border-gray-700 fill-white" />
                        <MiniMap className="bg-gray-800 border-gray-700" nodeColor="#007A73" />
                    </ReactFlow>
                </div>

                {/* Sidebar Details */}
                {selectedNode && (
                    <div className="w-80 border-l border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl p-6 absolute right-0 top-0 bottom-0 z-20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-tech text-xl text-white uppercase tracking-wider">{selectedNode.data.label}</h2>
                            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">
                                <AlertTriangle />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-mono">Status</label>
                                <div className={`mt-1 flex items-center gap-2 ${selectedNode.data.status === 'running' ? 'text-[#007A73]' : 'text-yellow-500'
                                    }`}>
                                    <Activity size={16} />
                                    <span className="font-bold uppercase">{selectedNode.data.status || 'Unknown'}</span>
                                </div>
                            </div>

                            {selectedNode.data.telemetry && (
                                <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                                    <h3 className="text-xs text-[#007A73] font-mono mb-2">TELEMETRY</h3>
                                    {Object.entries(selectedNode.data.telemetry).map(([key, value]) => (
                                        <div key={key} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 capitalize">{key}</span>
                                            <span className="font-mono text-white">{value as React.ReactNode}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add more details here (steam usage, etc.) */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <h3 className="text-xs text-gray-500 font-mono mb-2">UTILITY CONSUMPTION</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Steam Flow</span>
                                        <span className="text-white font-mono">2.4 TPH</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Power Load</span>
                                        <span className="text-white font-mono">45 kW</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default DigitalTwin;
