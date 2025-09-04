import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const SkinTypesPage = () => {
  const [educationData, setEducationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkinType, setSelectedSkinType] = useState(null);
  const [dataSource, setDataSource] = useState("");

  useEffect(() => {
    fetchSkinTypesEducation();
  }, []);

  const fetchSkinTypesEducation = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/education/skin-types"
      );
      const data = await response.json();

      if (data.success) {
        setEducationData(data.data);
        setSelectedSkinType(data.data.skin_types[0]);
        setDataSource(data.data.source);
        console.log(`Education data loaded from: ${data.data.source}`);
      }
    } catch (error) {
      console.error("Failed to fetch skin types education:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading education content...</p>
        </div>
      </div>
    );
  }

  if (!educationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Content Not Available
          </h1>
          <Link to="/" className="text-blue-600 hover:underline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-blue-600">
              Home
            </Link>
            <span>›</span>
            <Link to="/education" className="hover:text-blue-600">
              Education
            </Link>
            <span>›</span>
            <span className="text-gray-900">Skin Types</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Understanding Skin Types
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl">
                {educationData.overview}
              </p>
            </div>

            {/* Data Source Badge */}
            <div className="text-right">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  dataSource === "hybrid"
                    ? "bg-green-100 text-green-700"
                    : dataSource === "hardcoded_fallback"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {dataSource === "hybrid"
                  ? "Database + Content"
                  : dataSource === "hardcoded_fallback"
                    ? "Educational Content"
                    : "Fallback Mode"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Skin Type Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">Skin Types</h3>
              <nav className="space-y-2">
                {educationData.skin_types.map((skinType, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSkinType(skinType)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedSkinType?.type === skinType.type
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{skinType.type} Skin</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {skinType.characteristics[0]}
                        </div>
                      </div>
                      {skinType.product_count !== undefined && (
                        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {skinType.product_count} products
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedSkinType && (
              <div className="space-y-8">
                {/* Skin Type Header */}
                <div className="bg-white rounded-lg shadow-sm p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {selectedSkinType.type} Skin
                    </h2>

                    {/* Database Info Badge */}
                    {selectedSkinType.database_info && (
                      <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        ✓ Verified in Database
                      </div>
                    )}
                  </div>

                  {/* Database Description (if available) */}
                  {selectedSkinType.database_info?.description && (
                    <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Database Definition:
                      </h4>
                      <p className="text-blue-800">
                        {selectedSkinType.database_info.description}
                      </p>
                    </div>
                  )}

                  {/* Characteristics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Key Characteristics
                      </h4>
                      <ul className="space-y-2">
                        {selectedSkinType.characteristics.map((char, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span className="text-gray-700">{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        How to Identify
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Morning feel:</strong>{" "}
                          {selectedSkinType.identification.morning_feel}
                        </div>
                        <div>
                          <strong>Afternoon feel:</strong>{" "}
                          {selectedSkinType.identification.afternoon_feel}
                        </div>
                        <div>
                          <strong>Pore size:</strong>{" "}
                          {selectedSkinType.identification.pore_size}
                        </div>
                        <div>
                          <strong>Sensitivity:</strong>{" "}
                          {selectedSkinType.identification.sensitivity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommended Routine */}
                <div className="bg-white rounded-lg shadow-sm p-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                    Recommended Routine
                  </h3>
                  <div className="space-y-4">
                    {selectedSkinType.recommended_routine.map((step, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {step.step}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {step.frequency}
                          </span>
                        </div>
                        <p className="text-gray-700">{step.product}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Ingredients & Tips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow-sm p-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Key Ingredients
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkinType.key_ingredients.map(
                        (ingredient, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                          >
                            {ingredient}
                          </span>
                        )
                      )}
                    </div>

                    <h4 className="font-semibold text-gray-900 mt-6 mb-3">
                      Avoid These
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkinType.avoid_ingredients.map(
                        (ingredient, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                          >
                            {ingredient}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Expert Tips
                    </h3>
                    <ul className="space-y-3">
                      {selectedSkinType.tips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 mr-2">💡</span>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkinTypesPage;
