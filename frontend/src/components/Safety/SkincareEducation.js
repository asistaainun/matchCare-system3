import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const SkincareEducation = () => {
  const [basicSkincare, setBasicSkincare] = useState(null);
  const [ingredientGuide, setIngredientGuide] = useState(null);
  const [activeTab, setActiveTab] = useState('routine');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEducationalContent = async () => {
      try {
        const [basicResponse, ingredientResponse] = await Promise.all([
          axios.get('/api/warnings/education/basic-skincare'),
          axios.get('/api/warnings/education/ingredient-combinations')
        ]);

        setBasicSkincare(basicResponse.data.data);
        setIngredientGuide(ingredientResponse.data.data);
      } catch (error) {
        console.error('Error fetching educational content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEducationalContent();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
          <h1 className="text-3xl font-bold mb-2">Skincare Education Center</h1>
          <p className="text-blue-100">
            Learn the fundamentals of skincare and ingredient safety
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            {[
              { id: 'routine', label: 'Skincare Routine', icon: '📋' },
              { id: 'ingredients', label: 'Ingredient Guide', icon: '🧪' },
              { id: 'mistakes', label: 'Common Mistakes', icon: '⚠️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'routine' && basicSkincare && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold mb-6">Essential Skincare Routine</h2>
              <div className="grid gap-4">
                {basicSkincare.skincare_routine_order.map((step, index) => (
                  <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{step.name}</h3>
                      <p className="text-gray-600 mb-2">{step.description}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          ⏰ {step.time}
                        </span>
                        {step.frequency && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            📅 {step.frequency}
                          </span>
                        )}
                        {step.optional && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'ingredients' && ingredientGuide && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold mb-6">Ingredient Compatibility Guide</h2>
              
              {/* Safe Combinations */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-green-600 mb-4">
                  ✅ Safe Combinations
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {ingredientGuide.safe_combinations.slice(0, 4).map((combo, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="font-medium text-green-800 mb-2">
                        {combo.ingredients.join(' + ')}
                      </div>
                      <div className="text-sm text-green-700">
                        {combo.benefits}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dangerous Combinations */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-red-600 mb-4">
                  ⚠️ Avoid These Combinations
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {ingredientGuide.avoid_combinations.slice(0, 4).map((combo, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="font-medium text-red-800 mb-2">
                        {combo.ingredients.join(' + ')}
                      </div>
                      <div className="text-sm text-red-700 mb-2">
                        Risk Level: {combo.risk_level}/5
                      </div>
                      <div className="text-sm text-red-600">
                        {combo.alternative}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Rules */}
              <div>
                <h3 className="text-xl font-semibold mb-4">General Rules</h3>
                <div className="space-y-3">
                  {ingredientGuide.general_rules.map((rule, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-medium text-blue-800 mb-1">{rule.rule}</div>
                      <div className="text-sm text-blue-700">{rule.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkincareEducation;