// src/components/Quiz/QuizResults.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../../context/QuizContext';

const QuizResults = ({ onStartOver, onContinueBrowsing }) => {
  const { 
    skinType, 
    concerns, 
    sensitivities, 
    recommendations, 
    quizId 
  } = useQuiz();
  
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const ProductCard = ({ product, index }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      >
        {/* Product Image Placeholder */}
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">{product.main_category}</p>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
              {product.name}
            </h3>
            <button className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-2">
            {product.brand_name}
          </p>

          <div className="flex items-center space-x-2 mb-3">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {product.main_category}
            </span>
            {product.subcategory && (
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                {product.subcategory}
              </span>
            )}
          </div>

          {/* Product Features */}
          <div className="flex flex-wrap gap-1 mb-3">
            {product.alcohol_free && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Alcohol-free
              </span>
            )}
            {product.fragrance_free && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Fragrance-free
              </span>
            )}
            {product.paraben_free && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Paraben-free
              </span>
            )}
          </div>

          {/* Match Score */}
          {product.match_score && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Match Score</span>
                <span className="font-semibold text-green-600">
                  {Math.round(product.match_score * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${product.match_score * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 text-sm line-clamp-3">
              {product.description}
            </p>
          )}

          {/* View Details Button */}
          <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            View Details
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Personalized Recommendations
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Based on your quiz results, we've found {recommendations.length} products 
              that match your {skinType} skin type and preferences.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quiz Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Skin Type */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Skin Type</h3>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span className="capitalize text-gray-700">{skinType}</span>
              </div>
            </div>

            {/* Concerns */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Concerns ({concerns.length})
              </h3>
              <div className="space-y-1">
                {concerns.length > 0 ? (
                  concerns.slice(0, 3).map((concern) => (
                    <div key={concern} className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span className="capitalize text-gray-700 text-sm">
                        {concern.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No specific concerns</span>
                )}
                {concerns.length > 3 && (
                  <span className="text-gray-500 text-sm">
                    +{concerns.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Sensitivities */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Preferences</h3>
              <div className="space-y-1">
                {sensitivities.length > 0 ? (
                  sensitivities.map((sensitivity) => (
                    <div key={sensitivity} className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      <span className="capitalize text-gray-700 text-sm">
                        {sensitivity.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No restrictions</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onStartOver}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retake Quiz</span>
            </button>
            <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share Results</span>
            </button>
          </div>
        </motion.div>

        {/* View Controls */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Recommended Products ({recommendations.length})
            </h2>
            <p className="text-gray-600 text-sm">
              Sorted by best match for your profile
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <button
              onClick={onContinueBrowsing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Products
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {recommendations.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {recommendations.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20.4a7.962 7.962 0 01-5.657-2.109l1.414-1.414a6 6 0 008.486 0l1.414 1.414z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No recommendations found
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't find products matching your specific criteria.
            </p>
            <button
              onClick={onContinueBrowsing}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResults;