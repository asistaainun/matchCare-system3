const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  TIMEOUT: 15000
};

export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log(`🔗 API Call: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: { 
        'Content-Type': 'application/json', 
        ...options.headers 
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Success: ${endpoint}`);
    return data;
    
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    throw error;
  }
};

export default API_CONFIG;