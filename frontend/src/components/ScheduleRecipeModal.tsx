import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Calendar, Beaker, Database, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScheduleRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    equipmentList: any[];
}

const ScheduleRecipeModal: React.FC<ScheduleRecipeModalProps> = ({ isOpen, onClose, onSuccess, equipmentList }) => {
    const [recipes, setRecipes] = useState<any[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [formData, setFormData] = useState({
        recipeId: '',
        equipmentId: '',
        startTime: '',
        batchSize: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRecipes();
            // Set default start time to now + 1 hour, rounded to nearest hour
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            now.setSeconds(0);
            setFormData(prev => ({ ...prev, startTime: now.toISOString().slice(0, 16) }));
        }
    }, [isOpen]);

    const fetchRecipes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/recipes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter only active or approved recipes if needed, for now show all non-draft?
            // Or just show all. Let's show all for flexibility.
            setRecipes(response.data);
        } catch (error) {
            console.error('Error fetching recipes:', error);
            toast.error('Failed to load recipes');
        }
    };

    const handleRecipeChange = (recipeId: string) => {
        const recipe = recipes.find(r => r.id.toString() === recipeId);
        setSelectedRecipe(recipe);
        setFormData(prev => ({
            ...prev,
            recipeId,
            batchSize: recipe ? (recipe.yield || recipe.totalYield || '').toString() : ''
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.REACT_APP_API_URL}/api/batches/schedule`, {
                recipeId: formData.recipeId,
                equipmentId: formData.equipmentId,
                startTime: formData.startTime,
                batchSize: formData.batchSize
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Batch scheduled successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error scheduling batch:', error);
            toast.error(error.response?.data?.error || 'Failed to schedule batch');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        Schedule Batch
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Recipe Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Select Recipe</label>
                        <div className="relative">
                            <Beaker className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={formData.recipeId}
                                onChange={(e) => handleRecipeChange(e.target.value)}
                                required
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
                            >
                                <option value="">Choose a recipe...</option>
                                {recipes.map(recipe => (
                                    <option key={recipe.id} value={recipe.id}>
                                        {recipe.name} (v{recipe.version})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Equipment Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Target Equipment</label>
                        <div className="relative">
                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={formData.equipmentId}
                                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                                required
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
                            >
                                <option value="">Choose equipment...</option>
                                {equipmentList.map(eq => (
                                    <option key={eq.id} value={eq.id}>
                                        {eq.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Start Time */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Start Time</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="datetime-local"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                required
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Batch Size */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Batch Size {selectedRecipe?.yieldUnit && `(${selectedRecipe.yieldUnit})`}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.batchSize}
                            onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                            required
                            placeholder="Enter quantity"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        {selectedRecipe && (
                            <p className="text-xs text-slate-500 mt-1">
                                Standard Yield: {selectedRecipe.yield || selectedRecipe.totalYield || 'N/A'} {selectedRecipe.yieldUnit}
                            </p>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isLoading ? 'Scheduling...' : 'Schedule Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleRecipeModal;
