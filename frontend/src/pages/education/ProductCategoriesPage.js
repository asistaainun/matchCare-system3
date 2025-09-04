import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ProductCategoriesPage = () => {
  const [educationData, setEducationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoriesEducation();
  }, []);

  const fetchCategoriesEducation = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/education/product-categories');
      const data = await response.json();
      
      if (data.success) {
        setEducationData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories education:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product categories education...</p>
        </div>
      </div>
    );
  }

  if (!educationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Content Not Available</h1>
          <Link to="/" className="text-blue-600 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>›</span>
            <span className="text-gray-900">Product Categories</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Understanding Product Categories</h1>
          <p className="text-xl text-gray-600 max-w-3xl">{educationData.overview}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main Categories */}
        <div className="space-y-8">
          {educationData.main_categories.map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{category.category}</h2>
              <p className="text-gray-600 mb-6">{category.purpose}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {category.types.map((type, typeIndex) => (
                  <div key={typeIndex} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{type.type}</h3>
                    <p className="text-gray-700 text-sm mb-3">{type.description}</p>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-900 text-sm">Best for: </span>
                        <span className="text-gray-700 text-sm">{type.best_for.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductCategoriesPage;