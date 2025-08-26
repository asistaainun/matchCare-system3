import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const RoutineAnalyzer = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeRoutine = async () => {
    if (selectedProducts.length < 2) {
      toast.error('Please select at least 2 products to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/warnings/routine', {
        productIds: selectedProducts.map(p => p.id)
      });
      
      setAnalysis(response.data);
      
      if (response.data.warningCount === 0) {
        toast.success('Your routine is safe to use together!');
      } else {
        toast.warning(`Found ${response.data.warningCount} potential conflicts`);
      }
    } catch (error) {
      console.error('Error analyzing routine:', error);
      toast.error('Failed to analyze routine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Routine Safety Analyzer
        </h2>
        <p className="text-gray-600 mb-8">
          Analyze your skincare products for potential ingredient conflicts and get safety recommendations.
        </p>

        {/* Product Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Selected Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {selectedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center p-3 border rounded-lg"
              >
                <img 
                  src={product.image_url || '/images/placeholder.jpg'}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.brand}</div>
                </div>
                <button
                  onClick={() => setSelectedProducts(prev => 
                    prev.filter(p => p.id !== product.id)
                  )}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>

          <button
            onClick={analyzeRoutine}
            disabled={loading || selectedProducts.length < 2}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Routine Safety'}
          </button>
        </div>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-4">Analysis Results</h3>
                
                {analysis.warnings.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center text-green-800">
                      <span className="text-2xl mr-3">✅</span>
                      <div>
                        <div className="font-medium">Routine is Safe!</div>
                        <div className="text-sm">No conflicts detected between your selected products.</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysis.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${
                          warning.severity >= 5 ? 'bg-red-50 border-red-300' :
                          warning.severity >= 4 ? 'bg-orange-50 border-orange-300' :
                          'bg-yellow-50 border-yellow-300'
                        }`}
                      >
                        <div className="flex items-start">
                          <span className="text-2xl mr-3">
                            {warning.severity >= 5 ? '🚨' : 
                             warning.severity >= 4 ? '⚠️' : 'ℹ️'}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-2">
                              {warning.details}
                            </div>
                            <div className="bg-white bg-opacity-70 rounded p-3 mb-3">
                              <div className="text-sm text-gray-800">
                                {warning.explanation}
                              </div>
                            </div>
                            <div className="bg-blue-50 rounded p-3">
                              <div className="text-sm font-medium text-blue-800">
                                💡 Recommendation:
                              </div>
                              <div className="text-sm text-blue-700">
                                {warning.recommendation}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoutineAnalyzer;