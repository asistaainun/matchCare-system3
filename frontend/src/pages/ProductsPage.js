// frontend/src/pages/ProductsPage.js
// INTEGRATED PRODUCTS PAGE WITH AUTOMATIC RECOMMENDATIONS

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Quiz results from URL parameters
  const [quizResults, setQuizResults] = useState(null);
  const [isQuizBased, setIsQuizBased] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    skin_type: '',
    concerns: [],
    price_range: '',
    sort: 'relevance'
  });

  const productsPerPage = 12;

  // Parse URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    
    // Check if this is from quiz results
    const skinType = urlParams.get('skin_type');
    const concerns = urlParams.get('concerns');
    const sensitivities = urlParams.get('sensitivities');
    const quizCompleted = urlParams.get('quiz_completed');
    const ontology = urlParams.get('ontology');
    
    if (quizCompleted && skinType) {
      setIsQuizBased(true);
      setQuizResults({
        skin_type: skinType,
        concerns: concerns ? concerns.split(',') : [],
        sensitivities: sensitivities ? sensitivities.split(',') : [],
        ontology: ontology === 'true'
      });
      
      // Update filters based on quiz results
      setFilters(prev => ({
        ...prev,
        skin_type: skinType,
        concerns: concerns ? concerns.split(',') : []
      }));
    }
    
    // Load products based on current state
    loadProducts();
  }, [location.search]);

  // Load products from backend
  const loadProducts = async (page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const urlParams = new URLSearchParams(location.search);
      const queryParams = new URLSearchParams();
      
      // Add pagination
      queryParams.set('page', page.toString());
      queryParams.set('limit', productsPerPage.toString());
      
      // Add quiz parameters if available
      if (urlParams.get('skin_type')) {
        queryParams.set('skin_type', urlParams.get('skin_type'));
      }
      if (urlParams.get('concerns')) {
        queryParams.set('concerns', urlParams.get('concerns'));
      }
      if (urlParams.get('sensitivities')) {
        queryParams.set('sensitivities', urlParams.get('sensitivities'));
      }
      if (urlParams.get('ontology')) {
        queryParams.set('ontology', 'true');
      }
      
      // Add current filters
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.brand) queryParams.set('brand', filters.brand);
      if (filters.sort) queryParams.set('sort', filters.sort);
      
      console.log('🔍 Loading products with params:', queryParams.toString());
      
      const response = await fetch(`/api/products?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load products: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / productsPerPage));
        setCurrentPage(page);
        
        console.log(`✅ Loaded ${data.products?.length || 0} products`);
      } else {
        throw new Error(data.error || 'Failed to load products');
      }
      
    } catch (error) {
      console.error('❌ Products loading error:', error);
      setError(error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Update URL and reload products
    const urlParams = new URLSearchParams(location.search);
    
    if (value) {
      urlParams.set(key, value);
    } else {
      urlParams.delete(key);
    }
    
    navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });
  };

  // Handle page change
  const handlePageChange = (page) => {
    loadProducts(page);
  };

  // Take quiz button
  const goToQuiz = () => {
    navigate('/quiz');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isQuizBased ? 'Your Personalized Recommendations' : 'Skincare Products'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isQuizBased && quizResults ? (
                  <>
                    Based on your {quizResults.skin_type} skin 
                    {quizResults.concerns.length > 0 && ` and ${quizResults.concerns.join(', ')} concerns`}
                  </>
                ) : (
                  'Discover the perfect skincare products for your needs'
                )}
              </p>
            </div>
            
            {!isQuizBased && (
              <button
                onClick={goToQuiz}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Take Skin Quiz ✨
              </button>
            )}
          </div>
          
          {/* Quiz Results Summary */}
          {isQuizBased && quizResults && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-blue-900">Skin Type:</span>
                    <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-sm capitalize">
                      {quizResults.skin_type}
                    </span>
                  </div>
                  
                  {quizResults.concerns.length > 0 && (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-blue-900">Concerns:</span>
                      <div className="ml-2 flex space-x-1">
                        {quizResults.concerns.map(concern => (
                          <span key={concern} className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">
                            {concern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={goToQuiz}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Retake Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="cleanser">Cleanser</option>
              <option value="moisturizer">Moisturizer</option>
              <option value="serum">Serum</option>
              <option value="sunscreen">Sunscreen</option>
              <option value="treatment">Treatment</option>
              <option value="mask">Mask</option>
            </select>
            
            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Most Relevant</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isQuizBased ? 'Finding your perfect matches...' : 'Loading products...'}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <div className="text-red-600 mb-4">❌ Error loading products</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => loadProducts(currentPage)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Products Results */}
        {!loading && !error && (
          <>
            {/* Results Summary */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-gray-600">
                  Showing {products.length} of {totalProducts} products
                  {isQuizBased && ' personalized for you'}
                </p>
              </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    isRecommended={isQuizBased}
                    quizResults={quizResults}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-gray-400 mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">
                  Try adjusting your filters or take our quiz for personalized recommendations.
                </p>
                <button
                  onClick={goToQuiz}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Take Skin Quiz
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 border rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 py-2">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className={`px-4 py-2 border rounded-lg ${
                          currentPage === totalPages
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, isRecommended, quizResults }) => {
  const navigate = useNavigate();

  const goToProduct = () => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      {/* Product Image */}
      <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-100">
        <img
          src={product.image || '/images/placeholder-product.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = '/images/placeholder-product.jpg';
          }}
        />
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Recommendation Badge */}
        {isRecommended && (
          <div className="mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✨ Recommended for you
            </span>
          </div>
        )}

        {/* Brand & Category */}
        <div className="text-sm text-gray-500 mb-1">
          {product.brand} • {product.category}
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>

        {/* Match Score for Quiz Results */}
        {isRecommended && product.match_score && (
          <div className="mb-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-600">
                {product.match_score}% Match
              </span>
              <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${product.match_score}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Match Reasons */}
        {isRecommended && product.match_reasons && product.match_reasons.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600">
              {product.match_reasons[0]}
            </p>
          </div>
        )}

        {/* Key Features */}
        {product.formulation && (
          <div className="mb-3 flex flex-wrap gap-1">
            {product.formulation.alcohol_free && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Alcohol Free
              </span>
            )}
            {product.formulation.fragrance_free && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Fragrance Free
              </span>
            )}
            {product.formulation.paraben_free && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Paraben Free
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={goToProduct}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ProductsPage;