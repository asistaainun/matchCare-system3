// frontend/src/components/Layout/Navbar.js
// FIXED NAVBAR with Working Search Integration

import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLearnDropdownOpen, setIsLearnDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const navItems = [
    { name: "Home", path: "/", icon: "🏠" },
    { name: "Skin Quiz", path: "/quiz", icon: "🧪" },
    { name: "Products", path: "/products", icon: "🧴" },
    { name: "Ingredients", path: "/ingredients", icon: "🌿" },
  ];

  const educationMenuItems = [
    {
      name: "Skin Types",
      path: "/education/skin-types",
      description: "Learn about different skin types",
    },
    {
      name: "Ingredients Guide",
      path: "/education/ingredients-education",
      description: "Understanding skincare ingredients",
    },
    {
      name: "Routine Guide",
      path: "/education/routine-guide",
      description: "Step-by-step skincare routine",
    },
    {
      name: "Product Categories",
      path: "/education/product-categories",
      description: "Types of skincare products",
    },
    {
      name: "Skin Concerns",
      path: "/education/skin-concerns",
      description: "Common skin issues & solutions",
    },
  ];

  // Handle search input change with debouncing
  const handleSearchChange = (value) => {
    setSearchTerm(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search term is too short, clear results
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    // Set loading state
    setSearchLoading(true);

    // Debounce search - wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // ===== PERBAIKI FUNCTION performSearch =====
  const performSearch = async (query) => {
    try {
      console.log(`🔍 Navbar search: "${query}"`);

      const API_BASE_URL =
        process.env.REACT_APP_API_URL || "http://localhost:5000";

      // Search both products and ingredients dengan error handling individual
      const searchPromises = [
        fetch(
          `${API_BASE_URL}/api/products?search=${encodeURIComponent(query)}&limit=5`
        )
          .then((res) => (res.ok ? res.json() : { success: false, data: [] }))
          .catch(() => ({ success: false, data: [] })),

        fetch(
          `${API_BASE_URL}/api/ingredients/search?q=${encodeURIComponent(query)}&limit=5`
        )
          .then((res) => (res.ok ? res.json() : { success: false, data: [] }))
          .catch(() => ({ success: false, data: [] })),
      ];

      const [productsData, ingredientsData] = await Promise.all(searchPromises);

      const results = [];

      // Add product results
      if (
        productsData.success &&
        productsData.data &&
        productsData.data.length > 0
      ) {
        results.push({
          category: "Products",
          items: productsData.data.map((product) => ({
            type: "product",
            id: product.id,
            name: product.name,
            brand: product.brand_name || product.brand || "Unknown Brand",
            category: product.main_category || product.category || "Product",
            path: `/products/${product.id}`,
          })),
        });
      }

      // Add ingredient results
      if (
        ingredientsData.success &&
        ingredientsData.data &&
        ingredientsData.data.length > 0
      ) {
        results.push({
          category: "Ingredients",
          items: ingredientsData.data.map((ingredient) => ({
            type: "ingredient",
            name: ingredient.name,
            function: ingredient.function || "Skincare ingredient",
            benefit:
              ingredient.benefit ||
              ingredient.description ||
              "Various benefits",
            path: `/ingredients?search=${encodeURIComponent(ingredient.name)}`,
          })),
        });
      }

      setSearchResults(results);
      console.log(`✅ Search completed: ${results.length} categories found`);
    } catch (error) {
      console.error("❌ Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search submission (Enter key or search button)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigate to products page with search query
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
      setSearchResults([]);
      setIsSearchFocused(false);
      searchRef.current?.blur();
    }
  };

  // Handle result click
  const handleResultClick = (result) => {
    navigate(result.path);
    setSearchTerm("");
    setSearchResults([]);
    setIsSearchFocused(false);
    searchRef.current?.blur();
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
        setSearchResults([]);
      }
      if (!event.target.closest(".learn-dropdown")) {
        setIsLearnDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MatchCare</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
            {/* TAMBAH: Learn Dropdown Menu */}
            <div className="relative learn-dropdown">
              <button
                onClick={() => setIsLearnDropdownOpen(!isLearnDropdownOpen)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.startsWith("/education")
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg">📚</span>
                <span>Learn</span>
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${isLearnDropdownOpen ? "rotate-180" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isLearnDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                      Educational Content
                    </h3>
                    <p className="text-sm text-gray-500">
                      Learn about skincare fundamentals
                    </p>
                  </div>

                  {educationMenuItems.map((item, index) => (
                    <Link
                      key={index}
                      to={item.path}
                      className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsLearnDropdownOpen(false)}
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.description}
                      </div>
                    </Link>
                  ))}

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <div className="px-4 py-2 text-xs text-gray-400">
                      Comprehensive skincare education for all levels
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Enhanced Search Bar */}
            <div className="relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  placeholder="Search products & ingredients..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  {searchLoading ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-gray-400">🔍</span>
                  )}
                </div>
              </form>

              {/* Search Results Dropdown */}
              {isSearchFocused &&
                (searchResults.length > 0 || searchLoading) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                    {searchLoading && (
                      <div className="p-4 text-center text-gray-500">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Searching...
                      </div>
                    )}

                    {searchResults.map((category, categoryIndex) => (
                      <div
                        key={categoryIndex}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        {/* Category Header */}
                        <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                          {category.category}
                        </div>

                        {/* Category Items */}
                        {category.items.map((item, itemIndex) => (
                          <button
                            key={itemIndex}
                            onClick={() => handleResultClick(item)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                          >
                            {item.type === "product" ? (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {item.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.brand} • {item.category}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {item.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.function} • {item.benefit}
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}

                    {/* View All Results */}
                    {searchTerm.trim().length >= 2 && (
                      <button
                        onClick={handleSearchSubmit}
                        className="w-full px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors text-center font-medium"
                      >
                        View all results for "{searchTerm}"
                      </button>
                    )}
                  </div>
                )}

              {/* No Results Message */}
              {isSearchFocused &&
                !searchLoading &&
                searchTerm.length >= 2 &&
                searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 z-50">
                    No results found for "{searchTerm}"
                  </div>
                )}
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <button
                className="text-gray-700 hover:text-red-500 transition-colors"
                title="Favorites"
              >
                <span className="text-xl">❤️</span>
              </button>
              <button
                className="text-gray-700 hover:text-blue-600 transition-colors"
                title="Profile"
              >
                <span className="text-xl">👤</span>
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              <span className="text-xl">{isMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {/* Mobile Search */}
            <div className="px-4 py-2">
              <form onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  placeholder="Search products & ingredients..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
              </form>
            </div>

            {/* Mobile Navigation Items */}
            <div className="flex flex-col space-y-2 px-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
              {/* TAMBAH: Mobile Learn Section */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="px-4 py-2 text-sm font-medium text-gray-500">
                  Learn
                </div>
                {educationMenuItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.path}
                    className={`flex items-start space-x-2 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>📚</span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
