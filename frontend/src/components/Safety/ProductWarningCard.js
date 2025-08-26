import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const ProductWarningCard = ({ product }) => {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWarnings = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/warnings/product/${product.id}`);
        setWarnings(response.data.warnings || []);
      } catch (error) {
        console.error('Error fetching warnings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWarnings();
  }, [product.id]);

  const getSeverityColor = (severity) => {
    if (severity >= 5) return 'bg-red-100 border-red-300 text-red-800';
    if (severity >= 4) return 'bg-orange-100 border-orange-300 text-orange-800';
    return 'bg-yellow-100 border-yellow-300 text-yellow-800';
  };

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      whileHover={{ y: -2 }}
    >
      <img 
        src={product.image_url || '/images/placeholder-product.jpg'} 
        alt={product.name}
        className="w-full h-48 object-cover"
      />
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{product.brand}</p>
        
        {/* Warning Section */}
        <div className="mb-4">
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
          ) : warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.slice(0, 2).map((warning, index) => (
                <div 
                  key={index}
                  className={`px-3 py-2 rounded-md border text-sm ${getSeverityColor(warning.severity)}`}
                >
                  <div className="font-medium">{warning.message}</div>
                  {warning.explanation && (
                    <div className="text-xs mt-1 opacity-75">
                      {warning.explanation.substring(0, 100)}...
                    </div>
                  )}
                </div>
              ))}
              {warnings.length > 2 && (
                <div className="text-sm text-gray-500">
                  +{warnings.length - 2} more warnings
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center text-green-600 text-sm">
              <span className="mr-1">✅</span>
              No safety concerns detected
            </div>
          )}
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
          View Details
        </button>
      </div>
    </motion.div>
  );
};

export default ProductWarningCard;