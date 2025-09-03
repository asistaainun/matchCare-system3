import React from 'react';
import { Link } from 'react-router-dom';

// Test di HomePage.js atau ProductsPage.js
import { testSystemHealth, getOntologyRecommendations } from '../services/api';

// Test function
const testOntology = async () => {
  try {
    console.log('🧪 Testing ontology integration...');
    
    // Test system health
    const health = await testSystemHealth();
    console.log('🏥 System health:', health);
    
    // Test ontology recommendations
    const recommendations = await getOntologyRecommendations({
      skin_type: 'oily',
      concerns: ['acne'],
      sensitivities: []
    });
    
    console.log('🧠 Ontology test successful:', recommendations);
    alert(`Success! Got ${recommendations.recommendations.length} recommendations`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    alert('Test failed: ' + error.message);
  }
};

// Add test button to UI
<button onClick={testOntology} className="bg-green-500 text-white px-4 py-2 rounded">
  🧪 Test Ontology
</button>

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Temukan Skincare yang tepat untuk Kulitmu
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Ingin tahu skincare yang cocok untuk jenis kulitmu? Isi profil kecantikanmu di sini!
          </p>
          
          {/* CTA Button */}
          <Link
            to="/quiz"
            className="inline-block bg-blue-600 text-white text-lg px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Mulai - Ikuti Kuis Kulit
          </Link>
          
          <div className="mt-8 text-gray-500">
            <p> Dapatkan hasil yang dipersonalisasi</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Cara Kerja MatchCare
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Sistem cerdas kami menggunakan pencocokan berbasis ontologi untuk menganalisis bahan-bahan dan menemukan produk yang sempurna untuk kulitmu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧪</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Ikuti Kuis Kulit</h3>
              <p className="text-gray-600">
                Jawab pertanyaan tentang jenis kulit, masalah kulit, dan sensitivitas kulitmu
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analisis AI</h3>
              <p className="text-gray-600">
                Sistem kami menganalisis ribuan produk dan bahan untuk menemukan yang cocok untukmu
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Dapatkan Rekomendasi</h3>
              <p className="text-gray-600">
                Terima saran produk yang dipersonalisasi dengan penjelasan mendetail
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Jelajahi MatchCare
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Browse by Concern */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="font-semibold mb-2">Jelajahi Berdasarkan Masalah Kulit</h3>
                <p className="text-gray-600 text-sm mb-4">Temukan produk untuk jerawat, kekeringan, penuaan</p>
                <Link to="/products?filter=concerns" className="text-blue-600 hover:text-blue-700 font-medium">
                  Jelajahi →
                </Link>
              </div>
            </div>

            {/* Browse by Category */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">📦</div>
                <h3 className="font-semibold mb-2">Kategori Produk</h3>
                <p className="text-gray-600 text-sm mb-4">Cleanser, moisturizer, serum, sunscreen</p>
                <Link to="/products?filter=category" className="text-blue-600 hover:text-blue-700 font-medium">
                  Jelajahi →
                </Link>
              </div>
            </div>

            {/* Browse by Brand */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">🏷️</div>
                <h3 className="font-semibold mb-2">Jelajahi Berdasarkan Merek</h3>
                <p className="text-gray-600 text-sm mb-4">CeraVe, The Ordinary, Cetaphil</p>
                <Link to="/products?filter=brand" className="text-blue-600 hover:text-blue-700 font-medium">
                  Jelajahi →
                </Link>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-4">🌿</div>
                <h3 className="font-semibold mb-2">Pelajari Bahan</h3>
                <p className="text-gray-600 text-sm mb-4">Pahami apa yang ada dalam produk Anda</p>
                <Link to="/ingredients" className="text-blue-600 hover:text-blue-700 font-medium">
                  Pelajari →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;