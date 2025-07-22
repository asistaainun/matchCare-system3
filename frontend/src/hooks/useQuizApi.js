// src/hooks/useQuizApi.js
import { useState, useCallback } from 'react';
import { useQuiz } from '../context/QuizContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useQuizApi() {
  const { setLoading, setError, setSessionId, setReferenceData, setQuizResults } = useQuiz();
  const [apiError, setApiError] = useState(null);

  // Generic API call wrapper
  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      setApiError(null);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed');
      }

      if (!data.success) {
        throw new Error(data.error || data.message || 'API response indicated failure');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
      setApiError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Start quiz session
  const startQuizSession = useCallback(async () => {
    try {
      const data = await apiCall('/api/quiz/start', {
        method: 'POST',
      });

      setSessionId(data.data.session_id);
      return data.data;
    } catch (error) {
      console.error('Failed to start quiz session:', error);
      throw error;
    }
  }, [apiCall, setSessionId]);

  // Get reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const data = await apiCall('/api/quiz/reference-data');
      setReferenceData(data.data);
      return data.data;
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
      throw error;
    }
  }, [apiCall, setReferenceData]);

  // Submit quiz
  const submitQuiz = useCallback(async (quizData) => {
    try {
      const { sessionId, skinType, concerns, sensitivities } = quizData;

      if (!sessionId || !skinType) {
        throw new Error('Session ID and skin type are required');
      }

      const data = await apiCall('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          skin_type: skinType,
          concerns: concerns || [],
          sensitivities: sensitivities || [],
        }),
      });

      setQuizResults(data.data);
      return data.data;
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      throw error;
    }
  }, [apiCall, setQuizResults]);

  // Get recommendations
  const fetchRecommendations = useCallback(async (quizId, options = {}) => {
    try {
      const { limit = 20, offset = 0 } = options;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const data = await apiCall(`/api/quiz/${quizId}/recommendations?${queryParams}`);
      return data.data;
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      throw error;
    }
  }, [apiCall]);

  // Update quiz step (partial update)
  const updateQuizStep = useCallback(async (quizId, updates) => {
    try {
      const data = await apiCall(`/api/quiz/${quizId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      return data.data;
    } catch (error) {
      console.error('Failed to update quiz step:', error);
      throw error;
    }
  }, [apiCall]);

  return {
    // API methods
    startQuizSession,
    fetchReferenceData,
    submitQuiz,
    fetchRecommendations,
    updateQuizStep,
    
    // State
    apiError,
    
    // Utility
    clearError: () => {
      setError(null);
      setApiError(null);
    }
  };
}

// Custom hook for quiz initialization
export function useQuizInitialization() {
  const { sessionId, referenceData } = useQuiz();
  const { startQuizSession, fetchReferenceData } = useQuizApi();
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  const initializeQuiz = useCallback(async () => {
    try {
      setInitError(null);
      
      // Start session if not exists
      if (!sessionId) {
        await startQuizSession();
      }
      
      // Fetch reference data if not exists
      if (!referenceData.skin_types.length) {
        await fetchReferenceData();
      }
      
      setInitialized(true);
    } catch (error) {
      console.error('Quiz initialization failed:', error);
      setInitError(error.message);
    }
  }, [sessionId, referenceData, startQuizSession, fetchReferenceData]);

  return {
    initialized,
    initError,
    initializeQuiz
  };
}

// Custom hook for quiz submission with validation
export function useQuizSubmission() {
  const { sessionId, skinType, concerns, sensitivities, isLoading } = useQuiz();
  const { submitQuiz } = useQuizApi();
  const [submissionError, setSubmissionError] = useState(null);

  const handleSubmitQuiz = useCallback(async () => {
    try {
      setSubmissionError(null);

      // Validation
      if (!sessionId) {
        throw new Error('Quiz session not initialized');
      }
      
      if (!skinType) {
        throw new Error('Please select your skin type');
      }

      // Submit quiz
      const result = await submitQuiz({
        sessionId,
        skinType,
        concerns,
        sensitivities
      });

      return result;
    } catch (error) {
      console.error('Quiz submission failed:', error);
      setSubmissionError(error.message);
      throw error;
    }
  }, [sessionId, skinType, concerns, sensitivities, submitQuiz]);

  const canSubmit = sessionId && skinType && !isLoading;

  return {
    handleSubmitQuiz,
    canSubmit,
    submissionError,
    isSubmitting: isLoading
  };
}

export default useQuizApi;