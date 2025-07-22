// src/components/Quiz/SkinTypeAssessment.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const SkinTypeAssessment = ({ onComplete }) => {
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const questions = [
    {
      id: 'morning_feeling',
      question: 'How does your skin feel when you wake up in the morning?',
      options: [
        { value: 'tight_dry', label: 'Tight, dry, maybe flaky', points: { dry: 3, normal: 0, oily: 0, combination: 0 } },
        { value: 'normal_balanced', label: 'Normal, comfortable, balanced', points: { dry: 0, normal: 3, oily: 0, combination: 1 } },
        { value: 'oily_shiny', label: 'Oily or shiny, especially on forehead, nose, and chin', points: { dry: 0, normal: 0, oily: 3, combination: 1 } },
        { value: 'combination', label: 'Dry or normal on cheeks, oily in T-zone', points: { dry: 0, normal: 0, oily: 0, combination: 3 } }
      ]
    },
    {
      id: 'after_washing',
      question: 'How does your skin feel a few hours after washing your face?',
      options: [
        { value: 'tight_rough', label: 'Tight or rough, sometimes flaky', points: { dry: 3, normal: 0, oily: 0, combination: 0 } },
        { value: 'balanced', label: 'Balanced, neither oily nor dry', points: { dry: 0, normal: 3, oily: 0, combination: 1 } },
        { value: 'oily_tzone', label: 'Oily and shiny, especially in the T-zone', points: { dry: 0, normal: 0, oily: 3, combination: 1 } },
        { value: 'oily_tzone_dry_cheeks', label: 'Oily in T-zone, dry or normal on other areas', points: { dry: 0, normal: 0, oily: 1, combination: 3 } }
      ]
    },
    {
      id: 'oily_shine',
      question: 'How often do you get oily shine during the day?',
      options: [
        { value: 'rarely_dry', label: 'Rarely, skin feels dry', points: { dry: 3, normal: 1, oily: 0, combination: 0 } },
        { value: 'rarely_balanced', label: 'Rarely, skin looks balanced', points: { dry: 0, normal: 3, oily: 0, combination: 1 } },
        { value: 'often_shiny', label: 'Often, skin looks shiny or greasy', points: { dry: 0, normal: 0, oily: 3, combination: 1 } },
        { value: 'tzone_only', label: 'Only in some areas, mostly T-zone', points: { dry: 0, normal: 0, oily: 1, combination: 3 } }
      ]
    },
    {
      id: 'flaky_patches',
      question: 'Do you experience flaky or rough patches?',
      options: [
        { value: 'yes_frequently', label: 'Yes, frequently', points: { dry: 3, normal: 0, oily: 0, combination: 1 } },
        { value: 'rarely', label: 'Rarely', points: { dry: 1, normal: 3, oily: 1, combination: 1 } },
        { value: 'almost_never', label: 'Almost never', points: { dry: 0, normal: 1, oily: 3, combination: 1 } },
        { value: 'sometimes_cheeks', label: 'Sometimes on cheeks only', points: { dry: 1, normal: 0, oily: 0, combination: 3 } }
      ]
    }
  ];

  const handleAnswer = (option) => {
    const newResponses = { ...responses, [questions[currentQuestion].id]: option };
    setResponses(newResponses);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate skin type
      const skinType = calculateSkinType(newResponses);
      onComplete(skinType);
    }
  };

  const calculateSkinType = (responses) => {
    const scores = { dry: 0, normal: 0, oily: 0, combination: 0 };
    
    // Calculate scores based on responses
    Object.values(responses).forEach(option => {
      Object.entries(option.points).forEach(([skinType, points]) => {
        scores[skinType] += points;
      });
    });
    
    // Find the skin type with highest score
    const maxScore = Math.max(...Object.values(scores));
    const determinedType = Object.keys(scores).find(type => scores[type] === maxScore);
    
    // Handle ties (default to combination if close scores)
    const sortedScores = Object.entries(scores).sort(([,a], [,b]) => b - a);
    if (sortedScores[0][1] - sortedScores[1][1] <= 1) {
      // Close scores, likely combination
      return 'combination';
    }
    
    return determinedType || 'normal';
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Skin Type Assessment</h2>
          <span className="text-sm text-gray-600">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div 
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <motion.div 
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center mb-8"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQ.question}
        </h3>
        
        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <motion.button
              key={option.value}
              onClick={() => handleAnswer(option)}
              className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-gray-400 group-hover:border-blue-500 mr-3 flex-shrink-0"></div>
                <span className="text-gray-700 group-hover:text-gray-900">
                  {option.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={goBack}
          disabled={currentQuestion === 0}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            currentQuestion === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div className="text-center text-sm text-gray-500">
          <p>Answer honestly for the most accurate results</p>
        </div>

        <div className="w-20"></div> {/* Spacer for layout balance */}
      </div>
    </div>
  );
};

export default SkinTypeAssessment;