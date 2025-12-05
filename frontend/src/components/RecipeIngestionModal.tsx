import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, FileText, Check, AlertTriangle, Loader } from 'lucide-react';

interface RecipeIngestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface DraftRecipe {
    recipeName: string;
    steps: any[];
    ingredients: any[];
    outputs: any[];
    confidence: number;
}

const RecipeIngestionModal: React.FC<RecipeIngestionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState<string>('');
    const [draft, setDraft] = useState<DraftRecipe | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/materials`)
                .then(res => setAvailableMaterials(res.data))
                .catch(err => console.error('Failed to fetch materials:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        setLoadingStage('Extracting text from PDF...');
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulate stages for better UX
            setTimeout(() => setLoadingStage('Analyzing structure with AI...'), 1500);
            setTimeout(() => setLoadingStage('Resolving entities against inventory...'), 3500);
            setTimeout(() => setLoadingStage('Enriching with chemical context...'), 5500);

            const token = localStorage.getItem('token');
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/recipes/ingest-pdf`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            setDraft(response.data);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.response?.data?.error || 'Failed to process PDF');
        } finally {
            setIsLoading(false);
            setLoadingStage('');
        }
    };

    const handleSave = async () => {
        if (!draft) return;

        setIsLoading(true);
        setLoadingStage('Saving recipe to database...');

        try {
            const token = localStorage.getItem('token');
            console.log('Using API URL:', process.env.REACT_APP_API_URL);

            // Transform draft to match backend expected structure if needed
            const recipeData = {
                name: draft.recipeName,
                description: `Imported from ${file?.name}`,
                sourceFile: file?.name,
                steps: draft.steps,
                ingredients: draft.ingredients,
                outputs: draft.outputs,
                status: 'draft'
            };

            await axios.post(`${process.env.REACT_APP_API_URL}/recipes`, recipeData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Recipe saved successfully');
            setIsLoading(false); // Explicitly stop loading
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.response?.data?.error || 'Failed to save recipe');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            Import Recipe from PDF
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Upload a batch record or recipe PDF to automatically extract structure and context.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    {!draft ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                            {isLoading ? (
                                <div className="text-center">
                                    <Loader className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                                    <p className="text-lg font-medium text-white">{loadingStage}</p>
                                    <p className="text-sm text-slate-400 mt-2">This usually takes 10-20 seconds.</p>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".pdf"
                                        className="hidden"
                                    />
                                    <Upload className="w-12 h-12 text-slate-500 mb-4" />
                                    <p className="text-lg font-medium text-slate-300 mb-2">
                                        {file ? file.name : "Drag and drop your PDF here"}
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                    >
                                        {file ? "Change file" : "or click to browse"}
                                    </button>
                                    {file && (
                                        <button
                                            onClick={handleUpload}
                                            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Start Analysis
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Review Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column: Structure */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Recipe Details</h3>
                                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-4">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Suggested Name</label>
                                                <input
                                                    type="text"
                                                    value={draft.recipeName}
                                                    onChange={(e) => setDraft({ ...draft, recipeName: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-green-400">
                                                <Check className="w-4 h-4" />
                                                <span>Confidence Score: {(draft.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Ingredients ({draft.ingredients.length})</h3>
                                        <div className="bg-slate-900/50 rounded-lg border border-slate-700 divide-y divide-slate-700">
                                            {draft.ingredients.map((ing, idx) => (
                                                <div key={idx} className="p-3 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-white font-medium">{ing.name}</p>
                                                        <p className="text-xs text-slate-400">{ing.quantity} {ing.unit}</p>
                                                    </div>

                                                    {/* Active Resolution Dropdown */}
                                                    <select
                                                        className={`text-xs bg-slate-800 border ${ing.materialId ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-400'} rounded px-2 py-1 focus:outline-none max-w-[200px]`}
                                                        value={ing.materialId || ""}
                                                        onChange={(e) => {
                                                            const newIngredients = [...draft.ingredients];
                                                            newIngredients[idx].materialId = e.target.value ? parseInt(e.target.value) : null;
                                                            setDraft({ ...draft, ingredients: newIngredients });
                                                        }}
                                                    >
                                                        <option value="">Create New Material</option>
                                                        {availableMaterials.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name} ({m.currentQuantity} {m.unit})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Steps & Context */}
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Process Steps ({draft.steps.length})</h3>
                                    <div className="space-y-4">
                                        {draft.steps.map((step, idx) => (
                                            <div key={idx} className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="text-white font-medium">Step {idx + 1}: {step.name}</h4>
                                                    {step.context?.reactionType && (
                                                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                                            {step.context.reactionType}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 mb-3">{step.description}</p>

                                                {/* AI Context Preview */}
                                                {step.context && (
                                                    <div className="bg-slate-800/50 rounded p-3 text-xs space-y-2">
                                                        <div className="flex items-center gap-2 text-slate-300">
                                                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                            Safety: {step.context.safetyData?.runawayRisk || 'Unknown'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-300">
                                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                            Thermodynamics: {step.context.thermodynamics?.enthalpy || 'Calculating...'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {draft && (
                    <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                        <button
                            onClick={() => setDraft(null)}
                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Approve & Save Recipe
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeIngestionModal;
