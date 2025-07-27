import React, { createContext, useContext, useReducer } from 'react';

const QuizContext = createContext();

// Quiz state structure
const initialState = {
  // Session info
  sessionId: null,
  currentStep: 1,
  totalSteps: 3,
  
  // Quiz data
  skinType: null,
  skinTypeMethod: 'self_selected', // 'self_selected' or 'assessment'
  concerns: [],
  sensitivities: [],
  
  // Reference data
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

// Actions
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

// Reducer
function quizReducer(state, action) {
  switch (action.type) {
    case quizActions.SET_SESSION_ID:
      return {
        ...state,
        sessionId: action.payload
      };
      
    case quizActions.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
      
    case quizActions.SET_SKIN_TYPE:
      return {
        ...state,
        skinType: action.payload.skinType,
        skinTypeMethod: action.payload.method || 'self_selected'
      };
      
    case quizActions.SET_CONCERNS:
      return {
        ...state,
        concerns: action.payload
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
        sensitivities: action.payload
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
        referenceData: action.payload
      };
      
    case quizActions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
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
        recommendations: action.payload.recommendations || [],
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
  
  // Actions
  const actions = {
    setSessionId: (sessionId) => {
      dispatch({ type: quizActions.SET_SESSION_ID, payload: sessionId });
    },
    
    setCurrentStep: (step) => {
      dispatch({ type: quizActions.SET_CURRENT_STEP, payload: step });
    },
    
    setSkinType: (skinType, method = 'self_selected') => {
      dispatch({ 
        type: quizActions.SET_SKIN_TYPE, 
        payload: { skinType, method } 
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
    
    setLoading: (loading) => {
      dispatch({ type: quizActions.SET_LOADING, payload: loading });
    },
    
    setError: (error) => {
      dispatch({ type: quizActions.SET_ERROR, payload: error });
    },
    
    setQuizResults: (results) => {
      dispatch({ type: quizActions.SET_QUIZ_RESULTS, payload: results });
    },
    
    resetQuiz: () => {
      dispatch({ type: quizActions.RESET_QUIZ });
    },
    
    // Navigation helpers
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
    
    // Validation helpers
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
    }
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