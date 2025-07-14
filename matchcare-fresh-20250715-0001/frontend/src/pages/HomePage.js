import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/Products/ProductCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function HomePage() {
  const { data: productsData, isLoading } = useProducts({ limit: 6 });

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-bold mb-6">Find Your Perfect Skincare Match</h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Want to know skincare that suits your skin type? Our AI-powered system analyzes your needs!
            </p>
            <Link to="/quiz" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
              Take Skin Quiz í·ª
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          {isLoading ? (
            <LoadingSpinner text="Loading products..." />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productsData?.data?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
