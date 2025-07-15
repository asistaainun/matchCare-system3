import { useQuery } from 'react-query';
import { apiService } from '../services/api';

export const useProducts = (params = {}) => {
  return useQuery(
    ['products', params],
    () => apiService.getProducts(params).then(res => res.data),
    { keepPreviousData: true }
  );
};

export const useProduct = (id) => {
  return useQuery(
    ['product', id],
    () => apiService.getProduct(id).then(res => res.data),
    { enabled: !!id }
  );
};
