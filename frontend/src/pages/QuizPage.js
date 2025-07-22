// src/pages/QuizPage.js
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { useQuizApi, useQuizInitialization, useQuizSubmission } from '../hooks/useQuizApi';

// Components
import QuizProgress from '../components/Quiz/QuizProgress';
import SkinTypeSelector from '../components/Quiz/SkinTypeSelector';
import SkinConcernSelector from '../components/Quiz/SkinConcernSelector';
import SensitivitySelector from '../components/Quiz/SensitivitySelector';
import QuizResults from '../components/Quiz/QuizResults';

const QuizPage = () => {
  const navigate = useNavigate();
  const { 
    currentStep, 
    completed, 
    nextStep, 
    prevStep, 
    resetQuiz,
    error 
  } = useQuiz();
  
  const { initialized, initError, initializeQuiz } = useQuizInitialization();
  const { handleSubmitQuiz, canSubmit, submissionError } = useQuizSubmission();
  const [showResults, setShowResults] = useState(false);

  // Initialize quiz on component mount
  useEffect(() => {
    if (!initialized && !initError) {
      initializeQuiz();
    }
  }, [initialized, initError, initializeQuiz]);

  // Handle quiz completion
  useEffect(() => {
    if (completed) {
      setShowResults(true);
    }
  }, [completed]);

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    prevStep();
  };

  const handleSubmit = async () => {
    try {
      await handleSubmitQuiz();
      // Results will be shown automatically when completed state changes
    } catch (error) {
      console.error('Quiz submission failed:', error);
      // Error handling is done in the hook
    }
  };

  const handleStartOver = () => {
    resetQuiz();
    setShowResults(false);
  };

  const handleContinueBrowsing = () => {
    navigate('/products');
  };

  // Render step content
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <SkinTypeSelector />;
      case 2:
        return <SkinConcernSelector />;
      case 3:
        return <SensitivitySelector />;
      default:
        return <SkinTypeSelector />;
    }
  };

  // Loading state during initialization
  if (!initialized && !initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Preparing your quiz...
          </h2>
          <p className="text-gray-600">
            Setting up your personalized skincare assessment
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            {initError}
          </p>
          <button
            onClick={initializeQuiz}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show results page
  if (showResults) {
    return (
      <QuizResults 
        onStartOver={handleStartOver}
        onContinueBrowsing={handleContinueBrowsing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <QuizProgress 
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Error Display */}
        {(error || submissionError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">
                {error || submissionError}
              </span>
            </div>
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-sm p-8"
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Having trouble? You can always{' '}
            <button 
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              skip the quiz
            </button>
            {' '}and browse all products instead.
          </p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full opacity-20"></div>
      </div>
    </div>
  );
};

export default QuizPage;