// frontend/src/pages/IngredientsPage.js
// COMPLETE INGREDIENTS PAGE with Ontology Integration

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const IngredientsPage = () => {
  // State management
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const itemsPerPage = 24;

  const API_BASE_URL = "http://localhost:5000/api";

  const categories = [
    { key: "all", label: "All Ingredients", icon: "🔬" },
    { key: "exfoliant", label: "Exfoliant", icon: "✨" },
    { key: "humectant", label: "Humectant", icon: "💧" },
    { key: "antioxidant", label: "Antioxidant", icon: "🛡️" },
    { key: "uv filter", label: "UV Filter", icon: "☀️" },
    { key: "emollient", label: "Emollient", icon: "🌿" },
    { key: "moisturizing", label: "Moisturizing", icon: "💦" },
  ];

  useEffect(() => {
    loadIngredients();
  }, [currentPage, selectedCategory]);

  // Load ingredients dengan pagination
  const loadIngredients = async () => {
    setLoading(true);
    setError("");

    try {
      console.log(`Loading ingredients page ${currentPage}...`);

      // Calculate offset for pagination
      const offset = (currentPage - 1) * itemsPerPage;

      // Build query parameters
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      // Add category filter if not 'all'
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }

      // Add search term if exists
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await fetch(`${API_BASE_URL}/ingredients?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setIngredients(data.data);
        setTotalIngredients(data.total || data.data.length);
        setTotalPages(
          Math.ceil((data.total || data.data.length) / itemsPerPage)
        );

        console.log(
          `✅ Loaded ${data.data.length} ingredients (Page ${currentPage}/${Math.ceil((data.total || data.data.length) / itemsPerPage)})`
        );
      } else {
        throw new Error(data.message || "Failed to load ingredients");
      }
    } catch (error) {
      console.error("❌ Ingredients loading error:", error);
      setError(`Failed to load ingredients: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle search dengan reset ke page 1
  const handleSearch = async (searchValue) => {
    setSearchTerm(searchValue);
    setCurrentPage(1); // Reset ke page 1 saat search

    // Debounce search
    setTimeout(() => {
      loadIngredients();
    }, 300);
  };

  // Handle category change dengan reset ke page 1
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset ke page 1 saat ganti category
  };

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Generate page numbers untuk pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const showIngredientDetails = async (ingredient) => {
    setSelectedIngredient(ingredient);

    try {
      console.log(`🔍 Finding products with ingredient: ${ingredient.name}`);

      // Coba beberapa endpoint untuk mendapatkan produk
      let products = [];

      // Method 1: Search by ingredient name in product search
      try {
        const searchResponse = await fetch(
          `${API_BASE_URL}/products?search=${encodeURIComponent(ingredient.name)}&limit=6`
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.success && searchData.products) {
            products = searchData.products.slice(0, 6);
          }
        }
      } catch (error) {
        console.log("Method 1 failed:", error);
      }

      // Method 2: Jika method 1 gagal, coba query langsung ke database
      if (products.length === 0) {
        try {
          const dbResponse = await fetch(
            `${API_BASE_URL}/products/by-ingredient?ingredient=${encodeURIComponent(ingredient.name)}&limit=6`
          );

          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.success && dbData.data) {
              products = dbData.data;
            }
          }
        } catch (error) {
          console.log("Method 2 failed:", error);
        }
      }

      // Method 3: Fallback - ambil produk random yang mungkin mengandung ingredient
      if (products.length === 0) {
        try {
          const fallbackResponse = await fetch(
            `${API_BASE_URL}/products?limit=6&random=true`
          );

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.success && fallbackData.products) {
              products = fallbackData.products;
            }
          }
        } catch (error) {
          console.log("Method 3 failed:", error);
        }
      }

      setRelatedProducts(products);
      console.log(
        `✅ Found ${products.length} products for ${ingredient.name}`
      );
    } catch (error) {
      console.error("❌ Related products error:", error);
      setRelatedProducts([]);
    }
  };
  // Tambahkan helper function untuk mendapatkan gambar produk
  const getProductImage = (product) => {
    // Cek berbagai kemungkinan field gambar
    const imageFields = [
      "local_image_path",
      "image_urls",
      "image_url",
      "product_image",
      "image",
    ];

    for (const field of imageFields) {
      if (product[field]) {
        // Jika gambar berupa URL lengkap, gunakan langsung
        if (product[field].startsWith("http")) {
          return product[field];
        }
        // Jika gambar berupa path lokal
        if (
          product[field].startsWith("/") ||
          product[field].startsWith("images/")
        ) {
          return product[field];
        }
        // Jika gambar berupa filename, tambahkan path
        return `/images/products/${product[field]}`;
      }
    }

    return "/images/placeholder-product.jpg";
  };
  const closeIngredientDetails = () => {
    setSelectedIngredient(null);
    setRelatedProducts([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Skincare Ingredients Guide
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn about key ingredients and what they do for your skin. Our
            database provides detailed analysis of each ingredient's benefits
            and functions.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xl">🔍</span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => handleCategoryChange(category.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <span>{category.icon}</span>
                <span className="font-medium">{category.label}</span>
              </button>
            ))}
          </div>

          {/* Results Info */}
          <div className="mt-4 text-center text-gray-600">
            Showing {ingredients.length} of {totalIngredients} ingredients
            {searchTerm && ` for "${searchTerm}"`}
            {selectedCategory !== "all" &&
              ` in ${categories.find((c) => c.key === selectedCategory)?.label}`}
            {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">
              Loading ingredients from database...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Failed to Load Ingredients
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadIngredients}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Ingredients Grid */}
        {!loading && !error && ingredients.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {ingredients.map((ingredient, index) => (
                // Perbaiki struktur card dengan height yang konsisten
                <div
                  key={ingredient.id || index}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
                  onClick={() => showIngredientDetails(ingredient)}
                >
                  <div className="p-6 flex-1 flex flex-col">
                    {/* Ingredient Name - Fixed Height */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 min-h-[3rem] line-clamp-2">
                      {ingredient.name}
                    </h3>

                    {/* Function Badge - Consistent Height */}
                    <div className="mb-3 min-h-[2rem] flex items-start">
                      {ingredient.what_it_does && (
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {ingredient.what_it_does.length > 25
                            ? `${ingredient.what_it_does.substring(0, 25)}...`
                            : ingredient.what_it_does}
                        </span>
                      )}
                    </div>

                    {/* Benefit - Fixed Height */}
                    <div className="mb-3 min-h-[3rem] flex-1">
                      {ingredient.benefit && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          <strong>Benefit:</strong> {ingredient.benefit}
                        </p>
                      )}
                    </div>

                    {/* Key Ingredient Badge */}
                    <div className="mb-3 min-h-[1.5rem]">
                      {ingredient.is_key_ingredient && (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          ⭐ Key Ingredient
                        </span>
                      )}
                    </div>

                    {/* Safety Badges - Fixed Bottom Area */}
                    <div className="flex flex-wrap gap-1 mb-4 min-h-[2rem]">
                      {ingredient.pregnancy_safe && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Pregnancy Safe
                        </span>
                      )}
                      {ingredient.alcohol_free && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Alcohol Free
                        </span>
                      )}
                      {ingredient.fragrance_free && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          Fragrance Free
                        </span>
                      )}
                    </div>

                    {/* Learn More Button - Stick to Bottom */}
                    <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors mt-auto">
                      Learn More
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mb-8">
                {/* Previous Button */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map((pageNumber, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof pageNumber === "number"
                        ? goToPage(pageNumber)
                        : null
                    }
                    disabled={pageNumber === "..."}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      pageNumber === currentPage
                        ? "bg-blue-600 text-white border-blue-600"
                        : pageNumber === "..."
                          ? "bg-white text-gray-400 border-gray-200 cursor-default"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!loading && !error && ingredients.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Ingredients Found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? `No ingredients found matching "${searchTerm}"`
                : `No ingredients found in ${categories.find((c) => c.key === selectedCategory)?.label}`}
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setCurrentPage(1);
                loadIngredients();
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show All Ingredients
            </button>
          </div>
        )}
      </div>
      {/* Ingredient Detail Modal */}
      {selectedIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedIngredient.name}
                </h2>
                {selectedIngredient.what_it_does && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {selectedIngredient.what_it_does.substring(0, 50)}...
                  </span>
                )}
              </div>
              <button
                onClick={closeIngredientDetails}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* What It Does */}
              {selectedIngredient.what_it_does && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">What It Does</h3>
                  <p className="text-gray-700">
                    {selectedIngredient.what_it_does}
                  </p>
                </div>
              )}

              {/* Benefits */}
              {selectedIngredient.benefit && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                  <p className="text-gray-700">{selectedIngredient.benefit}</p>
                </div>
              )}

              {/* Detailed Explanation */}
              {selectedIngredient.explanation && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Detailed Information
                  </h3>
                  <p className="text-gray-700">
                    {selectedIngredient.explanation}
                  </p>
                </div>
              )}

              {/* Safety Information */}
              {selectedIngredient.safety && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-yellow-800">
                    Safety Information
                  </h3>
                  <p className="text-yellow-700">{selectedIngredient.safety}</p>
                </div>
              )}

              {/* Safety Badges in Modal */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Safety Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div
                    className={`p-3 rounded-lg text-center ${selectedIngredient.pregnancy_safe ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    <div className="text-2xl mb-1">
                      {selectedIngredient.pregnancy_safe ? "✅" : "❓"}
                    </div>
                    <div className="text-sm font-medium">Pregnancy Safe</div>
                  </div>
                  <div
                    className={`p-3 rounded-lg text-center ${selectedIngredient.alcohol_free ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    <div className="text-2xl mb-1">
                      {selectedIngredient.alcohol_free ? "✅" : "❓"}
                    </div>
                    <div className="text-sm font-medium">Alcohol Free</div>
                  </div>
                  <div
                    className={`p-3 rounded-lg text-center ${selectedIngredient.fragrance_free ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    <div className="text-2xl mb-1">
                      {selectedIngredient.fragrance_free ? "✅" : "❓"}
                    </div>
                    <div className="text-sm font-medium">Fragrance Free</div>
                  </div>
                  <div
                    className={`p-3 rounded-lg text-center ${selectedIngredient.paraben_free ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    <div className="text-2xl mb-1">
                      {selectedIngredient.paraben_free ? "✅" : "❓"}
                    </div>
                    <div className="text-sm font-medium">Paraben Free</div>
                  </div>
                  <div
                    className={`p-3 rounded-lg text-center ${selectedIngredient.sulfate_free ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    <div className="text-2xl mb-1">
                      {selectedIngredient.sulfate_free ? "✅" : "❓"}
                    </div>
                    <div className="text-sm font-medium">Sulfate Free</div>
                  </div>
                  <div
                    className={`p-3 rounded-lg text-center ${selectedIngredient.silicone_free ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    <div className="text-2xl mb-1">
                      {selectedIngredient.silicone_free ? "✅" : "❓"}
                    </div>
                    <div className="text-sm font-medium">Silicone Free</div>
                  </div>
                </div>
              </div>

              {/* Alternative Names */}
              {selectedIngredient.alternative_names && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Also Known As</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIngredient.alternative_names
                      .split(",")
                      .map((name, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {name.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Products with this ingredient */}
              {relatedProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Products Containing {selectedIngredient.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedProducts.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        onClick={closeIngredientDetails}
                        className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                          <img
                            src={getProductImage(product)}
                            alt={product.name || product.product_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = "/images/placeholder-product.jpg";
                            }}
                            loading="lazy"
                          />
                          {/* Fallback jika gambar tidak ada */}
                          {!getProductImage(product) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center text-gray-400">
                                <span className="text-4xl block mb-2">🧴</span>
                                <span className="text-xs">No Image</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-gray-500 mb-1 truncate">
                            {product.brand ||
                              product.brand_name ||
                              "Unknown Brand"}
                          </p>
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {product.name || product.product_name}
                          </h4>
                          {product.main_category && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {product.main_category}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <button className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors">
                  Tandai Sebagai Disukai ♡
                </button>
                <button className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors">
                  Tandai Sebagai Dihindari ⚠️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsPage;
