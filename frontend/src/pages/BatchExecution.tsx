import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Play, Pause, CheckSquare, Square, AlertTriangle, Thermometer, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

interface RecipeStep {
    stepNumber: number;
    description: string;
    duration?: number;
}

interface RecipeIngredient {
    id: number;
    material: {
        name: string;
        unit: string;
    };
    quantity: number;
    unit: string;
    stepNumber?: number;
}

interface BatchContext {
    safety?: string[];
    thermodynamics?: {
        exothermic?: boolean;
        tempRange?: string;
    };
}

interface BatchDetails {
    id: number;
    batchNo: string;
    productName: string;
    recipe: {
        name: string;
        version: string;
        steps: RecipeStep[];
        ingredients: RecipeIngredient[];
        contextData: BatchContext;
    };
    status: string;
}

const BatchExecution: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [batch, setBatch] = useState<BatchDetails | null>(null);
    const [activeStep, setActiveStep] = useState<number>(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        fetchBatchDetails();
    }, [id]);

    const fetchBatchDetails = async () => {
        try {
            const res = await axios.get(`/batches/${id}`);
            setBatch(res.data);
            // Initialize from saved state if available (future feature)
        } catch (error) {
            console.error('Failed to fetch batch:', error);
            toast.error('Failed to load batch data');
        } finally {
            setLoading(false);
        }
    };

    const toggleStep = (stepIdx: number) => {
        if (completedSteps.includes(stepIdx)) {
            setCompletedSteps(prev => prev.filter(s => s !== stepIdx));
        } else {
            setCompletedSteps(prev => [...prev, stepIdx]);
            if (activeStep === stepIdx) {
                setActiveStep(stepIdx + 1);
            }
        }
    };

    if (loading) return (
        <Layout>
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        </Layout>
    );

    if (!batch) return <Layout><div className="text-white">Batch not found</div></Layout>;

    const currentStepIngredients = batch.recipe.ingredients.filter(
        i => i.stepNumber === activeStep + 1 || !i.stepNumber // Show ingredients for current step or unassigned
    );

    const context = batch.recipe.contextData || {};

    return (
        <Layout>
            <div className="h-[calc(100vh-100px)] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <div>
                        <h1 className="text-2xl font-bold text-white font-tech tracking-wider">
                            BATCH EXECUTION: <span className="text-cyan-400">{batch.batchNo}</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-mono mt-1">
                            {batch.productName} | RECIPE: {batch.recipe.name} (v{batch.recipe.version})
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsRunning(!isRunning)}
                            className={`flex items-center gap-2 px-6 py-3 rounded font-bold tracking-wider transition-all ${isRunning
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                                    : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                                }`}
                        >
                            {isRunning ? <><Pause size={18} /> PAUSE</> : <><Play size={18} /> START BATCH</>}
                        </button>
                        <button
                            onClick={() => navigate('/progress')}
                            className="px-6 py-3 border border-slate-600 text-slate-300 rounded hover:bg-slate-800"
                        >
                            EXIT
                        </button>
                    </div>
                </div>

                <div className="flex gap-6 flex-1 overflow-hidden">
                    {/* Left Panel: Steps Checklist */}
                    <div className="w-2/3 bg-black/40 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <CheckSquare className="text-cyan-400" size={20} />
                                Execution Steps
                            </h2>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2">
                            {batch.recipe.steps.map((step, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setActiveStep(idx)}
                                    className={`p-4 rounded border transition-all cursor-pointer group ${activeStep === idx
                                            ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                            : completedSteps.includes(idx)
                                                ? 'bg-slate-900/30 border-slate-800 opacity-60'
                                                : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleStep(idx);
                                            }}
                                            className="mt-1 text-slate-400 hover:text-cyan-400 transition-colors"
                                        >
                                            {completedSteps.includes(idx)
                                                ? <CheckSquare className="text-green-400" size={24} />
                                                : <Square size={24} />}
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-xs font-mono px-2 py-0.5 rounded ${activeStep === idx ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                                                    }`}>
                                                    STEP {step.stepNumber}
                                                </span>
                                                {step.duration && (
                                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                                        <Activity size={12} /> {step.duration} MIN
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm ${completedSteps.includes(idx) ? 'text-slate-500 line-through' : 'text-slate-200'
                                                }`}>
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Context & Ingredients */}
                    <div className="w-1/3 flex flex-col gap-6">
                        {/* Safety & Thermo Context */}
                        <div className="bg-black/40 border border-slate-700 rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="text-yellow-400" size={20} />
                                    Process Context
                                </h2>
                            </div>
                            <div className="p-4 space-y-4">
                                {context.thermodynamics?.exothermic && (
                                    <div className="bg-red-900/20 border border-red-500/30 p-3 rounded flex items-start gap-3">
                                        <Thermometer className="text-red-400 shrink-0" />
                                        <div>
                                            <h4 className="text-red-400 font-bold text-sm">EXOTHERMIC REACTION</h4>
                                            <p className="text-red-200/70 text-xs mt-1">
                                                Monitor temperature closely. Ensure cooling system is active.
                                                {context.thermodynamics.tempRange && ` Target: ${context.thermodynamics.tempRange}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {context.safety && context.safety.length > 0 && (
                                    <div className="bg-slate-900/50 border border-slate-700 p-3 rounded">
                                        <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Safety Hazards</h4>
                                        <ul className="space-y-1">
                                            {context.safety.map((item, i) => (
                                                <li key={i} className="text-slate-300 text-xs flex items-start gap-2">
                                                    <span className="text-yellow-500">•</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {!context.thermodynamics?.exothermic && !context.safety?.length && (
                                    <p className="text-slate-500 text-sm italic text-center py-4">
                                        No specific safety context for this step.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Required Materials */}
                        <div className="bg-black/40 border border-slate-700 rounded-lg flex-1 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                    Required Materials
                                </h2>
                            </div>
                            <div className="p-4 overflow-y-auto">
                                {currentStepIngredients.length > 0 ? (
                                    <div className="space-y-3">
                                        {currentStepIngredients.map((ing, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-700 rounded">
                                                <div>
                                                    <p className="text-cyan-300 font-medium text-sm">{ing.material.name}</p>
                                                    <p className="text-slate-500 text-xs">Inventory Item</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-white font-mono font-bold">{ing.quantity} {ing.unit}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm italic text-center py-4">
                                        No ingredients required for this step.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default BatchExecution;
