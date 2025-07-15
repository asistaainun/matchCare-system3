import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SkinTypeAssessment({ onComplete }) {
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const questions = [
    {
      id: 'morning_feeling',
      question: 'How does your skin feel when you wake up in the morning?',
      options: [
        { value: 'tight_dry', label: 'Tight, dry, maybe flaky' },
        { value: 'normal_balanced', label: 'Normal, comfortable, balanced' },
        { value: 'oily_shiny', label: 'Oily or shiny, especially on forehead, nose, and chin' },
        { value: 'combination', label: 'Dry or normal on cheeks, oily in T-zone' }
      ]
    },
    {
      id: 'after_washing',
      question: 'How does your skin feel a few hours after washing your face?',
      options: [
        { value: 'tight_rough', label: 'Tight or rough, sometimes flaky' },
        { value: 'balanced', label: 'Balanced, neither oily nor dry' },
        { value: 'oily_tzone', label: 'Oily and shiny, especially in the T-zone' },
        { value: 'oily_tzone_dry_cheeks', label: 'Oily in T-zone, dry or normal on other areas' }
      ]
    },
    {
      id: 'oily_shine',
      question: 'How often do you get oily shine during the day?',
      options: [
        { value: 'rarely_dry', label: 'Rarely, skin feels dry' },
        { value: 'rarely_balanced', label: 'Rarely, skin looks balanced' },
        { value: 'often_shiny', label: 'Often, skin looks shiny or greasy' },
        { value: 'tzone_only', label: 'Only in some areas, mostly T-zone' }
      ]
    },
    {
      id: 'flaky_patches',
      question: 'Do you experience flaky or rough patches?',
      options: [
        { value: 'yes_frequently', label: 'Yes, frequently' },
        { value: 'rarely', label: 'Rarely' },
        { value: 'almost_never', label: 'Almost never' },
        { value: 'sometimes_cheeks', label: 'Sometimes on cheeks only' }
      ]
    }
  ];

  const handleAnswer = (value) => {
    const newResponses = { ...responses, [questions[currentQuestion].id]: value };
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
    
    // Morning feeling
    if (responses.morning_feeling === 'tight_dry') scores.dry += 3;
    else if (responses.morning_feeling === 'normal_balanced') scores.normal += 3;
    else if (responses.morning_feeling === 'oily_shiny') scores.oily += 3;
    else if (responses.morning_feeling === 'combination') scores.combination += 3;

    // After washing
    if (responses.after_washing === 'tight_rough') scores.dry += 2;
    else if (responses.after_washing === 'balanced') scores.normal += 2;
    else if (responses.after_washing === 'oily_tzone') scores.oily += 2;
    else if (responses.after_washing === 'oily_tzone_dry_cheeks') scores.combination += 2;

    // Oily shine
    if (responses.oily_shine === 'rarely_dry') scores.dry += 2;
    else if (responses.oily_shine === 'rarely_balanced') scores.normal += 2;
    else if (responses.oily_shine === 'often_shiny') scores.oily += 2;
    else if (responses.oily_shine === 'tzone_only') scores.combination += 2;

    // Flaky patches
    if (responses.flaky_patches === 'yes_frequently') scores.dry += 2;
    else if (responses.flaky_patches === 'rarely') scores.normal += 1;
    else if (responses.flaky_patches === 'almost_never') scores.oily += 1;
    else if (responses.flaky_patches === 'sometimes_cheeks') scores.combination += 1;

    // Return highest score
    const maxScore = Math.max(...Object.values(scores));
    return Object.keys(scores).find(type => scores[type] === maxScore) || 'normal';
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      <motion.div 
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-center"
      >
        <h3 className="text-xl font-bold mb-6">{currentQ.question}</h3>
        
        <div className="space-y-3">
          {currentQ.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}