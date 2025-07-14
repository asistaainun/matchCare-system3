import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-2xl text-gray-800">MatchCare</span>
          </Link>
          
          <div className="flex items-center space-x-8">
            <Link to="/" className={`font-medium ${isActive('/') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>Home</Link>
            <Link to="/quiz" className={`font-medium ${isActive('/quiz') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>Skin Quiz</Link>
            <Link to="/products" className={`font-medium ${isActive('/products') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>Products</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
