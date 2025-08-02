// src/services/api.js - UPDATED FOR ONTOLOGY INTEGRATION
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased for ontology processing
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} - ${error.message}`);
    return Promise.reject(error);
  }
);

// ================== CORE API FUNCTIONS ==================

// 🏥 Health Check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
};

// 📦 Products API
export const getProducts = async (params = {}) => {
  try {
    const { page = 1, limit = 20, category, brand, search } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(brand && { brand }),
      ...(search && { search })
    });
    
    const response = await api.get(`/api/products?${queryParams}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
};

export const getProductById = async (productId) => {
  try {
    const response = await api.get(`/api/products/${productId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch product ${productId}: ${error.message}`);
  }
};

// 📂 Categories API
export const getCategories = async () => {
  try {
    const response = await api.get('/api/categories');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }
};

export const getCategoryDetail = async (categoryName) => {
  try {
    const response = await api.get(`/api/categories/${encodeURIComponent(categoryName)}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch category ${categoryName}: ${error.message}`);
  }
};

// 🏷️ Brands API
export const getBrands = async () => {
  try {
    const response = await api.get('/api/brands');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch brands: ${error.message}`);
  }
};

export const getBrandDetail = async (brandId) => {
  try {
    const response = await api.get(`/api/brands/${brandId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch brand ${brandId}: ${error.message}`);
  }
};

// ================== 🧠 ONTOLOGY SYSTEM ==================

// 🎯 TRUE ONTOLOGY-BASED RECOMMENDATIONS (MAIN FEATURE)
export const getOntologyRecommendations = async (profile) => {
  try {
    console.log('🧠 Requesting ontology recommendations with profile:', profile);
    
    const response = await api.post('/api/ontology/recommendations', profile);
    
    if (response.data.success) {
      console.log(`✅ Ontology recommendations: ${response.data.data.recommendations.length} found`);
      console.log(`🧠 Algorithm: ${response.data.algorithm_type}`);
      console.log(`⏱️ Processing time: ${response.data.data.metadata?.processing_time_ms}ms`);
      
      return {
        success: true,
        recommendations: response.data.data.recommendations,
        metadata: response.data.data.metadata,
        academic_analysis: response.data.data.academic_explanation,
        session_id: response.data.session_id,
        algorithm_type: response.data.algorithm_type
      };
    } else {
      throw new Error('Ontology recommendation request failed');
    }
  } catch (error) {
    console.error('❌ Ontology recommendations failed:', error);
    throw new Error(`Failed to get ontology recommendations: ${error.message}`);
  }
};

// 🧪 Quiz System APIs
export const startQuiz = async () => {
  try {
    const response = await api.post('/api/quiz/start');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start quiz: ${error.message}`);
  }
};

export const submitQuiz = async (quizData) => {
  try {
    console.log('📝 Submitting quiz data:', quizData);
    const response = await api.post('/api/quiz/submit', quizData);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to submit quiz: ${error.message}`);
  }
};

export const getQuizRecommendations = async (sessionId) => {
  try {
    const response = await api.get(`/api/recommendations/${sessionId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get quiz recommendations: ${error.message}`);
  }
};

// 🔬 Ingredient Analysis APIs
export const analyzeIngredientConflicts = async (ingredients) => {
  try {
    const response = await api.post('/api/analysis/ingredient-conflicts', {
      ingredients: Array.isArray(ingredients) ? ingredients : [ingredients]
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to analyze ingredient conflicts: ${error.message}`);
  }
};

export const getIngredientSynergies = async () => {
  try {
    const response = await api.get('/api/analysis/synergistic-combos');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get ingredient synergies: ${error.message}`);
  }
};

export const getOntologyStatus = async () => {
  try {
    const response = await api.get('/api/analysis/ontology-status');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get ontology status: ${error.message}`);
  }
};

// ================== UTILITY FUNCTIONS ==================

// 🔄 Test all critical endpoints
export const testSystemHealth = async () => {
  try {
    const results = {
      health: false,
      products: false,
      categories: false,
      brands: false,
      ontology: false
    };

    // Test health
    try {
      await healthCheck();
      results.health = true;
    } catch (e) {
      console.warn('Health check failed:', e.message);
    }

    // Test products
    try {
      await getProducts({ limit: 1 });
      results.products = true;
    } catch (e) {
      console.warn('Products test failed:', e.message);
    }

    // Test categories
    try {
      await getCategories();
      results.categories = true;
    } catch (e) {
      console.warn('Categories test failed:', e.message);
    }

    // Test brands
    try {
      await getBrands();
      results.brands = true;
    } catch (e) {
      console.warn('Brands test failed:', e.message);
    }

    // Test ontology (critical)
    try {
      await getOntologyRecommendations({
        skin_type: 'oily',
        concerns: ['acne'],
        sensitivities: []
      });
      results.ontology = true;
    } catch (e) {
      console.warn('Ontology test failed:', e.message);
    }

    return results;
  } catch (error) {
    console.error('System health test failed:', error);
    return null;
  }
};

// Export default api instance for custom requests
export default api;