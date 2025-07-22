// src/components/Quiz/SkinTypeSelector.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuiz } from '../../context/QuizContext';
import SkinTypeAssessment from './SkinTypeAssessment';

const SkinTypeSelector = () => {
  const { referenceData, skinType, setSkinType } = useQuiz();
  const [showAssessment, setShowAssessment] = useState(false);

  const skinTypeDescriptions = {
    normal: "Balanced skin with moderate oil production and minimal sensitivity",
    dry: "Low oil production, may feel tight or flaky, needs extra moisture",
    oily: "High oil production, shiny appearance, prone to enlarged pores",
    combination: "Mixed - oily T-zone (forehead, nose, chin), normal/dry cheeks",
    sensitive: "Easily irritated, reactive to products, may experience redness"
  };

  const handleSkinTypeSelect = (selectedType) => {
    setSkinType(selectedType, 'self_selected');
  };

  const handleAssessmentComplete = (determinedType) => {
    setSkinType(determinedType, 'assessment');
    setShowAssessment(false);
  };

  if (showAssessment) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <button
            onClick={() => setShowAssessment(false)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to skin type selection
          </button>
        </div>
        <SkinTypeAssessment onComplete={handleAssessmentComplete} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What's your skin type?
        </h2>
        <p className="text-gray-600">
          Choose your skin type or take our quick assessment
        </p>
      </div>

      {/* Skin Type Options */}
      <div className="grid gap-4 max-w-2xl mx-auto">
        {referenceData.skin_types.map((type) => (
          <motion.button
            key={type.id}
            onClick={() => handleSkinTypeSelect(type.name)}
            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
              skinType === type.name
                ? 'border-blue-600 bg-blue-50 shadow-md'
                : 'border-gray-300 hover:border-blue-300 hover:shadow-sm'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg capitalize text-gray-900">
                  {type.name} Skin
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {skinTypeDescriptions[type.name] || type.description || ''}
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                skinType === type.name 
                  ? 'border-blue-600 bg-blue-600' 
                  : 'border-gray-300'
              }`}>
                {skinType === type.name && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </motion.button>
        ))}

        {/* Not Sure Option */}
        <motion.button
          onClick={() => setShowAssessment(true)}
          className="p-4 border-2 border-dashed border-gray-400 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-gray-700">
              I'm not sure - Take quick assessment
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Answer 4 simple questions to determine your skin type
          </p>
        </motion.button>
      </div>

      {/* Selected Skin Type Summary */}
      <AnimatePresence>
        {skinType && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-green-800">
                Selected: <span className="capitalize">{skinType} Skin</span>
              </span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              {skinTypeDescriptions[skinType]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SkinTypeSelector;