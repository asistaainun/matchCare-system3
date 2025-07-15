// File: frontend/src/pages/SkinQuizPage.js
// TAMBAHKAN FUNCTION RESET DAN useEffect

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ProductCard from '../components/Products/ProductCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SkinTypeAssessment from '../components/Quiz/SkinTypeAssessment';

export default function SkinQuizPage() {
  const [step, setStep] = useState(1);
  const [showAssessment, setShowAssessment] = useState(false);
  const [quizData, setQuizData] = useState({
    skinType: '',
    concerns: [],
    sensitivities: []
  });

  // 🆕 TAMBAHKAN useEffect untuk reset state ketika component mount
  useEffect(() => {
    resetQuiz();
  }, []);

  // 🆕 TAMBAHKAN function reset quiz
  const resetQuiz = () => {
    setStep(1);
    setShowAssessment(false);
    setQuizData({
      skinType: '',
      concerns: [],
      sensitivities: []
    });
    // Clear localStorage jika ada
    localStorage.removeItem('quizData');
    localStorage.removeItem('quizStep');
  };

  const mutation = useMutation(
    (data) => apiService.getRecommendations(data).then(res => res.data),
    {
      onSuccess: () => {
        toast.success('Got your recommendations!');
        setStep(4);
      },
      onError: () => toast.error('Failed to get recommendations')
    }
  );

  const skinTypes = ['Normal', 'Dry', 'Oily', 'Combination', "I'm not sure"];
  const concerns = ['Acne', 'Wrinkles', 'Dryness', 'Oiliness', 'Sensitivity', 'Dark Spots'];
  const sensitivities = ['Fragrance', 'Alcohol', 'Paraben', 'Sulfate'];

  // Handle skin type selection
  const handleSkinTypeChange = (type) => {
    if (type === "I'm not sure") {
      setShowAssessment(true);
    } else {
      setQuizData({ ...quizData, skinType: type });
    }
  };

  // Handle assessment complete - LANGSUNG KE STEP 2
  const handleAssessmentComplete = (detectedSkinType) => {
    setQuizData({ ...quizData, skinType: detectedSkinType });
    setShowAssessment(false);
    setStep(2);
  };
  
  const handleConcernToggle = (concern) => {
    const newConcerns = quizData.concerns.includes(concern)
      ? quizData.concerns.filter(c => c !== concern)
      : [...quizData.concerns, concern];
    setQuizData({ ...quizData, concerns: newConcerns });
  };

  const handleSensitivityToggle = (sensitivity) => {
    const newSensitivities = quizData.sensitivities.includes(sensitivity)
      ? quizData.sensitivities.filter(s => s !== sensitivity)
      : [...quizData.sensitivities, sensitivity];
    setQuizData({ ...quizData, sensitivities: newSensitivities });
  };

  const submitQuiz = () => mutation.mutate(quizData);

  const renderStep = () => {
    switch (step) {
      case 1:
        if (showAssessment) {
          return (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">
                Let's determine your skin type
              </h2>
              <SkinTypeAssessment onComplete={handleAssessmentComplete} />
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">What's your skin type?</h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {skinTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleSkinTypeChange(type)}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    quizData.skinType === type ? 
                      'border-blue-600 bg-blue-50' : 
                      'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {quizData.skinType && !skinTypes.slice(0, 4).includes(quizData.skinType) && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  ✅ Your skin type has been determined: <strong>{quizData.skinType}</strong>
                </p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">What are your main concerns?</h2>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                Your skin type: <strong>{quizData.skinType}</strong>
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {concerns.map((concern) => (
                <button
                  key={concern}
                  onClick={() => handleConcernToggle(concern)}
                  className={`p-3 border-2 rounded-lg transition-colors ${
                    quizData.concerns.includes(concern) ? 
                      'border-blue-600 bg-blue-50' : 
                      'border-gray-300'
                  }`}
                >
                  {concern}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">Any known sensitivities?</h2>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                Your skin type: <strong>{quizData.skinType}</strong>
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
              {sensitivities.map((sensitivity) => (
                <button
                  key={sensitivity}
                  onClick={() => handleSensitivityToggle(sensitivity)}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    quizData.sensitivities.includes(sensitivity) ? 
                      'border-red-600 bg-red-50' : 
                      'border-gray-300'
                  }`}
                >
                  {sensitivity}
                </button>
              ))}
              <button
                onClick={() => setQuizData({ ...quizData, sensitivities: [] })}
                className={`p-4 border-2 rounded-lg md:col-span-2 ${
                  quizData.sensitivities.length === 0 ? 
                    'border-green-600 bg-green-50' : 
                    'border-gray-300'
                }`}
              >
                No known sensitivities
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-center">Your Recommendations</h2>
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">
                <strong>Your Profile:</strong> {quizData.skinType} skin
                {quizData.concerns.length > 0 && ` • Concerns: ${quizData.concerns.join(', ')}`}
                {quizData.sensitivities.length > 0 && ` • Sensitivities: ${quizData.sensitivities.join(', ')}`}
              </p>
            </div>
            
            {/* 🆕 TAMBAHKAN RESTART BUTTON */}
            <div className="text-center mb-6">
              <button
                onClick={resetQuiz}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔄 Restart Quiz
              </button>
            </div>

            {mutation.isLoading ? (
              <LoadingSpinner text="Analyzing your skin..." />
            ) : mutation.data ? (
              <div>
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <p className="text-blue-800">{mutation.data.data.explanation}</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mutation.data.data.recommendations.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return quizData.skinType !== '' && !showAssessment;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* 🆕 TAMBAHKAN RESET BUTTON DI HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Skin Quiz</h1>
          <button
            onClick={resetQuiz}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            🔄 Restart Quiz
          </button>
        </div>

        {step <= 3 && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              Step {step} of 3
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {renderStep()}
          </motion.div>

          {step <= 3 && !showAssessment && (
            <div className="flex justify-between mt-8 pt-8 border-t">
              <button
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                className="px-6 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>

              {step < 3 ? (
                <button
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className="btn-primary disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitQuiz}
                  disabled={mutation.isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {mutation.isLoading ? 'Analyzing...' : 'Get Recommendations'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}