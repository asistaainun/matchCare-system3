import React from 'react';

const EducationCenter = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Perawatan Kulit
          </h1>
          <p className="text-gray-600 mb-6">
            Cari tahu lebih lanjut tentang perawatan kulit, jenis kulit, dan bahan-bahan
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              📚 Integrasi konten edukasi sedang berlangsung!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationCenter;