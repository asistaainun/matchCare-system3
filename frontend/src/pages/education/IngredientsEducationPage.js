import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const IngredientsEducationPage = () => {
  const [educationData, setEducationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngredientsEducation();
  }, []);

  const fetchIngredientsEducation = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/education/ingredients-education');
      const data = await response.json();
      
      if (data.success) {
        setEducationData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch ingredients education:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ingredients education...</p>
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
            <span className="text-gray-900">Ingredients Education</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Understanding Skincare Ingredients</h1>
          <p className="text-xl text-gray-600 max-w-3xl">{educationData.overview}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Categories */}
        {Object.entries(educationData.categories).map(([categoryKey, category], index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 capitalize">
              {categoryKey.replace('_', ' ')}
            </h2>
            <p className="text-gray-600 mb-6">{category.description}</p>

            <div className="space-y-6">
              {category.ingredients.map((ingredient, ingredientIndex) => (
                <div key={ingredientIndex} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{ingredient.name}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">What it does:</h4>
                      <p className="text-gray-700 mb-4">{ingredient.what_it_does}</p>

                      <h4 className="font-semibold text-gray-900 mb-2">Benefits:</h4>
                      <ul className="space-y-1">
                        {ingredient.benefits.map((benefit, bIndex) => (
                          <li key={bIndex} className="text-gray-700">• {benefit}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Best for:</h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {ingredient.best_for.map((skinType, stIndex) => (
                          <span key={stIndex} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            {skinType}
                          </span>
                        ))}
                      </div>

                      <h4 className="font-semibold text-gray-900 mb-2">Usage Tips:</h4>
                      <ul className="space-y-1">
                        {ingredient.usage_tips.map((tip, tIndex) => (
                          <li key={tIndex} className="text-gray-700 text-sm">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IngredientsEducationPage;