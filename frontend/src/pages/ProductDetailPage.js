// frontend/src/pages/ProductDetailPage.js
// COMPLETE PRODUCT DETAIL PAGE with Backend & Ontology Integration

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [product, setProduct] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [safetyAnalysis, setSafetyAnalysis] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [imageError, setImageError] = useState(false);

  // Load product data on mount
  useEffect(() => {
    if (id) {
      loadProductDetail();
    }
  }, [id]);

  // Load complete product information
  const loadProductDetail = async () => {
    setLoading(true);
    setError('');

    try {
      console.log(`🔍 Loading product detail for ID: ${id}`);
      
      // 1. Load basic product info
      const productResponse = await fetch(`http://localhost:3001/api/products/${id}`);
      
      if (!productResponse.ok) {
        throw new Error(`Product not found (${productResponse.status})`);
      }

      const productData = await productResponse.json();
      
      if (!productData.success) {
        throw new Error(productData.message || 'Failed to load product');
      }

      console.log('✅ Product loaded:', productData.data.name);
      setProduct(productData.data);

      // 2. Load ingredient analysis (ontology-based)
      if (productData.data.ingredient_list) {
        await loadIngredientAnalysis(productData.data.ingredient_list, productData.data.key_ingredients_csv);
      }

      // 3. Load similar products (ontology recommendations)
      await loadSimilarProducts(productData.data);

    } catch (error) {
      console.error('❌ Product detail error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load ingredient analysis using ontology
  const loadIngredientAnalysis = async (ingredientList, keyIngredients) => {
    try {
      console.log('🧪 Analyzing ingredients with ontology...');
      
      // Parse ingredients
      const allIngredients = ingredientList.split(',').map(ing => ing.trim());
      const keyIngredientsArray = keyIngredients ? keyIngredients.split(',').map(ing => ing.trim()) : [];

      // Get ontology analysis for key ingredients
      const ingredientAnalysis = [];
      
      for (const ingredient of keyIngredientsArray.slice(0, 5)) { // Limit to 5 key ingredients
        try {
          const response = await fetch(`http://localhost:3001/api/ingredients/search?q=${encodeURIComponent(ingredient)}&limit=1`);
          const data = await response.json();
          
          if (data.success && data.data.length > 0) {
            ingredientAnalysis.push({
              name: ingredient,
              isKey: true,
              ontologyData: data.data[0]
            });
          } else {
            ingredientAnalysis.push({
              name: ingredient,
              isKey: true,
              ontologyData: null
            });
          }
        } catch (err) {
          console.warn(`⚠️ Could not analyze ingredient: ${ingredient}`);
          ingredientAnalysis.push({
            name: ingredient,
            isKey: true,
            ontologyData: null
          });
        }
      }

      // Add regular ingredients
      allIngredients.forEach(ingredient => {
        if (!keyIngredientsArray.includes(ingredient)) {
          ingredientAnalysis.push({
            name: ingredient,
            isKey: false,
            ontologyData: null
          });
        }
      });

      setIngredients(ingredientAnalysis);
      console.log(`✅ Ingredient analysis complete: ${ingredientAnalysis.length} ingredients`);

      // Perform safety analysis
      await performSafetyAnalysis(ingredientAnalysis);

    } catch (error) {
      console.error('❌ Ingredient analysis error:', error);
    }
  };

  // Safety analysis based on ontology data
  const performSafetyAnalysis = async (ingredientAnalysis) => {
    try {
      const safetyFlags = [];
      let overallSafety = 'Safe';

      // Check each ingredient for safety concerns
      ingredientAnalysis.forEach(ingredient => {
        if (ingredient.ontologyData) {
          const { safety, function: ingredientFunction } = ingredient.ontologyData;
          
          // Safety warnings based on ontology data
          if (safety && safety.toLowerCase().includes('caution')) {
            safetyFlags.push({
              type: 'warning',
              ingredient: ingredient.name,
              message: `${ingredient.name} requires caution: ${safety}`
            });
            if (overallSafety === 'Safe') overallSafety = 'Caution Required';
          }

          // Function-based warnings
          if (ingredientFunction && ingredientFunction.toLowerCase().includes('exfoliant')) {
            safetyFlags.push({
              type: 'info',
              ingredient: ingredient.name,
              message: `${ingredient.name} is an exfoliant - start slowly and use sunscreen`
            });
          }
        }
      });

      // Product-level safety properties
      if (product) {
        const safetyProps = [];
        if (product.alcohol_free) safetyProps.push('Alcohol Free');
        if (product.fragrance_free) safetyProps.push('Fragrance Free');
        if (product.paraben_free) safetyProps.push('Paraben Free');
        if (product.sulfate_free) safetyProps.push('Sulfate Free');
        if (product.silicone_free) safetyProps.push('Silicone Free');

        setSafetyAnalysis({
          overallSafety,
          flags: safetyFlags,
          properties: safetyProps,
          analysis: `Based on ontology analysis of ${ingredientAnalysis.length} ingredients`
        });
      }

    } catch (error) {
      console.error('❌ Safety analysis error:', error);
    }
  };

  // Load similar products using ontology recommendations
  const loadSimilarProducts = async (currentProduct) => {
    try {
      console.log('🔍 Finding similar products...');
      
      // Use category and key ingredients for similarity
      const params = new URLSearchParams({
        category: currentProduct.main_category || '',
        limit: '4'
      });

      const response = await fetch(`http://localhost:3001/api/products?${params}`);
      const data = await response.json();

      if (data.success) {
        // Filter out current product and limit results
        const similar = data.data
          .filter(p => p.id !== currentProduct.id)
          .slice(0, 4);
        
        setSimilarProducts(similar);
        console.log(`✅ Found ${similar.length} similar products`);
      }

    } catch (error) {
      console.error('❌ Similar products error:', error);
    }
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  // Get image URL with fallback
  const getImageUrl = () => {
    if (!product) return '/images/placeholder-product.jpg';
    
    if (product.image_urls && !imageError) {
      return product.image_urls;
    }
    if (product.image_urls && !imageError) {
      const images = product.image_urls.split(',');
      return images[0]?.trim();
    }
    return '/images/placeholder-product.jpg';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Products
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <span>›</span>
          <Link to="/products" className="hover:text-blue-600">Products</Link>
          <span>›</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {imageError ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-400">
                      <span className="text-6xl mb-4 block">🧴</span>
                      <span>Product Image</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={getImageUrl()}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Brand & Category */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">{product.brand_name || 'Unknown Brand'}</span>
                {product.product_type && (
                  <>
                    <span className="mx-2">•</span>
                    <span>{product.product_type}</span>
                  </>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {product.main_category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {product.main_category}
                  </span>
                )}
                {product.subcategory && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    {product.subcategory}
                  </span>
                )}
              </div>

              {/* Product Properties */}
              {safetyAnalysis && safetyAnalysis.properties.length > 0 && (
                <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                  <h3 className="font-semibold text-green-800 mb-2">What's Inside (and What Isn't)</h3>
                  <div className="flex flex-wrap gap-2">
                    {safetyAnalysis.properties.map((prop, index) => (
                      <span key={index} className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm">
                        ✓ {prop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Analysis */}
              {safetyAnalysis && safetyAnalysis.flags.length > 0 && (
                <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
                  <h3 className="font-semibold text-yellow-800 mb-2">Safety Information</h3>
                  <div className="space-y-2">
                    {safetyAnalysis.flags.map((flag, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        <strong>{flag.type === 'warning' ? '⚠️' : 'ℹ️'}</strong> {flag.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                  Add to Favorites ♡
                </button>
                {product.product_url && (
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors text-center"
                  >
                    Visit Store 🛒
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { key: 'overview', label: 'Overview', icon: '📋' },
                { key: 'ingredients', label: 'Ingredients', icon: '🧪' },
                { key: 'usage', label: 'How to Use', icon: '📖' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Product Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {product.description || 'No description available for this product.'}
                  </p>
                </div>

                {product.suitable_for_skin_types && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Suitable For</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.suitable_for_skin_types.split(',').map((skinType, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {skinType.trim()} Skin
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.addresses_concerns && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Addresses Concerns</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.addresses_concerns.split(',').map((concern, index) => (
                        <span key={index} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                          {concern.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ingredients' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Key Ingredients 
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Analyzed with Ontology)
                    </span>
                  </h3>
                  
                  <div className="space-y-4">
                    {ingredients.filter(ing => ing.isKey).map((ingredient, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{ingredient.name}</h4>
                        
                        {ingredient.ontologyData ? (
                          <div className="space-y-2 text-sm">
                            {ingredient.ontologyData.function && (
                              <p><strong>Function:</strong> {ingredient.ontologyData.function}</p>
                            )}
                            {ingredient.ontologyData.benefit && (
                              <p><strong>Benefit:</strong> {ingredient.ontologyData.benefit}</p>
                            )}
                            {ingredient.ontologyData.explanation && (
                              <p><strong>Details:</strong> {ingredient.ontologyData.explanation}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            Key ingredient - ontology analysis pending
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Full Ingredient List</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-1">
                      {ingredients.map((ingredient, index) => (
                        <span
                          key={index}
                          className={`inline-block px-2 py-1 rounded text-xs ${
                            ingredient.isKey
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {ingredient.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">How to Use</h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.how_to_use || 'Usage instructions not available for this product.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Similar Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((similar) => (
                <Link
                  key={similar.id}
                  to={`/products/${similar.id}`}
                  className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={similar.image_urls || '/images/placeholder-product.jpg'}
                      alt={similar.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-product.jpg';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-1">{similar.brand_name}</p>
                    <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {similar.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;