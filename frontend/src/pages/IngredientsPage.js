import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchIngredients();
  }, [currentPage, searchTerm, selectedCategory]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
            const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        category: selectedCategory
      });

      const response = await fetch(`http://localhost:5000/api/ingredients?${params}`);
      const data = await response.json();
      
      setIngredients(data.ingredients || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'moisturizing', name: 'Moisturizing' },
    { id: 'anti-aging', name: 'Anti-Aging' },
    { id: 'cleansing', name: 'Cleansing' },
    { id: 'exfoliating', name: 'Exfoliating' },
    { id: 'soothing', name: 'Soothing' },
    { id: 'brightening', name: 'Brightening' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Skincare Ingredients Database
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the science behind skincare. Learn about ingredients, their benefits, 
            and how they work for different skin types and concerns.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search ingredients (e.g., hyaluronic acid, niacinamide...)"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ingredients...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Found {ingredients.length} ingredients
                {searchTerm && ` for "${searchTerm}"`}
              </p>
            </div>

            {/* Ingredients Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              {ingredients.map((ingredient, index) => (
                <motion.div
                  key={ingredient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {ingredient.name}
                    </h3>
                    
                    {ingredient.is_key_ingredient && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mb-2">
                        Key Ingredient
                      </span>
                    )}
                  </div>

                  {ingredient.what_it_does && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {ingredient.what_it_does}
                    </p>
                  )}

                  {ingredient.benefit && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">Benefits:</h4>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {ingredient.benefit}
                      </p>
                    </div>
                  )}

                  {/* Properties */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {ingredient.alcohol_free && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Alcohol Free
                      </span>
                    )}
                    {ingredient.fragrance_free && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Fragrance Free
                      </span>
                    )}
                    {ingredient.pregnancy_safe && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        Pregnancy Safe
                      </span>
                    )}
                  </div>

                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Learn More
                  </button>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex justify-center"
              >
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const pageNum = Math.max(1, currentPage - 2) + index;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </motion.div>
            )}

            {/* No Results */}
            {ingredients.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No ingredients found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms or category filter.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setCurrentPage(1);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default IngredientsPage;