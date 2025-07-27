// frontend/src/context/QuizContext.js
// FIXED VERSION - Compatible dengan sistem yang sudah ada

import React, { createContext, useContext, useReducer, useCallback } from 'react';

const QuizContext = createContext();

// Initial state - sesuai dengan struktur yang sudah ada
const initialState = {
  // Session info
  sessionId: null,
  currentStep: 1,
  totalSteps: 3,
  
  // Quiz data
  skinType: null,
  skinTypeMethod: 'self_selected',
  concerns: [],
  sensitivities: [],
  
  // Reference data - IMPORTANT: initialize with empty arrays
  referenceData: {
    skin_types: [],
    skin_concerns: [],
    allergen_types: []
  },
  
  // Results
  quizId: null,
  recommendations: [],
  isLoading: false,
  error: null,
  completed: false
};

// Actions - sama seperti sebelumnya
const quizActions = {
  SET_SESSION_ID: 'SET_SESSION_ID',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  SET_SKIN_TYPE: 'SET_SKIN_TYPE',
  SET_CONCERNS: 'SET_CONCERNS',
  SET_SENSITIVITIES: 'SET_SENSITIVITIES',
  SET_REFERENCE_DATA: 'SET_REFERENCE_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_QUIZ_RESULTS: 'SET_QUIZ_RESULTS',
  RESET_QUIZ: 'RESET_QUIZ',
  TOGGLE_CONCERN: 'TOGGLE_CONCERN',
  TOGGLE_SENSITIVITY: 'TOGGLE_SENSITIVITY'
};

// Reducer function
function quizReducer(state, action) {
  switch (action.type) {
    case quizActions.SET_SESSION_ID:
      return {
        ...state,
        sessionId: action.payload,
        error: null
      };
      
    case quizActions.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
      
    case quizActions.SET_SKIN_TYPE:
      return {
        ...state,
        skinType: typeof action.payload === 'string' ? action.payload : action.payload.skinType,
        skinTypeMethod: typeof action.payload === 'object' ? action.payload.method || 'self_selected' : 'self_selected'
      };
      
    case quizActions.SET_CONCERNS:
      return {
        ...state,
        concerns: Array.isArray(action.payload) ? action.payload : []
      };
      
    case quizActions.TOGGLE_CONCERN:
      const concernExists = state.concerns.includes(action.payload);
      return {
        ...state,
        concerns: concernExists 
          ? state.concerns.filter(c => c !== action.payload)
          : [...state.concerns, action.payload]
      };
      
    case quizActions.SET_SENSITIVITIES:
      return {
        ...state,
        sensitivities: Array.isArray(action.payload) ? action.payload : []
      };
      
    case quizActions.TOGGLE_SENSITIVITY:
      const sensitivityExists = state.sensitivities.includes(action.payload);
      return {
        ...state,
        sensitivities: sensitivityExists
          ? state.sensitivities.filter(s => s !== action.payload)
          : [...state.sensitivities, action.payload]
      };
      
    case quizActions.SET_REFERENCE_DATA:
      return {
        ...state,
        referenceData: {
          skin_types: action.payload.skin_types || [],
          skin_concerns: action.payload.skin_concerns || [],
          allergen_types: action.payload.allergen_types || []
        },
        error: null
      };
      
    case quizActions.SET_LOADING:
      return {
        ...state,
        isLoading: Boolean(action.payload)
      };
      
    case quizActions.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
      
    case quizActions.SET_QUIZ_RESULTS:
      return {
        ...state,
        quizId: action.payload.quiz_id,
        recommendations: Array.isArray(action.payload.recommendations) ? action.payload.recommendations : [],
        completed: true,
        isLoading: false,
        error: null
      };
      
    case quizActions.RESET_QUIZ:
      return {
        ...initialState,
        referenceData: state.referenceData // Keep reference data
      };
      
    default:
      return state;
  }
}

// Context Provider
export function QuizProvider({ children }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  
  // API Base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Helper functions
  const setLoading = useCallback((loading) => {
    dispatch({ type: quizActions.SET_LOADING, payload: loading });
  }, []);
  
  const setError = useCallback((error) => {
    dispatch({ type: quizActions.SET_ERROR, payload: error });
  }, []);
  
  // API Functions - ADD MISSING FUNCTIONS
  const startQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Starting quiz session...');
      const response = await fetch(`${API_BASE}/quiz/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        dispatch({ type: quizActions.SET_SESSION_ID, payload: data.data.session_id });
        console.log('✅ Quiz session started:', data.data.session_id);
        return data.data.session_id;
      } else {
        throw new Error(data.message || 'Failed to start quiz');
      }
    } catch (error) {
      console.error('❌ Start quiz error:', error);
      setError(error.message || 'Failed to start quiz session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE, setLoading, setError]);
  
  const fetchReferenceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Fetching reference data...');
      const response = await fetch(`${API_BASE}/quiz/reference-data`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Reference data loaded:', data.data);
        dispatch({ type: quizActions.SET_REFERENCE_DATA, payload: data.data });
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch reference data');
      }
    } catch (error) {
      console.error('❌ Fetch reference data error:', error);
      setError(error.message || 'Failed to load quiz data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE, setLoading, setError]);
  
  const submitQuiz = useCallback(async () => {
    if (!state.sessionId || !state.skinType) {
      setError('Missing required quiz data');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Submitting quiz...', { 
        sessionId: state.sessionId, 
        skinType: state.skinType, 
        concerns: state.concerns, 
        sensitivities: state.sensitivities 
      });
      
      const response = await fetch(`${API_BASE}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          skin_type: state.skinType,
          concerns: state.concerns,
          sensitivities: state.sensitivities
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Quiz submitted successfully:', data.data);
        dispatch({ type: quizActions.SET_QUIZ_RESULTS, payload: data.data });
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('❌ Submit quiz error:', error);
      setError(error.message || 'Failed to submit quiz');
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.sessionId, state.skinType, state.concerns, state.sensitivities, API_BASE, setLoading, setError]);
  
  const fetchRecommendations = useCallback(async (sessionId = state.sessionId) => {
    if (!sessionId) {
      setError('No session ID available');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🎯 Fetching recommendations for:', sessionId);
      const response = await fetch(`${API_BASE}/recommendations/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Recommendations loaded:', data.data.recommendations);
        dispatch({ 
          type: quizActions.SET_QUIZ_RESULTS, 
          payload: { 
            quiz_id: state.quizId || Date.now(),
            recommendations: data.data.recommendations 
          }
        });
        return data.data.recommendations;
      } else {
        throw new Error(data.message || 'Failed to fetch recommendations');
      }
    } catch (error) {
      console.error('❌ Fetch recommendations error:', error);
      setError(error.message || 'Failed to load recommendations');
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.sessionId, state.quizId, API_BASE, setLoading, setError]);
  
  // Basic Actions - KEEP EXISTING INTERFACE
  const actions = {
    // Data setters
    setSessionId: (sessionId) => {
      dispatch({ type: quizActions.SET_SESSION_ID, payload: sessionId });
    },
    
    setCurrentStep: (step) => {
      dispatch({ type: quizActions.SET_CURRENT_STEP, payload: step });
    },
    
    setSkinType: (skinType, method = 'self_selected') => {
      dispatch({ 
        type: quizActions.SET_SKIN_TYPE, 
        payload: typeof skinType === 'string' ? skinType : { skinType, method }
      });
    },
    
    setConcerns: (concerns) => {
      dispatch({ type: quizActions.SET_CONCERNS, payload: concerns });
    },
    
    toggleConcern: (concern) => {
      dispatch({ type: quizActions.TOGGLE_CONCERN, payload: concern });
    },
    
    setSensitivities: (sensitivities) => {
      dispatch({ type: quizActions.SET_SENSITIVITIES, payload: sensitivities });
    },
    
    toggleSensitivity: (sensitivity) => {
      dispatch({ type: quizActions.TOGGLE_SENSITIVITY, payload: sensitivity });
    },
    
    setReferenceData: (data) => {
      dispatch({ type: quizActions.SET_REFERENCE_DATA, payload: data });
    },
    
    setLoading,
    
    setError,
    
    setQuizResults: (results) => {
      dispatch({ type: quizActions.SET_QUIZ_RESULTS, payload: results });
    },
    
    resetQuiz: () => {
      dispatch({ type: quizActions.RESET_QUIZ });
    },
    
    // Navigation helpers - KEEP EXISTING INTERFACE
    nextStep: () => {
      if (state.currentStep < state.totalSteps) {
        dispatch({ 
          type: quizActions.SET_CURRENT_STEP, 
          payload: state.currentStep + 1 
        });
      }
    },
    
    prevStep: () => {
      if (state.currentStep > 1) {
        dispatch({ 
          type: quizActions.SET_CURRENT_STEP, 
          payload: state.currentStep - 1 
        });
      }
    },
    
    // Validation helpers - KEEP EXISTING INTERFACE
    isCurrentStepValid: () => {
      switch (state.currentStep) {
        case 1:
          return !!state.skinType;
        case 2:
          return true; // Concerns are optional
        case 3:
          return true; // Sensitivities are optional
        default:
          return false;
      }
    },
    
    canProceedToNext: () => {
      return actions.isCurrentStepValid() && state.currentStep < state.totalSteps;
    },
    
    canGoBack: () => {
      return state.currentStep > 1;
    },
    
    // API Functions - ADD MISSING FUNCTIONS
    startQuiz,
    fetchReferenceData,
    submitQuiz,
    fetchRecommendations
  };
  
  const value = {
    ...state,
    ...actions
  };
  
  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  );
}

// Custom hook
export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}

export { quizActions };
export default QuizContext;