// src/components/Quiz/SkinConcernSelector.js
import React from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../../context/QuizContext';

const SkinConcernSelector = () => {
  const { referenceData, concerns, toggleConcern, skinType } = useQuiz();

  const concernDescriptions = {
    acne: "Breakouts, blackheads, whiteheads, and blemishes",
    wrinkles: "Deep lines and creases, signs of aging",
    fine_lines: "Early aging signs around eyes and mouth",
    sensitivity: "Easily irritated, reactive, or inflamed skin",
    dryness: "Lack of moisture, tight feeling, flaky patches",
    oiliness: "Excess sebum production, shiny appearance",
    redness: "Inflammation, visible capillaries, rosacea",
    pores: "Large or visible pores, rough texture",
    dullness: "Lack of radiance, uneven skin tone",
    texture: "Rough, bumpy, or uneven skin surface",
    dark_undereyes: "Dark circles, puffiness around eyes",
    fungal_acne: "Small bumps caused by yeast overgrowth",
    eczema: "Chronic inflammation, dry patches",
    dark_spots: "Hyperpigmentation, age spots, melasma"
  };

  const concernIcons = {
    acne: "🎯",
    wrinkles: "📏", 
    fine_lines: "🔍",
    sensitivity: "⚠️",
    dryness: "💧",
    oiliness: "✨",
    redness: "🔴",
    pores: "🕳️",
    dullness: "🌑",
    texture: "🪨",
    dark_undereyes: "👁️",
    fungal_acne: "🦠",
    eczema: "🩹",
    dark_spots: "⚫"
  };

  // Group concerns by priority for skin type
  const getPrioritizedConcerns = () => {
    const allConcerns = referenceData.skin_concerns || [];
    
    // Common concerns by skin type
    const skinTypePriority = {
      dry: ['dryness', 'sensitivity', 'fine_lines', 'wrinkles'],
      oily: ['oiliness', 'acne', 'pores', 'fungal_acne'],
      combination: ['oiliness', 'acne', 'dryness', 'pores'],
      normal: ['fine_lines', 'dullness', 'dark_spots'],
      sensitive: ['sensitivity', 'redness', 'eczema', 'dryness']
    };

    const priorityList = skinTypePriority[skinType] || [];
    const priorityConcerns = [];
    const otherConcerns = [];

    allConcerns.forEach(concern => {
      if (priorityList.includes(concern.name)) {
        priorityConcerns.push(concern);
      } else {
        otherConcerns.push(concern);
      }
    });

    // Sort priority concerns by their priority order
    priorityConcerns.sort((a, b) => {
      const aIndex = priorityList.indexOf(a.name);
      const bIndex = priorityList.indexOf(b.name);
      return aIndex - bIndex;
    });

    return { priorityConcerns, otherConcerns };
  };

  const { priorityConcerns, otherConcerns } = getPrioritizedConcerns();

  const handleConcernToggle = (concernName) => {
    toggleConcern(concernName);
  };

  const isConcernSelected = (concernName) => {
    return concerns.includes(concernName);
  };

  const ConcernCard = ({ concern, isPriority = false }) => {
    const isSelected = isConcernSelected(concern.name);
    
    return (
      <motion.button
        onClick={() => handleConcernToggle(concern.name)}
        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
          isSelected
            ? 'border-blue-600 bg-blue-50 shadow-md'
            : 'border-gray-300 hover:border-blue-300 hover:shadow-sm hover:bg-gray-50'
        } ${isPriority ? 'ring-2 ring-blue-200' : ''}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        layout
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xl">{concernIcons[concern.name] || '🎯'}</span>
              <h3 className="font-semibold text-gray-900 capitalize">
                {concern.name.replace('_', ' ')}
              </h3>
              {isPriority && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Common for {skinType} skin
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              {concernDescriptions[concern.name] || concern.description || ''}
            </p>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-3 flex-shrink-0 ${
            isSelected 
              ? 'border-blue-600 bg-blue-600' 
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What are your main skin concerns?
        </h2>
        <p className="text-gray-600">
          Select all concerns that apply to you. You can choose multiple options.
        </p>
        {skinType && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              Based on your <span className="font-semibold capitalize">{skinType}</span> skin type, 
              we've highlighted common concerns for you.
            </p>
          </div>
        )}
      </div>

      {/* Priority Concerns */}
      {priorityConcerns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⭐</span>
            Common for your skin type
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {priorityConcerns.map((concern) => (
              <ConcernCard key={concern.id} concern={concern} isPriority={true} />
            ))}
          </div>
        </div>
      )}

      {/* Other Concerns */}
      {otherConcerns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Other concerns
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {otherConcerns.map((concern) => (
              <ConcernCard key={concern.id} concern={concern} isPriority={false} />
            ))}
          </div>
        </div>
      )}

      {/* Selected Summary */}
      {concerns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <h4 className="font-semibold text-green-800 mb-2">
            Selected concerns ({concerns.length}):
          </h4>
          <div className="flex flex-wrap gap-2">
            {concerns.map((concern) => (
              <span
                key={concern}
                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {concernIcons[concern] || '🎯'} 
                <span className="ml-1 capitalize">{concern.replace('_', ' ')}</span>
                <button
                  onClick={() => handleConcernToggle(concern)}
                  className="ml-2 hover:text-green-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Skip Option */}
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          Don't have any specific concerns? That's perfectly fine! 
          You can continue without selecting any.
        </p>
      </div>
    </motion.div>
  );
};

export default SkinConcernSelector;
