import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Layout/Navbar';
import HomePage from './pages/HomePage';
import SkinQuizPage from './pages/SkinQuizPage';
import ProductsPage from './pages/ProductsPage';
import './styles/index.css';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quiz" element={<SkinQuizPage />} />
            <Route path="/products" element={<ProductsPage />} />
          </Routes>
        </div>
        <Toaster position="top-right" />
      </Router>
    </QueryClientProvider>
  );
}
