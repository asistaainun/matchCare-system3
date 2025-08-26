import React from 'react';

const WarningDisplay = ({ warnings = [] }) => {
  if (warnings.length === 0) {
    return (
      <div className="flex items-center text-green-600 text-sm mt-2">
        <span className="mr-1">✅</span>
        No safety concerns
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      {warnings.slice(0, 2).map((warning, index) => (
        <div
          key={index}
          className={`px-3 py-2 rounded-md text-sm border ${
            warning.severity >= 5 ? 'bg-red-50 border-red-200 text-red-800' :
            warning.severity >= 4 ? 'bg-orange-50 border-orange-200 text-orange-800' :
            'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <div className="font-medium">{warning.message}</div>
          {warning.explanation && (
            <div className="text-xs mt-1 opacity-75">
              {warning.explanation.substring(0, 80)}...
            </div>
          )}
        </div>
      ))}
      {warnings.length > 2 && (
        <div className="text-xs text-gray-500 mt-1">
          +{warnings.length - 2} more warnings
        </div>
      )}
    </div>
  );
};

export default WarningDisplay;