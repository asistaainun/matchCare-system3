import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const RoutineGuidePage = () => {
  const [routineData, setRoutineData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutineGuide();
  }, []);

  const fetchRoutineGuide = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/education/routine-guide');
      const data = await response.json();
      
      if (data.success) {
        setRoutineData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch routine guide:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading routine guide...</p>
        </div>
      </div>
    );
  }

  if (!routineData) {
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
            <span className="text-gray-900">Panduan Rutinitas</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Panduan Rutinitas Skincare</h1>
          <p className="text-xl text-gray-600 max-w-3xl">{routineData.overview}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Basic Routine Order */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Urutan Dasar Rutinitas</h2>
          <div className="space-y-6">
            {routineData.basic_routine_order.map((step, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {step.step}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{step.name}</h3>
                    <div className="flex items-center space-x-2">
                      {step.time.map((time, timeIndex) => (
                        <span key={timeIndex} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {time}
                        </span>
                      ))}
                      {step.optional && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          Optional
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{step.purpose}</p>
                  <div className="text-sm text-gray-600">
                    <strong>Tipe produk:</strong> {step.product_types.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutineGuidePage;