// src/components/Quiz/QuizProgress.js
import React from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../../context/QuizContext';

const QuizProgress = ({ onNext, onPrevious, onSubmit }) => {
  const { 
    currentStep, 
    totalSteps, 
    skinType, 
    concerns, 
    sensitivities,
    isLoading,
    canProceedToNext,
    canGoBack,
    isCurrentStepValid
  } = useQuiz();

  const steps = [
    { 
      number: 1, 
      title: "Skin Type", 
      description: "Determine your skin type",
      icon: "👤"
    },
    { 
      number: 2, 
      title: "Concerns", 
      description: "Select your skin concerns",
      icon: "🎯"
    },
    { 
      number: 3, 
      title: "Sensitivities", 
      description: "Choose ingredient preferences",
      icon: "⚠️"
    }
  ];

  const progress = (currentStep / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps;
  const canProceed = isCurrentStepValid();

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepData = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return skinType ? `${skinType.charAt(0).toUpperCase() + skinType.slice(1)} skin` : null;
      case 2:
        return concerns.length > 0 ? `${concerns.length} concern${concerns.length !== 1 ? 's' : ''}` : 'No specific concerns';
      case 3:
        return sensitivities.length > 0 
          ? sensitivities.includes('no_known_sensitivities') 
            ? 'No known sensitivities'
            : `${sensitivities.length} sensitivity${sensitivities.length !== 1 ? 'ies' : ''}`
          : null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-semibold text-gray-900">
              Beauty Profile Quiz
            </h1>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between items-start mb-6">
          {steps.map((step) => {
            const status = getStepStatus(step.number);
            const stepData = getStepData(step.number);
            
            return (
              <div key={step.number} className="flex-1 text-center">
                <div className="relative">
                  {/* Step Circle */}
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      status === 'completed'
                        ? 'bg-green-600 text-white'
                        : status === 'current'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                    initial={false}
                    animate={{
                      scale: status === 'current' ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {status === 'completed' ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold">{step.icon}</span>
                    )}
                  </motion.div>

                  {/* Connecting Line */}
                  {step.number < totalSteps && (
                    <div className="absolute top-5 left-1/2 w-full h-0.5 bg-gray-300 -z-10">
                      <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{
                          width: status === 'completed' ? '100%' : '0%'
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>

                {/* Step Info */}
                <div>
                  <h3 className={`text-sm font-medium ${
                    status === 'current' ? 'text-blue-600' : 
                    status === 'completed' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </p>
                  {stepData && (
                    <p className="text-xs text-gray-700 mt-1 font-medium">
                      {stepData}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={onPrevious}
            disabled={!canGoBack() || isLoading}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canGoBack() && !isLoading
                ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="text-center">
            {!canProceed && currentStep === 1 && (
              <p className="text-sm text-orange-600">
                Please select your skin type to continue
              </p>
            )}
          </div>

          <button
            onClick={isLastStep ? onSubmit : onNext}
            disabled={!canProceed || isLoading}
            className={`flex items-center px-6 py-2 rounded-lg font-medium transition-all ${
              canProceed && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : isLastStep ? (
              <>
                Get My Recommendations
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            ) : (
              <>
                Next
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizProgress;