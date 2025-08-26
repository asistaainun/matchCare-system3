import React from 'react';

const RoutinePlanner = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Routine Safety Analyzer
          </h1>
          <p className="text-gray-600 mb-6">
            Analyze your skincare routine for potential ingredient conflicts.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              🚧 Under development - Advanced routine analysis coming soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutinePlanner;