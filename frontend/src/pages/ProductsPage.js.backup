// src/pages/ProductsPage.js - Enhanced example
import React, { useState, useEffect } from 'react';
import ProductCard from '../components/Products/ProductCard';
import recommendationService from '../services/RecommendationService';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useOntology, setUseOntology] = useState(false);

  const loadOntologyRecommendations = async () => {
    setLoading(true);
    try {
      const result = await recommendationService.getPersonalizedRecommendations({
        skin_type: 'oily',
        concerns: ['acne'],
        sensitivities: []
      });
      
      setProducts(result.recommendations);
      console.log('🧠 Loaded ontology recommendations:', result);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <button
          onClick={loadOntologyRecommendations}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🧠 Load Ontology Recommendations
        </button>
      </div>

      {loading && <div className="text-center py-8">Loading ontology recommendations...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showOntologyFeatures={true}
            onAddToFavorites={(product) => console.log('Add to favorites:', product)}
            onAnalyzeIngredients={(product) => console.log('Analyze:', product)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;