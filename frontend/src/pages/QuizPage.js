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
    { id: 'normal', label: 'Normal', desc: 'Seimbang, tidak terlalu berminyak atau kering' },
    { id: 'dry', label: 'Dry', desc: 'Kering, sering terasa kencang, mungkin ada area yang mengelupas' },
    { id: 'oily', label: 'Oily', desc: 'Berminyak, terutama di zona T, rentan terhadap jerawat' },
    { id: 'combination', label: 'Combination', desc: 'Kombinasi, zona T berminyak, pipi normal/kering' },
    { id: 'unsure', label: "Saya tidak yakin dengan tipe kulit saya", desc: 'Ikuti penilaian singkat untuk mengetahuinya' }
  ];

  const concerns = [
    'Acne', 'Wrinkles', 'Fine Lines', 'Sensitivity', 'Dryness', 
    'Oiliness', 'Redness', 'Pores', 'Dullness', 'Texture', 
    'Dark Spots', 'Dark Undereyes'
  ];

  const sensitivities = [
    { id: 'fragrance', label: 'Fragrance', desc: 'Pewangi dan minyak esensial' },
    { id: 'alcohol', label: 'Alcohol', desc: 'Alkohol denaturasi dalam produk' },
    { id: 'silicone', label: 'Silicone', desc: 'Dimethicone dan senyawa serupa' },
    { id: 'paraben', label: 'Paraben', desc: 'Pengawet seperti methylparaben' },
    { id: 'sulfate', label: 'Sulfate', desc: 'Sodium lauryl sulfate dan sejenisnya' },
    { id: 'none', label: 'Tidak ada sensitivitas yang diketahui', desc: 'Saya dapat menggunakan sebagian besar bahan dengan aman' }
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
        throw new Error('Silakan pilih tipe kulitmu');
      }

      console.log('📋 Submitting quiz data:', quizData);

      // Submit quiz to backend
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      if (!response.ok) {
        throw new Error(`Kuis gagal dikirim: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Kuis berhasil dikirim:', result);

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
            Kuis Penilaian Kulit
          </h1>
          <p className="text-gray-600">
            Dapatkan rekomendasi skincare yang dipersonalisasi
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
              <h2 className="text-xl font-semibold mb-4">Apa tipe kulitmu?</h2>
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
                    ✅ Tipe kulit terpilih: <strong className="capitalize">{quizData.skin_type}</strong>
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
              <h2 className="text-xl font-semibold mb-4">Apa masalah kulitmu?</h2>
              <p className="text-gray-600 mb-4">Pilih semua yang sesuai (setidaknya satu)</p>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  Tipe kulitmu: <strong className="capitalize">{quizData.skin_type}</strong>
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
                    ✅ Masalah kulit terpilih: {quizData.concerns.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Sensitivities */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Apakah Anda memiliki sensitivitas yang diketahui?</h2>
              <p className="text-gray-600 mb-4">Ini membantu kami menghindari bahan-bahan yang mungkin mengiritasi kulit Anda</p>

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
                    ? '✅ Tidak ada sensitivitas yang diketahui - Anda dapat menggunakan sebagian besar bahan'
                    : `✅ Menghindari: ${quizData.sensitivities.join(', ')}`
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
                {loading ? 'Mendapatkan Rekomendasi...' : 'Dapatkan Rekomendasi Saya ✨'}
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
      question: "Apa yang dirasakan kulitmu saat bangun tidur?",
      options: [
        { text: "Ketat, kering, mungkin mengelupas", value: "dry" },
        { text: "Normal, nyaman, seimbang", value: "normal" },
        { text: "Berminyak atau mengkilap, terutama di dahi, hidung, dan dagu", value: "oily" },
        { text: "Kering atau normal di pipi, berminyak di zona T", value: "combination" }
      ]
    },
    {
      question: "Bagaimana kulitmu terasa beberapa jam setelah mencuci wajah?",
      options: [
        { text: "Ketat atau kasar, kadang-kadang mengelupas", value: "dry" },
        { text: "Seimbang, tidak berminyak atau kering", value: "normal" },
        { text: "Berminyak dan mengkilap, terutama di zona T", value: "oily" },
        { text: "Berminyak di zona T, kering atau normal di area lain", value: "combination" }
      ]
    },
    {
      question: "Seberapa sering kulitmu berminyak sepanjang hari?",
      options: [
        { text: "Jarang, kulit terasa kering", value: "dry" },
        { text: "Jarang, kulit terlihat seimbang", value: "normal" },
        { text: "Sering, kulit terlihat mengkilap atau berminyak", value: "oily" },
        { text: "Hanya di beberapa area, terutama zona T", value: "combination" }
      ]
    },
    {
      question: "Apakah kamu mengalami bercak kering atau kasar?",
      options: [
        { text: "Ya, sering", value: "dry" },
        { text: "Jarang", value: "normal" },
        { text: "Hampir tidak pernah", value: "oily" },
        { text: "Kadang-kadang hanya di pipi", value: "combination" }
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
          Kembali ke pemilihan jenis kulit
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
            ← Pertanyaan Sebelumnya
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizPage;