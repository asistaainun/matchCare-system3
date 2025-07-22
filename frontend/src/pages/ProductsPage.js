import React from 'react';

const ProductsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Skincare Products
          </h1>
          <p className="text-gray-600 mb-8">
            Browse our curated collection of skincare products
          </p>
          
          <div className="bg-white p-12 rounded-xl shadow-sm">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Products Page Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              We're working on integrating the product catalog with your quiz results.
            </p>
            <a
              href="/quiz"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Take Skin Quiz Instead →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;