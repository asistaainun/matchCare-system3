// 🚨 URGENT FIX: Update QuizPage.js to handle endpoint correctly

// src/pages/QuizPage.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startQuiz, submitQuiz } from '../services/api';

const QuizPage = () => {
  const [quizSession, setQuizSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Quiz state
  const [quizData, setQuizData] = useState({
    skin_type: '',
    concerns: [],
    sensitivities: []
  });

  // Initialize quiz session
  useEffect(() => {
    initializeQuiz();
  }, []);

  const initializeQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to start quiz session
      const sessionData = await startQuiz();
      setQuizSession(sessionData);
      console.log('✅ Quiz session started:', sessionData);
      
    } catch (error) {
      console.error('❌ Quiz initialization failed:', error);
      
      // If quiz endpoint fails, create guest session
      setQuizSession({
        session_id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        guest_mode: true
      });
      
      setError('Quiz server not available. Using guest mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkinTypeSelect = (skinType) => {
    setQuizData(prev => ({ ...prev, skin_type: skinType }));
    setCurrentStep(2);
  };

  const handleConcernsSelect = (concern) => {
    setQuizData(prev => {
      const concerns = prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern];
      return { ...prev, concerns };
    });
  };

  const handleSensitivitiesSelect = (sensitivity) => {
    setQuizData(prev => {
      const sensitivities = prev.sensitivities.includes(sensitivity)
        ? prev.sensitivities.filter(s => s !== sensitivity)
        : [...prev.sensitivities, sensitivity];
      return { ...prev, sensitivities };
    });
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!quizData.skin_type) {
        throw new Error('Please select your skin type');
      }

      // Try to submit to backend
      if (!quizSession.guest_mode) {
        try {
          const submissionData = {
            session_id: quizSession.session_id,
            skin_type: quizData.skin_type,
            concerns: quizData.concerns,
            sensitivities: quizData.sensitivities
          };

          const result = await submitQuiz(submissionData);
          console.log('✅ Quiz submitted successfully:', result);
          
          // Navigate to results
          navigate(`/recommendations/${quizSession.session_id}`);
          return;
          
        } catch (submitError) {
          console.warn('⚠️ Quiz submission failed, using direct ontology mode');
        }
      }

      // Fallback: Direct ontology recommendations
      console.log('🔄 Using direct ontology mode');
      
      // Store quiz data in sessionStorage for results page
      sessionStorage.setItem('quiz_results', JSON.stringify({
        session_id: quizSession.session_id,
        quiz_data: quizData,
        guest_mode: true
      }));

      // Navigate to products with ontology filter
      const ontologyParams = new URLSearchParams({
        skin_type: quizData.skin_type,
        concerns: quizData.concerns.join(','),
        sensitivities: quizData.sensitivities.join(','),
        ontology: 'true'
      });

      navigate(`/products?${ontologyParams.toString()}`);

    } catch (error) {
      console.error('❌ Quiz submission error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !quizSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing skin quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Skin Assessment Quiz</h1>
          <p className="text-gray-600">Get personalized ontology-based skincare recommendations</p>
          
          {error && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep} of 3</span>
            <span>{Math.round((currentStep / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Skin Type */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">What's your skin type?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'normal', label: 'Normal', desc: 'Balanced, neither too oily nor too dry' },
                { id: 'dry', label: 'Dry', desc: 'Often feels tight, may have flaky patches' },
                { id: 'oily', label: 'Oily', desc: 'Shiny, especially in T-zone, prone to breakouts' },
                { id: 'combination', label: 'Combination', desc: 'Oily T-zone, normal/dry cheeks' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSkinTypeSelect(type.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    quizData.skin_type === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Skin Concerns */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">What are your skin concerns? (Select all that apply)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'acne', 'wrinkles', 'dark_spots', 'dryness', 'sensitivity', 
                'pores', 'oiliness', 'redness', 'dullness', 'texture'
              ].map((concern) => (
                <button
                  key={concern}
                  onClick={() => handleConcernsSelect(concern)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    quizData.concerns.includes(concern)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {concern.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Sensitivities */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Do you have any known sensitivities?</h2>
            <div className="space-y-3">
              {[
                { id: 'fragrance', label: 'Fragrance', desc: 'Perfumes and essential oils' },
                { id: 'alcohol', label: 'Alcohol', desc: 'Denatured alcohol in products' },
                { id: 'silicone', label: 'Silicone', desc: 'Dimethicone and similar compounds' }
              ].map((sensitivity) => (
                <button
                  key={sensitivity.id}
                  onClick={() => handleSensitivitiesSelect(sensitivity.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    quizData.sensitivities.includes(sensitivity.id)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="font-medium">{sensitivity.label}</div>
                  <div className="text-sm text-gray-600">{sensitivity.desc}</div>
                </button>
              ))}
              
              <button
                onClick={() => handleSensitivitiesSelect('none')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  quizData.sensitivities.includes('none')
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="font-medium">No known sensitivities</div>
                <div className="text-sm text-gray-600">I can use most ingredients safely</div>
              </button>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Get My Recommendations 🧠'}
              </button>
            </div>
          </div>
        )}

        {/* Session Info */}
        {quizSession && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Session: {quizSession.session_id}
            {quizSession.guest_mode && <span className="text-yellow-600"> (Guest Mode)</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;