// frontend/src/pages/QuizPage.js
// FIXED VERSION - Complete Quiz Flow Integration

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QuizPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSkinTypeAssessment, setShowSkinTypeAssessment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [quizData, setQuizData] = useState({
    skin_type: '',
    concerns: [],
    sensitivities: []
  });

  // Reset quiz on component mount
  useEffect(() => {
    setCurrentStep(1);
    setQuizData({ skin_type: '', concerns: [], sensitivities: [] });
    setError('');
    setShowSkinTypeAssessment(false);
  }, []);

  // Skin types and options
  const skinTypes = [
    { id: 'normal', label: 'Normal', desc: 'Balanced, neither too oily nor too dry' },
    { id: 'dry', label: 'Dry', desc: 'Often feels tight, may have flaky patches' },
    { id: 'oily', label: 'Oily', desc: 'Shiny, especially in T-zone, prone to breakouts' },
    { id: 'combination', label: 'Combination', desc: 'Oily T-zone, normal/dry cheeks' },
    { id: 'unsure', label: "I'm not sure with my skin type", desc: 'Take a quick assessment to find out' }
  ];

  const concerns = [
    'Acne', 'Wrinkles', 'Fine Lines', 'Sensitivity', 'Dryness', 
    'Oiliness', 'Redness', 'Pores', 'Dullness', 'Texture', 
    'Dark Spots', 'Dark Undereyes'
  ];

  const sensitivities = [
    { id: 'fragrance', label: 'Fragrance', desc: 'Perfumes and essential oils' },
    { id: 'alcohol', label: 'Alcohol', desc: 'Denatured alcohol in products' },
    { id: 'silicone', label: 'Silicone', desc: 'Dimethicone and similar compounds' },
    { id: 'paraben', label: 'Paraben', desc: 'Preservatives like methylparaben' },
    { id: 'sulfate', label: 'Sulfate', desc: 'Sodium lauryl sulfate and similar' },
    { id: 'none', label: 'No known sensitivities', desc: 'I can use most ingredients safely' }
  ];

  // Handle skin type selection
  const handleSkinTypeSelect = (type) => {
    if (type === 'unsure') {
      setShowSkinTypeAssessment(true);
    } else {
      setQuizData({ ...quizData, skin_type: type });
    }
  };

  // Handle skin type assessment completion
  const handleAssessmentComplete = (detectedSkinType) => {
    setQuizData({ ...quizData, skin_type: detectedSkinType });
    setShowSkinTypeAssessment(false);
    setCurrentStep(2); // Auto advance to next step
  };

  // Handle concern toggle
  const handleConcernToggle = (concern) => {
    const newConcerns = quizData.concerns.includes(concern)
      ? quizData.concerns.filter(c => c !== concern)
      : [...quizData.concerns, concern];
    setQuizData({ ...quizData, concerns: newConcerns });
  };

  // Handle sensitivity toggle
  const handleSensitivityToggle = (sensitivity) => {
    if (sensitivity === 'none') {
      setQuizData({ ...quizData, sensitivities: [] });
    } else {
      const newSensitivities = quizData.sensitivities.includes(sensitivity)
        ? quizData.sensitivities.filter(s => s !== sensitivity)
        : [...quizData.sensitivities, sensitivity];
      setQuizData({ ...quizData, sensitivities: newSensitivities });
    }
  };

  // Submit quiz and get recommendations
  const submitQuiz = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate quiz data
      if (!quizData.skin_type) {
        throw new Error('Please select your skin type');
      }

      console.log('📋 Submitting quiz data:', quizData);

      // Submit quiz to backend
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      if (!response.ok) {
        throw new Error(`Quiz submission failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Quiz submitted successfully:', result);

      // Redirect to products page with quiz results
      const queryParams = new URLSearchParams({
        skin_type: quizData.skin_type,
        concerns: quizData.concerns.join(','),
        sensitivities: quizData.sensitivities.join(','),
        ontology: 'true',
        quiz_completed: 'true'
      });

      navigate(`/products?${queryParams.toString()}`);

    } catch (error) {
      console.error('❌ Quiz submission error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if can proceed to next step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return quizData.skin_type !== '';
      case 2:
        return quizData.concerns.length > 0;
      case 3:
        return true; // Sensitivities are optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Skin Assessment Quiz
          </h1>
          <p className="text-gray-600">
            Get personalized ontology-based skincare recommendations
          </p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
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
            />
          </div>
        </div>

        {/* Quiz Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          
          {/* Step 1: Skin Type Assessment */}
          {currentStep === 1 && !showSkinTypeAssessment && (
            <div>
              <h2 className="text-xl font-semibold mb-4">What's your skin type?</h2>
              <div className="space-y-3">
                {skinTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSkinTypeSelect(type.id)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                      quizData.skin_type === type.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.desc}</div>
                  </button>
                ))}
              </div>
              
              {quizData.skin_type && quizData.skin_type !== 'unsure' && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800">
                    ✅ Selected skin type: <strong className="capitalize">{quizData.skin_type}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Skin Type Assessment Component */}
          {showSkinTypeAssessment && (
            <SkinTypeAssessment onComplete={handleAssessmentComplete} />
          )}

          {/* Step 2: Skin Concerns */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">What are your skin concerns?</h2>
              <p className="text-gray-600 mb-4">Select all that apply (at least one)</p>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  Your skin type: <strong className="capitalize">{quizData.skin_type}</strong>
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {concerns.map((concern) => (
                  <button
                    key={concern}
                    onClick={() => handleConcernToggle(concern)}
                    className={`p-3 border-2 rounded-lg transition-colors text-sm ${
                      quizData.concerns.includes(concern)
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {concern}
                  </button>
                ))}
              </div>
              
              {quizData.concerns.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ Selected concerns: {quizData.concerns.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Sensitivities */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Do you have any known sensitivities?</h2>
              <p className="text-gray-600 mb-4">This helps us avoid ingredients that might irritate your skin</p>
              
              <div className="space-y-3">
                {sensitivities.map((sensitivity) => (
                  <button
                    key={sensitivity.id}
                    onClick={() => handleSensitivityToggle(sensitivity.id)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                      (sensitivity.id === 'none' && quizData.sensitivities.length === 0) ||
                      (sensitivity.id !== 'none' && quizData.sensitivities.includes(sensitivity.id))
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold">{sensitivity.label}</div>
                    <div className="text-sm text-gray-600">{sensitivity.desc}</div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-green-800 text-sm">
                  {quizData.sensitivities.length === 0 
                    ? '✅ No known sensitivities - you can use most ingredients'
                    : `✅ Avoiding: ${quizData.sensitivities.join(', ')}`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={loading || !canProceed()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Getting Recommendations...' : 'Get My Recommendations ✨'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Skin Type Assessment Component
const SkinTypeAssessment = ({ onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);

  const questions = [
    {
      question: "How does your skin feel when you wake up in the morning?",
      options: [
        { text: "Tight, dry, maybe flaky", value: "dry" },
        { text: "Normal, comfortable, balanced", value: "normal" },
        { text: "Oily or shiny, especially on forehead, nose, and chin", value: "oily" },
        { text: "Dry or normal on cheeks, oily in T-zone", value: "combination" }
      ]
    },
    {
      question: "How does your skin feel a few hours after washing your face?",
      options: [
        { text: "Tight or rough, sometimes flaky", value: "dry" },
        { text: "Balanced, neither oily nor dry", value: "normal" },
        { text: "Oily and shiny, especially in the T-zone", value: "oily" },
        { text: "Oily in T-zone, dry or normal on other areas", value: "combination" }
      ]
    },
    {
      question: "How often do you get oily shine during the day?",
      options: [
        { text: "Rarely, skin feels dry", value: "dry" },
        { text: "Rarely, skin looks balanced", value: "normal" },
        { text: "Often, skin looks shiny or greasy", value: "oily" },
        { text: "Only in some areas, mostly T-zone", value: "combination" }
      ]
    },
    {
      question: "Do you experience flaky or rough patches?",
      options: [
        { text: "Yes, frequently", value: "dry" },
        { text: "Rarely", value: "normal" },
        { text: "Almost never", value: "oily" },
        { text: "Sometimes on cheeks only", value: "combination" }
      ]
    }
  ];

  const handleAnswer = (value) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate skin type based on answers
      const skinType = determineSkinType(newAnswers);
      onComplete(skinType);
    }
  };

  const determineSkinType = (answers) => {
    const counts = {};
    answers.forEach(answer => {
      counts[answer] = (counts[answer] || 0) + 1;
    });

    // Find the most common answer
    const skinType = Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b
    );

    return skinType;
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => window.location.reload()} // Reset to skin type selection
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to skin type selection
        </button>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">
          {questions[currentQuestion].question}
        </h3>
        
        <div className="space-y-3">
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option.value)}
              className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              {option.text}
            </button>
          ))}
        </div>

        {currentQuestion > 0 && (
          <button
            onClick={goBack}
            className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Previous Question
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizPage;