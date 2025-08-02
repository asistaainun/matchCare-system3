// src/components/Products/ProductCard.js - ENHANCED FOR ONTOLOGY
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ 
  product, 
  showOntologyFeatures = false,
  onAddToFavorites,
  onAnalyzeIngredients,
  className = ""
}) => {
  const [imageError, setImageError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Extract ontology-specific data
  const isOntologyRecommendation = showOntologyFeatures && product.ontology_mapped;
  const confidenceBadge = product.ui_enhancements?.confidence_badge;
  const semanticIngredients = product.matched_semantic_ingredients || [];
  const safetyStatus = product.semantic_safety_analysis?.overall_safety_status;
  const ontologyScore = product.final_ontology_score;

  // Fallback image
  const productImage = imageError || !product.local_image_path 
    ? '/images/placeholder-product.jpg' 
    : `http://localhost:5000/${product.local_image_path}`;

  const handleImageError = () => {
    setImageError(true);
  };

  const getConfidenceBadgeStyle = (badge) => {
    if (!badge) return '';
    
    const styles = {
      high: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-orange-100 text-orange-800 border-orange-200',
      very_low: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return styles[badge.level] || styles.low;
  };

  const getSafetyBadgeStyle = (status) => {
    const styles = {
      safe: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      conflict: 'bg-red-100 text-red-700',
      unknown: 'bg-gray-100 text-gray-700'
    };
    
    return styles[status] || styles.unknown;
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${className}`}>
      {/* Image Section */}
      <div className="relative">
        <img
          src={productImage}
          alt={product.name}
          onError={handleImageError}
          className="w-full h-48 object-cover"
        />
        
        {/* Ontology Confidence Badge */}
        {isOntologyRecommendation && confidenceBadge && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceBadgeStyle(confidenceBadge)}`}>
            {confidenceBadge.text}
          </div>
        )}
        
        {/* Ontology Score */}
        {isOntologyRecommendation && ontologyScore && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
            {ontologyScore}%
          </div>
        )}

        {/* Safety Status */}
        {isOntologyRecommendation && safetyStatus && (
          <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getSafetyBadgeStyle(safetyStatus)}`}>
            {safetyStatus === 'safe' ? '✓ Safe' : safetyStatus}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={() => onAddToFavorites?.(product)}
          className="absolute bottom-2 left-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200"
          aria-label="Add to favorites"
        >
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Brand & Category */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm text-gray-500 font-medium">{product.brand_name}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {product.main_category}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Price */}
        {product.price && (
          <div className="text-lg font-bold text-blue-600 mb-2">
            {formatPrice(product.price)}
          </div>
        )}

        {/* Ontology Features */}
        {isOntologyRecommendation && (
          <div className="space-y-2 mb-3">
            {/* Why Recommended */}
            {product.ui_enhancements?.why_recommended && (
              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                <span className="font-medium text-blue-700">Why recommended: </span>
                {product.ui_enhancements.why_recommended}
              </div>
            )}

            {/* Semantic Ingredients */}
            {semanticIngredients.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {semanticIngredients.slice(0, 2).map((ingredient, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    title={ingredient.explanation}
                  >
                    {ingredient.name}
                  </span>
                ))}
                {semanticIngredients.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{semanticIngredients.length - 2} more
                  </span>
                )}
              </div>
            )}

            {/* Ontology Explanation */}
            {product.ontology_explanation && (
              <div className="text-xs text-gray-600 italic">
                {product.ontology_explanation}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description || 'No description available.'}
        </p>

        {/* Product Features */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.alcohol_free && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Alcohol Free</span>
          )}
          {product.fragrance_free && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Fragrance Free</span>
          )}
          {product.paraben_free && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Paraben Free</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            to={`/products/${product.id}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
          >
            View Details
          </Link>
          
          {isOntologyRecommendation && onAnalyzeIngredients && (
            <button
              onClick={() => onAnalyzeIngredients(product)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors duration-200"
              title="Analyze ingredients"
            >
              🔬
            </button>
          )}
        </div>

        {/* Expandable Details */}
        {isOntologyRecommendation && (
          <div className="mt-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showDetails ? 'Hide' : 'Show'} Ontology Details
            </button>
            
            {showDetails && (
              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Semantic Score:</span> {product.semantic_match_score || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Safety Score:</span> {product.safety_compatibility_score || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Mapping Quality:</span> {product.mapping_quality_score || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Algorithm:</span> {product.reasoning_method || 'N/A'}
                  </div>
                </div>
                
                {product.academic_reasoning && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="font-medium">Academic Analysis:</span>
                    <div className="text-xs text-gray-600 mt-1">
                      SPARQL-based: {product.academic_reasoning.sparql_based ? 'Yes' : 'No'} • 
                      Knowledge Graph: {product.academic_reasoning.knowledge_graph_utilization ? 'Yes' : 'No'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;