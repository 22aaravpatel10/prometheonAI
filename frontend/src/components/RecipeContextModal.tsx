import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { toast } from 'react-hot-toast';

interface RecipeContextModalProps {
    recipeId: number;
    onClose: () => void;
}

interface ReactionContext {
    reactionType: string;
    description: string;
    thermodynamics: {
        enthalpy?: string;
        entropy?: string;
        exothermic?: boolean;
        heatOfReaction?: string;
    };
    kinetics: {
        rateLimitingStep?: string;
        activationEnergy?: string;
        rateLaw?: string;
        catalystEffect?: string;
    };
    safetyData: {
        hazards: string[];
        precautions: string[];
        runawayRisk?: string;
    };
    optimization: {
        yieldFactors: string[];
        rateFactors: string[];
        criticalParameters: string[];
    };
    literatureRefs: {
        title: string;
        authors?: string;
        year?: string;
        journal?: string;
        doi?: string;
        summary?: string;
    }[];
    lastResearched: string;
}

interface RecipeStep {
    id: number;
    stepNumber: number;
    name: string;
    description: string;
    reactionContext?: ReactionContext;
}

const RecipeContextModal: React.FC<RecipeContextModalProps> = ({ recipeId, onClose }) => {
    const [steps, setSteps] = useState<RecipeStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeStep, setActiveStep] = useState<number | null>(null);

    useEffect(() => {
        fetchRecipeDetails();
    }, [recipeId]);

    const fetchRecipeDetails = async () => {
        try {
            const response = await axios.get(`/recipes/${recipeId}`);
            setSteps(response.data.steps);
            if (response.data.steps.length > 0) {
                setActiveStep(response.data.steps[0].id);
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            toast.error('Failed to load recipe details');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            await axios.post(`/recipes/${recipeId}/analyze`);
            toast.success('AI Analysis Complete');
            fetchRecipeDetails(); // Refresh to get new context
        } catch (error) {
            console.error('Error analyzing recipe:', error);
            toast.error('Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const currentStep = steps.find(s => s.id === activeStep);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="AI KNOWLEDGE BASE & RECIPE CONTEXT"
            size="xl"
        >
            <div className="h-[70vh] flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-gray-400 text-sm font-mono">
                                AI-POWERED CHEMICAL ENGINEERING ANALYSIS
                            </p>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className={`px-4 py-2 text-xs font-bold tracking-wider font-tech rounded-sm border ${analyzing
                                        ? 'bg-blue-900/20 border-blue-800 text-blue-400 cursor-wait'
                                        : 'bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/40 hover:text-white'
                                    }`}
                            >
                                {analyzing ? 'ANALYZING...' : 'RUN AI ANALYSIS'}
                            </button>
                        </div>

                        <div className="flex flex-1 gap-4 overflow-hidden">
                            {/* Step List */}
                            <div className="w-1/4 overflow-y-auto border-r border-white/10 pr-2">
                                {steps.map(step => (
                                    <button
                                        key={step.id}
                                        onClick={() => setActiveStep(step.id)}
                                        className={`w-full text-left p-3 mb-2 rounded-sm border transition-all ${activeStep === step.id
                                                ? 'bg-white/10 border-white/50 text-white'
                                                : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="font-mono text-xs text-blue-400 mb-1">STEP {step.stepNumber}</div>
                                        <div className="font-bold text-sm truncate">{step.name}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Context Details */}
                            <div className="flex-1 overflow-y-auto pl-2">
                                {currentStep?.reactionContext ? (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Header */}
                                        <div className="bg-white/5 p-4 rounded-sm border border-white/10">
                                            <h3 className="text-xl font-bold text-white mb-2">{currentStep.reactionContext.reactionType}</h3>
                                            <p className="text-gray-300 text-sm leading-relaxed">
                                                {currentStep.reactionContext.description}
                                            </p>
                                        </div>

                                        {/* Grid Layout */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Thermodynamics */}
                                            <div className="bg-black/30 p-4 rounded-sm border border-white/5">
                                                <h4 className="text-blue-400 font-mono text-xs uppercase mb-3 border-b border-blue-900/50 pb-2">Thermodynamics</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Enthalpy:</span>
                                                        <span className="text-white">{currentStep.reactionContext.thermodynamics.enthalpy || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Exothermic:</span>
                                                        <span className={currentStep.reactionContext.thermodynamics.exothermic ? 'text-red-400' : 'text-blue-400'}>
                                                            {currentStep.reactionContext.thermodynamics.exothermic ? 'YES' : 'NO'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Kinetics */}
                                            <div className="bg-black/30 p-4 rounded-sm border border-white/5">
                                                <h4 className="text-green-400 font-mono text-xs uppercase mb-3 border-b border-green-900/50 pb-2">Kinetics</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-500 block text-xs">Rate Limiting Step:</span>
                                                        <span className="text-white">{currentStep.reactionContext.kinetics.rateLimitingStep || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block text-xs mt-2">Activation Energy:</span>
                                                        <span className="text-white">{currentStep.reactionContext.kinetics.activationEnergy || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Safety */}
                                        <div className="bg-red-900/10 p-4 rounded-sm border border-red-900/30">
                                            <h4 className="text-red-400 font-mono text-xs uppercase mb-3 border-b border-red-900/50 pb-2">Safety Critical Data</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-gray-500 text-xs uppercase block mb-1">Hazards</span>
                                                    <ul className="list-disc list-inside text-sm text-gray-300">
                                                        {currentStep.reactionContext.safetyData.hazards.map((h, i) => (
                                                            <li key={i}>{h}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs uppercase block mb-1">Precautions</span>
                                                    <ul className="list-disc list-inside text-sm text-gray-300">
                                                        {currentStep.reactionContext.safetyData.precautions.map((p, i) => (
                                                            <li key={i}>{p}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Optimization */}
                                        <div className="bg-yellow-900/10 p-4 rounded-sm border border-yellow-900/30">
                                            <h4 className="text-yellow-400 font-mono text-xs uppercase mb-3 border-b border-yellow-900/50 pb-2">Process Optimization</h4>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <span className="text-gray-500 text-xs uppercase block mb-1">Yield Factors</span>
                                                    <div className="text-sm text-gray-300">
                                                        {currentStep.reactionContext.optimization.yieldFactors.join(', ')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs uppercase block mb-1">Rate Factors</span>
                                                    <div className="text-sm text-gray-300">
                                                        {currentStep.reactionContext.optimization.rateFactors.join(', ')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs uppercase block mb-1">Critical Params</span>
                                                    <div className="text-sm text-gray-300">
                                                        {currentStep.reactionContext.optimization.criticalParameters.join(', ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Literature */}
                                        <div>
                                            <h4 className="text-purple-400 font-mono text-xs uppercase mb-3 border-b border-purple-900/50 pb-2">Literature References</h4>
                                            <div className="space-y-2">
                                                {currentStep.reactionContext.literatureRefs.map((ref, i) => (
                                                    <div key={i} className="bg-black/20 p-3 rounded-sm text-sm">
                                                        <div className="font-bold text-white">{ref.title}</div>
                                                        <div className="text-gray-500 text-xs">{ref.authors} ({ref.year})</div>
                                                        <div className="text-gray-400 mt-1 italic">{ref.summary}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                        <div className="text-4xl mb-4 opacity-20">⚛️</div>
                                        <p>No AI analysis available for this step.</p>
                                        <button
                                            onClick={handleAnalyze}
                                            className="mt-4 text-blue-400 hover:text-blue-300 underline text-sm"
                                        >
                                            Run analysis now
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default RecipeContextModal;
