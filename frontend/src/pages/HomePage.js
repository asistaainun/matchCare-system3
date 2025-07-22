import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Find Your Perfect Skincare Match
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Want to know skincare that suits your skin type? Fill out your beauty profile here!
            Our AI-powered system analyzes ingredients and skin types to recommend the best products for you.
          </p>
          
          {/* CTA Button */}
          <Link
            to="/quiz"
            className="inline-block bg-blue-600 text-white text-lg px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started - Take Skin Quiz 🧪
          </Link>
          
          <div className="mt-8 text-gray-500">
            <p>✨ Free • 2 minutes • Personalized results</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How MatchCare Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our intelligent system uses ontology-based matching to analyze ingredients and find products perfect for your skin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧪</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Take Skin Quiz</h3>
              <p className="text-gray-600">
                Answer questions about your skin type, concerns, and sensitivities
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Our system analyzes thousands of products and ingredients to find your matches
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Recommendations</h3>
              <p className="text-gray-600">
                Receive personalized product suggestions with detailed explanations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Explore MatchCare
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Browse by Concern */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="font-semibold mb-2">Browse by Skin Concern</h3>
                <p className="text-gray-600 text-sm mb-4">Find products for acne, dryness, aging</p>
                <Link to="/products?filter=concerns" className="text-blue-600 hover:text-blue-700 font-medium">
                  Explore →
                </Link>
              </div>
            </div>

            {/* Browse by Category */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">📦</div>
                <h3 className="font-semibold mb-2">Product Categories</h3>
                <p className="text-gray-600 text-sm mb-4">Cleanser, moisturizer, serum, sunscreen</p>
                <Link to="/products?filter=category" className="text-blue-600 hover:text-blue-700 font-medium">
                  Browse →
                </Link>
              </div>
            </div>

            {/* Browse by Brand */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">🏷️</div>
                <h3 className="font-semibold mb-2">Shop by Brand</h3>
                <p className="text-gray-600 text-sm mb-4">CeraVe, The Ordinary, Cetaphil</p>
                <Link to="/products?filter=brand" className="text-blue-600 hover:text-blue-700 font-medium">
                  Shop →
                </Link>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">🌿</div>
                <h3 className="font-semibold mb-2">Learn Ingredients</h3>
                <p className="text-gray-600 text-sm mb-4">Understand what's in your products</p>
                <Link to="/ingredients" className="text-blue-600 hover:text-blue-700 font-medium">
                  Learn →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;