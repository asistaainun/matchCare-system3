import React, { useEffect } from 'react';
import { useQuiz } from '../context/QuizContext';

const QuizPage = () => {
  const {
    currentStep,
    totalSteps,
    skinType,
    concerns,
    sensitivities,
    referenceData,
    isLoading,
    error,
    recommendations,
    completed,
    sessionId,
    // Actions
    startQuiz,
    fetchReferenceData,
    setSkinType,
    toggleConcern,
    toggleSensitivity,
    submitQuiz,
    fetchRecommendations,
    nextStep,
    prevStep,
    canProceedToNext,
    canGoBack,
    resetQuiz
  } = useQuiz();

  // Initialize quiz on mount
  useEffect(() => {
    const initializeQuiz = async () => {
      console.log('🚀 Initializing quiz...');
      
      // Fetch reference data first
      if (!referenceData || !referenceData.skin_types || referenceData.skin_types.length === 0) {
        console.log('📋 Loading reference data...');
        await fetchReferenceData();
      }
      
      // Start quiz session if not exists
      if (!sessionId) {
        console.log('🎯 Starting quiz session...');
        await startQuiz();
      }
      
      console.log('✅ Quiz initialized');
    };
    
    initializeQuiz().catch(console.error);
  }, [sessionId, referenceData, startQuiz, fetchReferenceData]);

  // Show loading while initializing
  if (isLoading && (!referenceData || !referenceData.skin_types || referenceData.skin_types.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Show error if initialization failed
  if (error && (!referenceData || !referenceData.skin_types || referenceData.skin_types.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Quiz Error</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show results if completed
  if (completed && recommendations && recommendations.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Skincare Recommendations ✨
            </h1>
            <p className="text-gray-600">
              Based on your skin profile, here are our top picks for you:
            </p>
          </div>

          <div className="space-y-6">
            {recommendations.map((product, index) => (
              <div key={product.id || index} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-gray-600">
                      {product.brand} • {product.product_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {product.match_score}%
                    </div>
                    <div className="text-sm text-gray-500">Match</div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{product.description}</p>
                
                {product.reasons && product.reasons.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Why this matches you:</h4>
                    <ul className="space-y-1">
                      {product.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={resetQuiz}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mr-4"
            >
              Take Quiz Again
            </button>
            <a
              href="/products"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
            >
              Browse All Products
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Main quiz interface
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Quiz Content */}
        <div className="bg-white p-8 rounded-xl shadow-sm">
          {currentStep === 1 && (
            <SkinTypeStep
              skinType={skinType}
              skinTypes={referenceData.skin_types || []}
              onSelect={setSkinType}
            />
          )}

          {currentStep === 2 && (
            <ConcernsStep
              concerns={concerns}
              skinConcerns={referenceData.skin_concerns || []}
              onToggle={toggleConcern}
            />
          )}

          {currentStep === 3 && (
            <SensitivitiesStep
              sensitivities={sensitivities}
              allergenTypes={referenceData.allergen_types || []}
              onToggle={toggleSensitivity}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={!canGoBack()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                disabled={!canProceedToNext()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={async () => {
                  const result = await submitQuiz();
                  if (result) {
                    await fetchRecommendations();
                  }
                }}
                disabled={!canProceedToNext() || isLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  'Get Recommendations ✨'
                )}
              </button>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Quiz Step Components
const SkinTypeStep = ({ skinType, skinTypes, onSelect }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">What's your skin type?</h2>
    <p className="text-gray-600 mb-6">Choose the option that best describes your skin</p>
    
    <div className="space-y-3">
      {skinTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelect(type.name)}
          className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
            skinType === type.name
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="font-medium capitalize">
            {type.name === 'normal' && '😊 Normal'}
            {type.name === 'dry' && '💧 Dry'}
            {type.name === 'oily' && '✨ Oily'}
            {type.name === 'combination' && '🔄 Combination'}
            {type.name === 'sensitive' && '⚠️ Sensitive'}
            {!['normal', 'dry', 'oily', 'combination', 'sensitive'].includes(type.name) && type.name}
          </div>
        </button>
      ))}
    </div>
  </div>
);

const ConcernsStep = ({ concerns, skinConcerns, onToggle }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">What are your skin concerns?</h2>
    <p className="text-gray-600 mb-6">Select all that apply (optional)</p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {skinConcerns.map((concern) => (
        <button
          key={concern.id}
          onClick={() => onToggle(concern.name)}
          className={`p-3 text-left border-2 rounded-lg transition-colors ${
            concerns.includes(concern.name)
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="font-medium capitalize">
            {concern.name.replace(/_/g, ' ')}
          </div>
        </button>
      ))}
    </div>
  </div>
);

const SensitivitiesStep = ({ sensitivities, allergenTypes, onToggle }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Do you have any known sensitivities?</h2>
    <p className="text-gray-600 mb-6">Select any ingredients you're sensitive to (optional)</p>
    
    <div className="space-y-3">
      {allergenTypes.map((allergen) => (
        <button
          key={allergen.id}
          onClick={() => onToggle(allergen.name)}
          className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
            sensitivities.includes(allergen.name)
              ? 'border-red-600 bg-red-50 text-red-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="font-medium capitalize flex items-center">
            <span className="mr-2">
              {allergen.name === 'fragrance' && '🌸'}
              {allergen.name === 'alcohol' && '🍷'}
              {allergen.name === 'silicone' && '🧪'}
              {allergen.name === 'paraben' && '💊'}
              {allergen.name === 'sulfate' && '🧽'}
              {!['fragrance', 'alcohol', 'silicone', 'paraben', 'sulfate'].includes(allergen.name) && '⚠️'}
            </span>
            {allergen.name.replace(/_/g, ' ')}
          </div>
        </button>
      ))}
    </div>
  </div>
);

export default QuizPage;