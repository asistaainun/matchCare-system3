import React from 'react';
import { useParams } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Product Detail #{id}
          </h1>
          
          <div className="bg-white p-12 rounded-xl shadow-sm">
            <div className="text-6xl mb-4">🧴</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Product Details Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              Detailed product information with ingredient analysis will be available here.
            </p>
            <a
              href="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mr-4"
            >
              ← Back to Products
            </a>
            <a
              href="/quiz"
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
            >
              Take Quiz →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;