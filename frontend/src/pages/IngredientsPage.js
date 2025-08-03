// frontend/src/pages/IngredientsPage.js
// COMPLETE INGREDIENTS PAGE with Ontology Integration

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const IngredientsPage = () => {
  // State management
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Categories for filtering
  const categories = [
    { key: 'all', label: 'All Ingredients', icon: '🔬' },
    { key: 'exfoliant', label: 'Exfoliants', icon: '✨' },
    { key: 'humectant', label: 'Moisturizers', icon: '💧' },
    { key: 'antioxidant', label: 'Antioxidants', icon: '🛡️' },
    { key: 'uv filter', label: 'UV Filters', icon: '☀️' },
    { key: 'emollient', label: 'Emollients', icon: '🌿' }
  ];

  // Load ingredients on component mount
  useEffect(() => {
    loadIngredients();
  }, []);

  // Load ingredients from ontology
  const loadIngredients = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Loading ingredients from ontology...');
      
      const response = await fetch('http://localhost:3001/api/ingredients?limit=100');
      const data = await response.json();

      if (data.success) {
        console.log(`✅ Loaded ${data.data.length} ingredients from ontology`);
        setIngredients(data.data);
      } else {
        throw new Error(data.message || 'Failed to load ingredients');
      }

    } catch (error) {
      console.error('❌ Ingredients loading error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Search ingredients
  const handleSearch = async (searchValue) => {
    setSearchTerm(searchValue);

    if (searchValue.trim().length < 2) {
      loadIngredients();
      return;
    }

    setLoading(true);
    try {
      console.log(`🔍 Searching ingredients: "${searchValue}"`);
      
      const response = await fetch(`http://localhost:3001/api/ingredients/search?q=${encodeURIComponent(searchValue)}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setIngredients(data.data);
        console.log(`✅ Found ${data.data.length} ingredients matching "${searchValue}"`);
      }

    } catch (error) {
      console.error('❌ Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter ingredients by category
  const filteredIngredients = ingredients.filter(ingredient => {
    if (selectedCategory === 'all') return true;
    
    const function_ = ingredient.function?.toLowerCase() || '';
    const whatItDoes = ingredient.whatItDoes?.toLowerCase() || '';
    
    return function_.includes(selectedCategory) || whatItDoes.includes(selectedCategory);
  });

  // Show ingredient details modal
  const showIngredientDetails = async (ingredient) => {
    setSelectedIngredient(ingredient);
    
    // Load products containing this ingredient
    try {
      console.log(`🔍 Finding products with ingredient: ${ingredient.name}`);
      
      const response = await fetch(`http://localhost:3001/api/products?search=${encodeURIComponent(ingredient.name)}&limit=6`);
      const data = await response.json();

      if (data.success) {
        setRelatedProducts(data.data);
        console.log(`✅ Found ${data.data.length} products with ${ingredient.name}`);
      }

    } catch (error) {
      console.error('❌ Related products error:', error);
      setRelatedProducts([]);
    }
  };

  // Close ingredient details modal
  const closeIngredientDetails = () => {
    setSelectedIngredient(null);
    setRelatedProducts([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Skincare Ingredients Guide
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn about key ingredients and what they do for your skin. 
            Our ontology-powered database provides detailed analysis of each ingredient's benefits and functions.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xl">🔍</span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span>{category.icon}</span>
                <span className="font-medium">{category.label}</span>
              </button>
            ))}
          </div>

          {/* Results Info */}
          <div className="mt-4 text-center text-gray-600">
            Showing {filteredIngredients.length} ingredients
            {searchTerm && ` for "${searchTerm}"`}
            {selectedCategory !== 'all' && ` in ${categories.find(c => c.key === selectedCategory)?.label}`}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ingredients from ontology...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Ingredients</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadIngredients}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Ingredients Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIngredients.map((ingredient, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => showIngredientDetails(ingredient)}
              >
                <div className="p-6">
                  {/* Ingredient Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {ingredient.name}
                  </h3>

                  {/* Function Badge */}
                  {ingredient.function && (
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {ingredient.function}
                      </span>
                    </div>
                  )}

                  {/* Benefit */}
                  {ingredient.benefit && (
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      <strong>Benefit:</strong> {ingredient.benefit}
                    </p>
                  )}

                  {/* What It Does */}
                  {ingredient.whatItDoes && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      <strong>Function:</strong> {ingredient.whatItDoes}
                    </p>
                  )}

                  {/* Learn More Button */}
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredIngredients.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ingredients Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? `No ingredients found matching "${searchTerm}"`
                : `No ingredients found in ${categories.find(c => c.key === selectedCategory)?.label}`
              }
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                loadIngredients();
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show All Ingredients
            </button>
          </div>
        )}
      </div>

      {/* Ingredient Detail Modal */}
      {selectedIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedIngredient.name}</h2>
                {selectedIngredient.function && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {selectedIngredient.function}
                  </span>
                )}
              </div>
              <button
                onClick={closeIngredientDetails}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* What It Does */}
              {selectedIngredient.whatItDoes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">What It Does</h3>
                  <p className="text-gray-700">{selectedIngredient.whatItDoes}</p>
                </div>
              )}

              {/* Benefits */}
              {selectedIngredient.benefit && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                  <p className="text-gray-700">{selectedIngredient.benefit}</p>
                </div>
              )}

              {/* Detailed Explanation */}
              {selectedIngredient.explanation && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Detailed Information</h3>
                  <p className="text-gray-700">{selectedIngredient.explanation}</p>
                </div>
              )}

              {/* Safety Information */}
              {selectedIngredient.safety && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-yellow-800">Safety Information</h3>
                  <p className="text-yellow-700">{selectedIngredient.safety}</p>
                </div>
              )}

              {/* Alternative Names */}
              {selectedIngredient.alternativeNames && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Also Known As</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIngredient.alternativeNames.split(',').map((name, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {name.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Products with this ingredient */}
              {relatedProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Products Containing {selectedIngredient.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedProducts.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        onClick={closeIngredientDetails}
                        className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-video bg-gray-100">
                          <img
                            src={product.local_image_path || '/images/placeholder-product.jpg'}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = '/images/placeholder-product.jpg';
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-gray-500 mb-1">{product.brand_name}</p>
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <button className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors">
                  Mark as Liked ♡
                </button>
                <button className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors">
                  Mark as Avoided ⚠️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsPage;