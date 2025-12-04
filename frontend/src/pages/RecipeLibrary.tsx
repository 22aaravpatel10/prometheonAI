import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, FileText, Search, Filter, Beaker, Clock, ChevronRight } from 'lucide-react';
import RecipeIngestionModal from '../components/RecipeIngestionModal';
import Layout from '../components/Layout';

interface Recipe {
    id: number;
    name: string;
    product: string;
    version: number;
    status: string;
    updatedAt: string;
    _count?: {
        steps: number;
        ingredients: number;
    };
    createdBy?: {
        email: string;
    };
}

const RecipeLibrary: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRecipes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/recipes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecipes(response.data);
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, []);

    const filteredRecipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.product.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                            <Filter className="w-4 h-4" />
                            Filter
                        </button>
                        <button
                            onClick={() => setIsIngestModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Plus className="w-4 h-4" />
                            Import PDF
                        </button>
                    </div>
                </div>

                {/* Recipe Grid */}
                {isLoading ? (
                    <div className="text-center py-12 text-slate-400">Loading recipes...</div>
                ) : filteredRecipes.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No recipes found</h3>
                        <p className="text-slate-400 mb-6">Get started by importing a recipe from a PDF file.</p>
                        <button
                            onClick={() => setIsIngestModalOpen(true)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Import PDF
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecipes.map((recipe) => (
                            <div key={recipe.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-colors group cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Beaker className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${recipe.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                        recipe.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-slate-700 text-slate-400'
                                        }`}>
                                        {recipe.status.toUpperCase()}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                    {recipe.name}
                                </h3>
                                <p className="text-sm text-slate-400 mb-4">{recipe.product} • v{recipe.version}</p>

                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Updated {new Date(recipe.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                                    <div className="flex gap-4 text-xs text-slate-400">
                                        <span>{recipe._count?.steps || 0} Steps</span>
                                        <span>{recipe._count?.ingredients || 0} Ingredients</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <RecipeIngestionModal
                    isOpen={isIngestModalOpen}
                    onClose={() => setIsIngestModalOpen(false)}
                    onSuccess={() => {
                        fetchRecipes();
                        // Maybe show a toast notification here
                    }}
                />
            </div>
        </Layout>
    );
};

export default RecipeLibrary;
