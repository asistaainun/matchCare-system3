// src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Find Your Perfect
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}Skincare Match
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover skincare products tailored to your unique skin type, concerns, and preferences. 
            Our AI-powered recommendations help you build the perfect routine.
          </p>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-12"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🧪</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Want to know skincare that suits your skin type?
                </h2>
                <p className="text-gray-600">
                  Fill out your beauty profile here!
                </p>
              </div>

              <Link
                to="/quiz"
                className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold py-4 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Get Started
              </Link>

              <p className="text-sm text-gray-500 mt-4">
                Takes only 2-3 minutes • Get personalized recommendations
              </p>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="grid md:grid-cols-3 gap-8 mb-16"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Matching</h3>
              <p className="text-gray-600">
                AI-powered algorithm matches products to your specific skin type and concerns
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingredient Analysis</h3>
              <p className="text-gray-600">
                Deep ingredient analysis to avoid allergens and find beneficial components
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Safety First</h3>
              <p className="text-gray-600">
                Curated products from trusted brands with safety and efficacy in mind
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Quick Browse Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="bg-white py-16"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Or Browse by Category
            </h2>
            <p className="text-gray-600">
              Explore our curated collection of skincare products
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Cleansers', icon: '🧼', count: '753 products' },
              { name: 'Moisturizers', icon: '💧', count: '786 products' },
              { name: 'Treatments', icon: '⚗️', count: '1218 products' },
              { name: 'Suncare', icon: '☀️', count: '471 products' },
            ].map((category) => (
              <Link
                key={category.name}
                to="/products"
                className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.count}</p>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">3,940</div>
              <div className="text-blue-200">Skincare Products</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">238</div>
              <div className="text-blue-200">Trusted Brands</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">14</div>
              <div className="text-blue-200">Skin Concerns</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">AI</div>
              <div className="text-blue-200">Powered Matching</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;