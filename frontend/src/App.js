import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuizProvider } from "./context/QuizContext";

// Pages
import HomePage from "./pages/HomePage";
import QuizPage from "./pages/QuizPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import IngredientsPage from "./pages/IngredientsPage";
import RoutinePlanner from "./pages/RoutinePlanner";
import EducationCenter from "./pages/EducationCenter";

// Components
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";

// Education Pages
import SkinTypesPage from "./pages/education/SkinTypesPage";
import IngredientsEducationPage from "./pages/education/IngredientsEducationPage";
import RoutineGuidePage from "./pages/education/RoutineGuidePage";
import ProductCategoriesPage from "./pages/education/ProductCategoriesPage";
import SkinConcernsPage from "./pages/education/SkinConcernsPage";

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="flex-1">
          <Routes>
            {/* Home Page */}
            <Route path="/" element={<HomePage />} />

            {/* Quiz Flow - Wrapped with QuizProvider */}
            <Route
              path="/quiz/*"
              element={
                <QuizProvider>
                  <QuizPage />
                </QuizProvider>
              }
            />

            {/* Products Pages */}
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />

            {/* Ingredients Page */}
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/routine-planner" element={<RoutinePlanner />} />
            <Route path="/education" element={<EducationCenter />} />
            {/* Education Routes */}
            <Route path="/education/skin-types" element={<SkinTypesPage />} />
            <Route
              path="/education/ingredients-education"
              element={<IngredientsEducationPage />}
            />
            <Route
              path="/education/routine-guide"
              element={<RoutineGuidePage />}
            />
            <Route
              path="/education/product-categories"
              element={<ProductCategoriesPage />}
            />
            <Route
              path="/education/skin-concerns"
              element={<SkinConcernsPage />}
            />
            {/* 404 Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

// Simple 404 Component
const NotFoundPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <a
        href="/"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go Home
      </a>
    </div>
  </div>
);

export default App;
