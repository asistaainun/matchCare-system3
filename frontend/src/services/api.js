import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000
});

export const apiService = {
  getProducts: (params = {}) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  getRecommendations: (data) => api.post('/quiz/recommendations', data),
  healthCheck: () => api.get('/health')
};

export default api;
