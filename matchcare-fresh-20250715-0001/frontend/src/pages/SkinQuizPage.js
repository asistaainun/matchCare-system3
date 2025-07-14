import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ProductCard from '../components/Products/ProductCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function SkinQuizPage() {
  const [step, setStep] = useState(1);
  const [quizData, setQuizData] = useState({
    skinType: '',
    concerns: [],
    sensitivities: []
  });

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

  const skinTypes = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
  const concerns = ['Acne', 'Wrinkles', 'Dryness', 'Oiliness', 'Sensitivity', 'Dark Spots'];
  const sensitivities = ['Fragrance', 'Alcohol', 'Paraben', 'Sulfate'];

  const handleSkinTypeChange = (type) => setQuizData({ ...quizData, skinType: type });
  
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
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">What's your skin type?</h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {skinTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleSkinTypeChange(type)}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    quizData.skinType === type ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">What are your main concerns?</h2>
            <div className="grid md:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {concerns.map((concern) => (
                <button
                  key={concern}
                  onClick={() => handleConcernToggle(concern)}
                  className={`p-3 border-2 rounded-lg transition-colors ${
                    quizData.concerns.includes(concern) ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
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
            <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
              {sensitivities.map((sensitivity) => (
                <button
                  key={sensitivity}
                  onClick={() => handleSensitivityToggle(sensitivity)}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    quizData.sensitivities.includes(sensitivity) ? 'border-red-600 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  {sensitivity}
                </button>
              ))}
              <button
                onClick={() => setQuizData({ ...quizData, sensitivities: [] })}
                className={`p-4 border-2 rounded-lg md:col-span-2 ${
                  quizData.sensitivities.length === 0 ? 'border-green-600 bg-green-50' : 'border-gray-300'
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {step <= 3 && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {renderStep()}
          </motion.div>

          {step <= 3 && (
            <div className="flex justify-between mt-8 pt-8 border-t">
              <button
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                className="px-6 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>

              {step < 3 ? (
                <button
                  onClick={() => quizData.skinType && setStep(step + 1)}
                  disabled={!quizData.skinType}
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
