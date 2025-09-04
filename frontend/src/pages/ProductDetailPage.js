// frontend/src/pages/ProductDetailPage.js
// COMPLETE PRODUCT DETAIL PAGE with Backend & Ontology Integration

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State management
  const [product, setProduct] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [keyIngredients, setKeyIngredients] = useState([]);
  const [safetyAnalysis, setSafetyAnalysis] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [imageError, setImageError] = useState(false);

  // Load product data on mount
  useEffect(() => {
    if (id) {
      loadProductDetail();
    }
  }, [id]);

  // Load complete product information
  const loadProductDetail = async () => {
    setLoading(true);
    setError("");

    try {
      console.log(`🔍 Loading product detail for ID: ${id}`);

      // 1. Load basic product info
      const productResponse = await fetch(
        `http://localhost:5000/api/products/${id}`
      );

      if (!productResponse.ok) {
        throw new Error(`Product not found (${productResponse.status})`);
      }
      const productData = await productResponse.json();

      console.log("🔍 Raw API Response:", productData);

      // FIXED: Handle response structure correctly
      if (!productData.success || !productData.product) {
        throw new Error("Product data not found in response");
      }
      
      const product = productData.product;
      console.log("✅ Processed Product:", product);

      setProduct(product);

      // 2. Load ingredient analysis - DENGAN FALLBACK
      console.log("🔍 Processing ingredient data:");

      // Backend sends `ingredients` array (already parsed)
      if (product.ingredients && Array.isArray(product.ingredients)) {
        console.log(`📋 Using ${product.ingredients.length} ingredients from backend array`);
        setIngredients(product.ingredients);
      } else {
        console.log("⚠️ No ingredients array from backend, setting empty");
        setIngredients([]);
      }

      // FIXED: Backend sends `key_ingredients` as ARRAY, not string
      if (product.key_ingredients && Array.isArray(product.key_ingredients)) {
        console.log(`🔑 Using ${product.key_ingredients.length} key ingredients from backend array`);
        setKeyIngredients(product.key_ingredients);
      } else {
        console.log("⚠️ No key ingredients array from backend, setting empty");
        setKeyIngredients([]);
      }


      // Generate safety analysis
      await performSafetyAnalysis(product);

      // Load similar products
      await loadSimilarProducts(product);
    } catch (error) {
      console.error("❌ Product detail error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  const performSafetyAnalysis = async (product) => {
    try {
      console.log("🛡️ Performing safety analysis...");

      const safetyFlags = [];
      const safetyProperties = [];

      // Product-level safety properties
      if (product.alcohol_free) safetyProperties.push("Alcohol Free");
      if (product.fragrance_free) safetyProperties.push("Fragrance Free");
      if (product.paraben_free) safetyProperties.push("Paraben Free");
      if (product.sulfate_free) safetyProperties.push("Sulfate Free");
      if (product.silicone_free) safetyProperties.push("Silicone Free");

      // Key ingredient-based analysis
      if (product.key_ingredients) {
        product.key_ingredients.forEach((keyIngredient) => {
          const name = keyIngredient.name.toLowerCase();
          
          // Check for specific ingredient warnings
          if (name.includes('retinol') || name.includes('retinoid')) {
            safetyFlags.push({
              type: "warning",
              ingredient: keyIngredient.name,
              message: `${keyIngredient.name} - use at night only and avoid during pregnancy`,
              source: "ingredient_analysis"
            });
          }
          
          if (name.includes('acid') && !name.includes('hyaluronic')) {
            safetyFlags.push({
              type: "info",
              ingredient: keyIngredient.name,
              message: `${keyIngredient.name} - use sunscreen and start slowly`,
              source: "ingredient_analysis"
            });
          }
          
          if (name.includes('vitamin c') || name.includes('ascorbic')) {
            safetyFlags.push({
              type: "info",
              ingredient: keyIngredient.name,
              message: `${keyIngredient.name} - best used in morning with sunscreen`,
              source: "ingredient_analysis"
            });
          }
        });
      }

      setSafetyAnalysis({
        overallSafety: safetyFlags.some(flag => flag.type === 'warning') ? 'Caution Required' : 'Safe',
        flags: safetyFlags,
        properties: safetyProperties,
        analysis: `Safety analysis of ${product.key_ingredients_count} key ingredients`,
        analysisMethod: "CSV_PLUS_KEY_INGREDIENT_TYPES",
        confidence: "high"
      });

      console.log(`✅ Safety analysis complete: ${safetyFlags.length} flags, ${safetyProperties.length} properties`);

    } catch (error) {
      console.error("❌ Safety analysis error:", error);
    }
  };

  // Parse ingredients from product description as fallback
  const parseIngredientsFromBackend = async (productIngredients) => {
    try {
      if (!productIngredients || productIngredients.length === 0) return;

      console.log(
        "🧪 Processing ingredients from backend:",
        productIngredients
      );

      const ingredientAnalysis = productIngredients.map((ingredient) => ({
        name: ingredient.name,
        isKey: ingredient.is_key || false,
        functions: ingredient.functions || [],
        benefits: ingredient.benefits || [],
        ontologyData: {
          function: ingredient.functions?.join(", "),
          benefit: ingredient.benefits?.join(", "),
          explanation: ingredient.categories?.join(", "),
          suitable_for: ingredient.suitable_for?.join(", "),
          addresses: ingredient.addresses?.join(", "),
        },
      }));

      setIngredients(ingredientAnalysis);
      console.log(
        `✅ Processed ${ingredientAnalysis.length} ingredients from backend`
      );
    } catch (error) {
      console.error("❌ Backend ingredient processing error:", error);
    }
  };

  // 2. PERBAIKI parseWithOntologyFirst() - ganti function yang ada
  const parseWithOntologyFirst = async (ingredientList, keyIngredients) => {
    console.log("🧠 parseWithOntologyFirst called with:");
    console.log("- ingredientList:", ingredientList);
    console.log("- keyIngredients:", keyIngredients);
    console.log("- ingredientList type:", typeof ingredientList);
    console.log("- ingredientList length:", ingredientList?.length || 0);

    try {
      console.log("🧠 ONTOLOGY-FIRST: Starting comprehensive analysis...");
      console.log("📋 Raw ingredient_list:", ingredientList);

      if (!ingredientList) {
        setIngredients([]);
        return;
      }

      // FIXED: Parse ALL ingredients dengan cleaning yang lebih aggressive
      let cleanedList = ingredientList
        .replace(
          /^(KOMPOSISI\s*:?\s*|INGREDIENTS\s*:?\s*|BAHAN\s*:?\s*|INCI\s*:?\s*)/i,
          ""
        )
        .trim();

      console.log("🧹 Cleaned ingredient_list:", cleanedList);

      const allIngredients = cleanedList
        .split(/[,|;]/)
        .map(
          (ing) =>
            ing
              .trim()
              .replace(/^\d+\.\s*/, "") // Remove numbering like "1. "
              .replace(/^-\s*/, "") // Remove dashes "- "
              .replace(/\s+/g, " ") // Normalize spaces
              .toUpperCase() // Normalize case
        )
        .filter((ing) => {
          // More aggressive filtering
          return (
            ing.length > 2 &&
            !ing.match(/^(DLL|ETC|AND|OR|WATER\s*\(|AQUA\s*\(|H2O)$/i) &&
            !ing.match(/^\d+$/) && // Remove pure numbers
            ing.trim().length > 0
          );
        });

      const keyIngredientsArray = keyIngredients
        ? keyIngredients
            .split(/[,|;]/)
            .map((ing) => ing.trim().toUpperCase())
            .filter((ing) => ing.length > 2)
        : [];

      console.log(`🔍 PARSED ${allIngredients.length} total ingredients:`);
      console.log(`📋 First 10 ingredients:`, allIngredients.slice(0, 10));
      console.log(
        `🔑 ${keyIngredientsArray.length} key ingredients:`,
        keyIngredientsArray
      );
      console.log(`🔍 DETAILED PARSING RESULT:`);
      console.log(`- Raw ingredientList: "${ingredientList}"`);
      console.log(`- Cleaned ingredientList: "${cleanedList}"`);
      console.log(`- Split result length: ${allIngredients.length}`);
      console.log(`- First 5 parsed:`, allIngredients.slice(0, 5));
      console.log(`- All parsed ingredients:`, allIngredients);
      const ingredientAnalysis = [];

      // Process ALL ingredients - PENTING: Jangan batasi dengan slice()
      for (const ingredient of allIngredients) {
        const isKey = keyIngredientsArray.some(
          (key) => key === ingredient // Exact match after normalization
        );

        let ontologyData = null;
        // Only query ontology for key ingredients to avoid overload
        if (isKey) {
          try {
            console.log(
              `🔍 Querying ontology for key ingredient: ${ingredient}`
            );
            const response = await fetch(
              `http://localhost:5000/api/ingredients?search=${encodeURIComponent(ingredient)}&limit=1`
            );
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
              ontologyData = data.data[0];
              console.log(`✅ Found ontology data for: ${ingredient}`);
            }
          } catch (err) {
            console.warn(`⚠️ Ontology query failed for: ${ingredient}`, err);
          }
        }

        ingredientAnalysis.push({
          name: ingredient,
          isKey: isKey,
          ontologyData: ontologyData,
          ontologyPowered: !!ontologyData,
          analysisMethod: isKey ? "ONTOLOGY_QUERY" : "BASIC_PARSE",
        });
      }

      setIngredients(ingredientAnalysis);
      console.log(`✅ PROCESSED ALL ${ingredientAnalysis.length} ingredients`);
      console.log(
        `🔑 Key ingredients: ${ingredientAnalysis.filter((ing) => ing.isKey).length}`
      );
      console.log(
        `🧠 Ontology powered: ${ingredientAnalysis.filter((ing) => ing.ontologyPowered).length}`
      );

      // Perform advanced safety analysis
      await performAdvancedSafetyAnalysis(ingredientAnalysis);
    } catch (error) {
      console.error("❌ ONTOLOGY-FIRST parsing error:", error);
      setIngredients([]);
    }
  };

  // MULTIPLE ONTOLOGY ENDPOINTS untuk coverage maksimal
  const queryMultipleOntologyEndpoints = async (ingredient) => {
    const endpoints = [
      // Primary: Ingredient search
      `http://localhost:5000/api/ingredients?search=${encodeURIComponent(ingredient)}&limit=1`,
      // Secondary: Key ingredients
      `http://localhost:5000/api/ingredients/key-ingredients`,
      // Tertiary: Benefits lookup
      `http://localhost:5000/api/ingredients/benefits`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success && data.data) {
          // Primary endpoint - direct match
          if (endpoint.includes("search=")) {
            if (data.data.length > 0) {
              return data.data[0];
            }
          }

          // Secondary endpoint - find in key ingredients
          if (endpoint.includes("key-ingredients")) {
            for (const [category, ingredients] of Object.entries(data.data)) {
              const match = ingredients.find(
                (ing) =>
                  ing.name.toLowerCase().includes(ingredient.toLowerCase()) ||
                  ingredient.toLowerCase().includes(ing.name.toLowerCase())
              );
              if (match) {
                return {
                  ...match,
                  category: category,
                  isKeyIngredient: true,
                };
              }
            }
          }

          // Tertiary endpoint - find in benefits
          if (endpoint.includes("benefits")) {
            for (const [category, benefits] of Object.entries(data.data)) {
              if (
                benefits.some((benefit) =>
                  benefit.toLowerCase().includes(ingredient.toLowerCase())
                )
              ) {
                return {
                  name: ingredient,
                  benefit: benefits.join(", "),
                  category: category,
                  source: "benefits_mapping",
                };
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Endpoint ${endpoint} failed:`, error);
        continue;
      }
    }

    return null;
  };

  // Load ingredient analysis using ontology
  const loadIngredientAnalysis = async (ingredientList, keyIngredients) => {
    try {
      console.log("🧪 Analyzing ingredients with ontology...");

      // Parse ingredients
      const allIngredients = ingredientList.split(",").map((ing) => ing.trim());
      const keyIngredientsArray = keyIngredients
        ? keyIngredients.split(",").map((ing) => ing.trim())
        : [];

      // Get ontology analysis for key ingredients
      const ingredientAnalysis = [];

      for (const ingredient of keyIngredientsArray.slice(0, 5)) {
        // Limit to 5 key ingredients
        try {
          const response = await fetch(
            `http://localhost:5000/api/ingredients?search=${encodeURIComponent(ingredient)}&limit=1`
          );
          const data = await response.json();

          if (data.success && data.data.length > 0) {
            ingredientAnalysis.push({
              name: ingredient,
              isKey: true,
              ontologyData: data.data[0],
            });
          } else {
            ingredientAnalysis.push({
              name: ingredient,
              isKey: true,
              ontologyData: null,
            });
          }
        } catch (err) {
          console.warn(`⚠️ Could not analyze ingredient: ${ingredient}`);
          ingredientAnalysis.push({
            name: ingredient,
            isKey: true,
            ontologyData: null,
          });
        }
      }

      // Add regular ingredients
      allIngredients.forEach((ingredient) => {
        if (!keyIngredientsArray.includes(ingredient)) {
          ingredientAnalysis.push({
            name: ingredient,
            isKey: false,
            ontologyData: null,
          });
        }
      }); // ONTOLOGY FALLBACK: Parse + Query ontology untuk SEMUA ingredients
      await parseWithOntologyFirst(
        product.ingredient_list,
        product.key_ingredients
      );

      setIngredients(ingredientAnalysis);
      console.log(
        `✅ Ingredient analysis complete: ${ingredientAnalysis.length} ingredients`
      );

      // Perform safety analysis
      await performAdvancedSafetyAnalysis(ingredientAnalysis);
    } catch (error) {
      console.error("❌ Ingredient analysis error:", error);
    }
  };

  // Safety analysis based on ontology data
  // ADVANCED SAFETY ANALYSIS dengan ontology
  const performAdvancedSafetyAnalysis = async (ingredientAnalysis) => {
    try {
      console.log("🛡️ ADVANCED ONTOLOGY SAFETY ANALYSIS...");

      const safetyFlags = [];
      const ontologyInsights = [];
      let overallSafety = "Safe";
      let ontologyConfidence = 0;

      // Analyze each ingredient
      ingredientAnalysis.forEach((ingredient) => {
        if (ingredient.ontologyData) {
          ontologyConfidence += 1;

          const data = ingredient.ontologyData;

          // Safety warnings dari ontology
          if (data.safety && data.safety.toLowerCase().includes("caution")) {
            safetyFlags.push({
              type: "warning",
              ingredient: ingredient.name,
              message: `${ingredient.name}: ${data.safety}`,
              source: "ontology",
            });
            overallSafety = "Caution Required";
          }

          // Function-based analysis
          if (data.function) {
            const functions = data.function.toLowerCase();

            if (functions.includes("exfoliant")) {
              safetyFlags.push({
                type: "info",
                ingredient: ingredient.name,
                message: `${ingredient.name} is an exfoliant - use sunscreen and start slowly`,
                source: "ontology_function",
              });
            }

            if (
              functions.includes("retinoid") ||
              functions.includes("retinol")
            ) {
              safetyFlags.push({
                type: "warning",
                ingredient: ingredient.name,
                message: `${ingredient.name} is a retinoid - avoid during pregnancy, use at night only`,
                source: "ontology_function",
              });
            }
          }

          // Benefit insights
          if (data.benefit) {
            ontologyInsights.push({
              ingredient: ingredient.name,
              insight: data.benefit,
              category: data.category || "General",
            });
          }
        }
      });

      // Calculate ontology confidence
      const confidencePercentage = Math.round(
        (ontologyConfidence / ingredientAnalysis.length) * 100
      );

      // Product-level safety properties
      const safetyProps = [];
      if (product?.alcohol_free) safetyProps.push("Alcohol Free");
      if (product?.fragrance_free) safetyProps.push("Fragrance Free");
      if (product?.paraben_free) safetyProps.push("Paraben Free");
      if (product?.sulfate_free) safetyProps.push("Sulfate Free");
      if (product?.silicone_free) safetyProps.push("Silicone Free");

      setSafetyAnalysis({
        overallSafety,
        flags: safetyFlags,
        properties: safetyProps,
        ontologyInsights,
        ontologyConfidence: confidencePercentage,
        analysis: `Advanced ontology analysis of ${ingredientAnalysis.length} ingredients (${confidencePercentage}% ontology coverage)`,
        analysisMethod: "SPARQL_SEMANTIC_SAFETY_ANALYSIS",
      });

      console.log(
        `✅ SAFETY ANALYSIS COMPLETE: ${safetyFlags.length} flags, ${ontologyInsights.length} insights`
      );
    } catch (error) {
      console.error("❌ Advanced safety analysis error:", error);
    }
  };

  // Load similar products using ontology recommendations
  const loadSimilarProducts = async (currentProduct) => {
    try {
      console.log("🔍 Finding similar products...");

      const params = new URLSearchParams({
        category: currentProduct.main_category || "",
        limit: "4",
      });

      const response = await fetch(`http://localhost:5000/api/products?${params}`);
      const data = await response.json();

      if (data.success) {
        const similar = data.products
          ?.filter(p => p.id !== currentProduct.id)
          .slice(0, 4) || [];

        setSimilarProducts(similar);
        console.log(`✅ Found ${similar.length} similar products`);
      }
    } catch (error) {
      console.error("❌ Similar products error:", error);
    }
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  // Get image URL with fallback
  const getImageUrl = () => {
    if (!product) return "/images/placeholder-product.jpg";

    // Backend sends single image URL string, not comma-separated
    if (product.image_urls && !imageError) {
      return product.image_urls;
    }
    return "/images/placeholder-product.jpg";
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate("/products")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Products
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <span>›</span>
          <Link to="/products" className="hover:text-blue-600">Products</Link>
          <span>›</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {imageError ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-400">
                      <span className="text-6xl mb-4 block">🧴</span>
                      <span>Product Image</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={getImageUrl()}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Brand & Category */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">
                  {product.brand?.name || "Unknown Brand"}
                </span>
                {product.product_type && (
                  <>
                    <span className="mx-2">•</span>
                    <span>{product.product_type}</span>
                  </>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {product.main_category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {product.main_category}
                  </span>
                )}
                {product.subcategory && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    {product.subcategory}
                  </span>
                )}
              </div>

              

              {/* BPOM Registration */}
              {product.bpom_number && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-green-600 text-xl mr-3">🏛️</span>
                    <div>
                      <h3 className="font-semibold text-green-800">BPOM Registered</h3>
                      <p className="text-sm text-green-700">
                        Registration Number: <span className="font-mono font-medium">{product.bpom_number}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Properties */}
              {safetyAnalysis && safetyAnalysis.properties.length > 0 && (
                <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                  <h3 className="font-semibold text-green-800 mb-2">What's Inside (and What Isn't)</h3>
                  <div className="flex flex-wrap gap-2">
                    {safetyAnalysis.properties.map((prop, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm"
                      >
                        ✓ {prop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Analysis */}
              {safetyAnalysis && safetyAnalysis.flags.length > 0 && (
                <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
                  <h3 className="font-semibold text-yellow-800 mb-2">Usage Recommendations</h3>
                  <div className="space-y-2">
                    {safetyAnalysis.flags.map((flag, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        <strong>{flag.type === "warning" ? "⚠️" : "ℹ️"}</strong> {flag.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                  Add to Favorites ♡
                </button>
                {product.product_url && (
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors text-center"
                  >
                    Visit Store 🛒
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { key: "overview", label: "Overview", icon: "📋" },
                { key: "ingredients", label: "Ingredients", icon: "🧪" },
                { key: "usage", label: "How to Use", icon: "📖" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Product Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {product.description || "No description available for this product."}
                  </p>
                </div>

                {product.suitable_for_skin_types && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Suitable For</h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(product.suitable_for_skin_types) 
                        ? product.suitable_for_skin_types.map((skinType, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                            >
                              {skinType} Skin
                            </span>
                          ))
                        : product.suitable_for_skin_types.split(",").map((skinType, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                            >
                              {skinType.trim()} Skin
                            </span>
                          ))
                      }
                    </div>
                  </div>
                )}

                {product.addresses_concerns && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Addresses Concerns</h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(product.addresses_concerns) 
                        ? product.addresses_concerns.map((concern, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                            >
                              {concern}
                            </span>
                          ))
                        : product.addresses_concerns.split(",").map((concern, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                            >
                              {concern.trim()}
                            </span>
                          ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "ingredients" && (
              <div className="space-y-6">
                {/* Key Ingredients Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Key Ingredients
                  </h3>

                  {keyIngredients.length > 0 ? (
                    <div className="space-y-4">
                      {keyIngredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 text-lg">
                              {ingredient.details?.display_name || ingredient.name}
                            </h4>
                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Key Ingredient
                            </div>
                          </div>

                          {/* Key Ingredient Details */}
                          {ingredient.details && ingredient.details.source !== 'csv_only' && (
                            <div className="space-y-3">
                              {/* Category */}
                              {ingredient.details.category && (
                                <div>
                                  <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                    {ingredient.details.category}
                                  </span>
                                </div>
                              )}

                              {/* Description */}
                              {ingredient.details.description && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">What it does: </span>
                                  <span className="text-sm text-gray-600">
                                    {ingredient.details.description}
                                  </span>
                                </div>
                              )}

                              {/* Notes if available */}
                              {ingredient.details.notes && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Notes: </span>
                                  <span className="text-sm text-gray-600">
                                    {ingredient.details.notes}
                                  </span>
                                </div>
                              )}

      
                            </div>
                          )}

                          {/* No details available */}
                          {(!ingredient.details || ingredient.details.source === 'csv_only') && (
                            <div className="text-sm text-gray-600 italic">
                              Key ingredient from product label - detailed information not available in database
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 italic">
                      No key ingredients data available.
                    </p>
                  )}
                </div>

                {/* Full Ingredient List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Full Ingredient List
                  </h3>
                  
                  {ingredients.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-1">
                        {ingredients.map((ingredient, index) => (
                          <span
                            key={index}
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              ingredient.is_key
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "bg-gray-200 text-gray-700"
                            }`}
                            title={`Position: ${ingredient.position || index + 1} | Source: ${ingredient.source}`}
                          >
                            {ingredient.name}
                            {ingredient.is_key && ' ⭐'}
                          </span>
                        ))}
                      </div>
                      
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600">No ingredient data available</p>
                      {product.ingredient_list_raw && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                            Show raw ingredient list
                          </summary>
                          <pre className="mt-2 text-xs text-gray-500 bg-white p-2 rounded border overflow-auto max-h-32">
                            {product.ingredient_list_raw}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "usage" && (
              <div>
                <h3 className="text-lg font-semibold mb-4">How to Use</h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.how_to_use || "Usage instructions not available for this product."}
                  </p>
                </div>

                {/* Key ingredient usage tips */}
                {keyIngredients.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Key Ingredient Tips</h4>
                    <div className="space-y-2">
                      {keyIngredients
                        .filter(ing => ing.details && ing.details.category)
                        .map((ingredient, index) => (
                          <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3">
                            <span className="font-medium text-blue-900">
                              {ingredient.details.display_name || ingredient.name}
                            </span>
                            <span className="text-blue-800 ml-2">
                              ({ingredient.details.category})
                            </span>
                            {ingredient.details.description && (
                              <p className="text-sm text-blue-700 mt-1">
                                {ingredient.details.description}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Similar Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((similar) => (
                <Link
                  key={similar.id}
                  to={`/products/${similar.id}`}
                  className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={similar.image || "/images/placeholder-product.jpg"}
                      alt={similar.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "/images/placeholder-product.jpg";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-1">
                      {similar.brand}
                    </p>
                    <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {similar.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
