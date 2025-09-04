import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SkinConcernsPage = () => {
  const [loading, setLoading] = useState(false);

  // Hardcoded content for now since we don't have this endpoint yet
  const educationData = {
    overview: "Memahami masalah kulit yang umum membantu Anda mengidentifikasi masalah dan memilih perawatan yang tepat.",
    common_concerns: [
      {
        concern: "Acne",
        description: "Kondisi kulit inflamasi yang menyebabkan jerawat, komedo, dan kista",
        causes: [
          "Produksi minyak berlebih",
          "Pori-pori tersumbat",
          "Bakteri (P. acnes)",
          "Perubahan hormonal"
        ],
        treatment_ingredients: ["Salicylic Acid", "Benzoyl Peroxide", "Niacinamide", "Retinoids"],
        routine_tips: [
          "Jangan terlalu sering membersihkan wajah",
          "Gunakan produk non-komedogenik",
          "Konsisten dengan perawatan"
        ]
      },
      {
        concern: "Dark Spots",
        description: "Area kulit yang tampak lebih gelap daripada kulit di sekitarnya",
        causes: [
          "Kerusakan akibat sinar matahari",
          "Hiperpigmentasi pasca-inflamasi",
          "Perubahan hormonal"
        ],
        treatment_ingredients: ["Vitamin C", "Hydroquinone", "Kojic Acid", "Arbutin"],
        routine_tips: [
          "Konsisten menggunakan tabir surya",
          "Pendekatan yang sabar (memerlukan waktu berbulan-bulan)",
          "Gabungkan beberapa agen pencerah"
        ]
      },
      {
        concern: "Fine Lines",
        description: "Tanda-tanda penuaan dini yang disebabkan oleh penurunan kolagen",
        causes: [
          "Proses penuaan alami",
          "Kerusakan akibat sinar UV",
          "Ekspresi wajah yang berulang"
        ],
        treatment_ingredients: ["Retinoids", "Peptides", "Vitamin C", "AHA"],
        routine_tips: [
          "Mulai perawatan anti-aging lebih awal",
          "Gunakan retinoid secara konsisten",
          "Jangan lupakan leher dan tangan"
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>›</span>
            <span className="text-gray-900">Skin Concerns</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Understanding Skin Concerns</h1>
          <p className="text-xl text-gray-600 max-w-3xl">{educationData.overview}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Concerns */}
        <div className="space-y-8">
          {educationData.common_concerns.map((concern, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{concern.concern}</h2>
              <p className="text-gray-600 mb-6">{concern.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Common Causes:</h3>
                  <ul className="space-y-2 mb-6">
                    {concern.causes.map((cause, causeIndex) => (
                      <li key={causeIndex} className="text-gray-700">• {cause}</li>
                    ))}
                  </ul>

                  <h3 className="font-semibold text-gray-900 mb-3">Treatment Ingredients:</h3>
                  <div className="flex flex-wrap gap-2">
                    {concern.treatment_ingredients.map((ingredient, ingredientIndex) => (
                      <span key={ingredientIndex} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Routine Tips:</h3>
                  <ul className="space-y-2">
                    {concern.routine_tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="text-gray-700">💡 {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkinConcernsPage;