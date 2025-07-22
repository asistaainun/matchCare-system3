// src/components/Quiz/SensitivitySelector.js
import React from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../../context/QuizContext';

const SensitivitySelector = () => {
  const { referenceData, sensitivities, toggleSensitivity } = useQuiz();

  const sensitivityDescriptions = {
    fragrance: "Synthetic or natural fragrances in skincare products can cause irritation, redness, or allergic reactions",
    alcohol: "Denatured alcohol (SD alcohol, ethyl alcohol) can dry out and irritate sensitive skin", 
    paraben: "Preservatives that some people are allergic to, though generally considered safe",
    silicone: "Synthetic polymers that some people prefer to avoid for various reasons",
    sulfate: "Cleansing agents (SLS, SLES) that can be too harsh and stripping for sensitive skin",
    no_known_sensitivities: "You don't have any known ingredient sensitivities or allergies"
  };

  const sensitivityIcons = {
    fragrance: "🌸",
    alcohol: "🍶", 
    paraben: "🧪",
    silicone: "🔬",
    sulfate: "🧽",
    no_known_sensitivities: "✅"
  };

  const sensitivityImpacts = {
    fragrance: "Products will be filtered to show only fragrance-free options",
    alcohol: "Products will be filtered to show only alcohol-free formulations",
    paraben: "Products will be filtered to show only paraben-free alternatives", 
    silicone: "Products will be filtered to show only silicone-free options",
    sulfate: "Cleansers will be filtered to show only sulfate-free gentle options",
    no_known_sensitivities: "All products will be shown without ingredient restrictions"
  };

  // Filter out "no_known_sensitivities" if other sensitivities are selected
  const availableAllergens = referenceData.allergen_types || [];
  const hasOtherSensitivities = sensitivities.some(s => s !== 'no_known_sensitivities');

  const handleSensitivityToggle = (sensitivityName) => {
    // Special handling for "no known sensitivities"
    if (sensitivityName === 'no_known_sensitivities') {
      // If selecting "no known sensitivities", clear all others
      if (!sensitivities.includes('no_known_sensitivities')) {
        // Replace all sensitivities with just this one
        const { setSensitivities } = useQuiz();
        setSensitivities(['no_known_sensitivities']);
        return;
      }
    } else {
      // If selecting any other sensitivity, remove "no known sensitivities"
      if (sensitivities.includes('no_known_sensitivities')) {
        const { setSensitivities } = useQuiz();
        setSensitivities([sensitivityName]);
        return;
      }
    }
    
    toggleSensitivity(sensitivityName);
  };

  const isSensitivitySelected = (sensitivityName) => {
    return sensitivities.includes(sensitivityName);
  };

  const SensitivityCard = ({ allergen }) => {
    const isSelected = isSensitivitySelected(allergen.name);
    const isNoKnownSensitivities = allergen.name === 'no_known_sensitivities';
    
    return (
      <motion.button
        onClick={() => handleSensitivityToggle(allergen.name)}
        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
          isSelected
            ? isNoKnownSensitivities
              ? 'border-green-600 bg-green-50 shadow-md'
              : 'border-orange-600 bg-orange-50 shadow-md'
            : 'border-gray-300 hover:border-blue-300 hover:shadow-sm hover:bg-gray-50'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        layout
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">{sensitivityIcons[allergen.name] || '⚠️'}</span>
              <h3 className="font-semibold text-gray-900 capitalize">
                {allergen.name.replace('_', ' ')}
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              {sensitivityDescriptions[allergen.name] || allergen.description || ''}
            </p>
            <div className={`text-xs p-2 rounded ${
              isSelected 
                ? isNoKnownSensitivities
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              <strong>Impact:</strong> {sensitivityImpacts[allergen.name]}
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-3 flex-shrink-0 ${
            isSelected 
              ? isNoKnownSensitivities
                ? 'border-green-600 bg-green-600'
                : 'border-orange-600 bg-orange-600'
              : 'border-gray-300'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </motion.button>
    );
  };

  // Separate "no known sensitivities" from other options
  const noKnownSensitivities = availableAllergens.find(a => a.name === 'no_known_sensitivities');
  const otherAllergens = availableAllergens.filter(a => a.name !== 'no_known_sensitivities');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Do you have any known ingredient sensitivities?
        </h2>
        <p className="text-gray-600">
          Help us filter products to avoid ingredients that might irritate your skin.
        </p>
      </div>

      {/* No Known Sensitivities Option */}
      {noKnownSensitivities && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">✅</span>
            No sensitivities
          </h3>
          <SensitivityCard allergen={noKnownSensitivities} />
        </div>
      )}

      {/* Specific Sensitivities */}
      {otherAllergens.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⚠️</span>
            Common ingredient sensitivities
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {otherAllergens.map((allergen) => (
              <SensitivityCard key={allergen.id} allergen={allergen} />
            ))}
          </div>
        </div>
      )}

      {/* Selected Summary */}
      {sensitivities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 border rounded-lg ${
            sensitivities.includes('no_known_sensitivities')
              ? 'bg-green-50 border-green-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <h4 className={`font-semibold mb-2 ${
            sensitivities.includes('no_known_sensitivities')
              ? 'text-green-800'
              : 'text-orange-800'
          }`}>
            Your sensitivity profile:
          </h4>
          <div className="space-y-2">
            {sensitivities.map((sensitivity) => (
              <div key={sensitivity} className="flex items-center space-x-2">
                <span className="text-lg">{sensitivityIcons[sensitivity] || '⚠️'}</span>
                <span className={`text-sm ${
                  sensitivities.includes('no_known_sensitivities')
                    ? 'text-green-700'
                    : 'text-orange-700'
                }`}>
                  {sensitivity.replace('_', ' ').charAt(0).toUpperCase() + sensitivity.replace('_', ' ').slice(1)}
                </span>
                <button
                  onClick={() => handleSensitivityToggle(sensitivity)}
                  className={`hover:opacity-70 ${
                    sensitivities.includes('no_known_sensitivities')
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Good to know:</h4>
            <p className="text-blue-700 text-sm">
              These preferences will help us show you products that are more suitable for your skin. 
              You can always change these settings later or browse all products if you prefer.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SensitivitySelector;