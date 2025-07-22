import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Product not found');
      }
      const data = await response.json();
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/products"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
            <li><span>/</span></li>
            <li><Link to="/products" className="hover:text-blue-600">Products</Link></li>
            <li><span>/</span></li>
            <li className="text-gray-900">{product?.name}</li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                {product?.local_image_path ? (
                  <img
                    src={product.local_image_path}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🧴</div>
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}
              </div>
              
              {/* Product Badges */}
              <div className="flex flex-wrap gap-2">
                {product?.alcohol_free && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Alcohol Free
                  </span>
                )}
                {product?.fragrance_free && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Fragrance Free
                  </span>
                )}
                {product?.paraben_free && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                    Paraben Free
                  </span>
                )}
                {product?.sulfate_free && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    Sulfate Free
                  </span>
                )}
                {product?.silicone_free && (
                  <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                    Silicone Free
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product?.name}</h1>
                <p className="text-xl text-blue-600 font-semibold mb-4">{product?.brand_name}</p>
                
                <div className="flex items-center space-x-4 mb-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {product?.main_category}
                  </span>
                  {product?.subcategory && (
                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                      {product.subcategory}
                    </span>
                  )}
                </div>

                {product?.bpom_number && (
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-medium">BPOM:</span> {product.bpom_number}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-4 mb-8">
                <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Add to Routine
                </button>
                <button className="flex-1 border border-blue-600 text-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                  Save for Later
                </button>
              </div>

              {/* Skin Type Compatibility */}
              {product?.suitable_for_skin_types && product.suitable_for_skin_types.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Suitable for Skin Types:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.suitable_for_skin_types.map((skinType, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm capitalize"
                      >
                        {skinType}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Addresses Concerns */}
              {product?.addresses_concerns && product.addresses_concerns.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Addresses Concerns:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.addresses_concerns.map((concern, index) => (
                      <span
                        key={index}
                        className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm capitalize"
                      >
                        {concern.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-8">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'ingredients', label: 'Ingredients' },
                  { id: 'usage', label: 'How to Use' },
                  { id: 'details', label: 'Details' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Product Overview</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {product?.description || 'No description available for this product.'}
                  </p>
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Ingredient List</h3>
                  {product?.ingredient_list ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">
                        {product.ingredient_list}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No ingredient information available.</p>
                  )}
                </div>
              )}

              {activeTab === 'usage' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Use</h3>
                  {product?.how_to_use ? (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">
                        {product.how_to_use}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No usage instructions available.</p>
                  )}
                </div>
              )}

              {activeTab === 'details' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Product Details</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li><span className="font-medium">Brand:</span> {product?.brand_name}</li>
                        <li><span className="font-medium">Category:</span> {product?.main_category}</li>
                        {product?.subcategory && (
                          <li><span className="font-medium">Subcategory:</span> {product.subcategory}</li>
                        )}
                        {product?.product_type && (
                          <li><span className="font-medium">Type:</span> {product.product_type}</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Formulation</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>
                          <span className="font-medium">Alcohol Free:</span> 
                          <span className={product?.alcohol_free ? 'text-green-600' : 'text-red-600'}>
                            {product?.alcohol_free ? ' Yes' : ' No'}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium">Fragrance Free:</span> 
                          <span className={product?.fragrance_free ? 'text-green-600' : 'text-red-600'}>
                            {product?.fragrance_free ? ' Yes' : ' No'}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium">Paraben Free:</span> 
                          <span className={product?.paraben_free ? 'text-green-600' : 'text-red-600'}>
                            {product?.paraben_free ? ' Yes' : ' No'}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium">Sulfate Free:</span> 
                          <span className={product?.sulfate_free ? 'text-green-600' : 'text-red-600'}>
                            {product?.sulfate_free ? ' Yes' : ' No'}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium">Silicone Free:</span> 
                          <span className={product?.silicone_free ? 'text-green-600' : 'text-red-600'}>
                            {product?.silicone_free ? ' Yes' : ' No'}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Related Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-gray-500 text-center py-8">
              Related products will be shown here based on similar ingredients and category.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetailPage;