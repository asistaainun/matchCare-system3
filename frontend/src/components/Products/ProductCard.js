import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const badges = [];
  if (product.alcohol_free) badges.push({ text: 'Alcohol Free', color: 'green' });
  if (product.fragrance_free) badges.push({ text: 'Fragrance Free', color: 'blue' });
  if (product.paraben_free) badges.push({ text: 'Paraben Free', color: 'purple' });

  const getBadgeClass = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800'
    };
    return colors[color] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="card">
      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <span className="text-gray-500">Product Image</span>
        {product.ontology_score && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            Score: {product.ontology_score}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{product.name}</h3>
        <p className="text-blue-600 font-medium">{product.Brand?.name}</p>
        <p className="text-sm text-gray-500 mb-3">{product.product_type}</p>
        
        {product.reasoning && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">{product.reasoning}</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1 mb-3">
          {badges.slice(0, 3).map((badge, index) => (
            <span key={index} className={`text-xs px-2 py-1 rounded-full ${getBadgeClass(badge.color)}`}>
              {badge.text}
            </span>
          ))}
        </div>
        
        <Link to={`/products/${product.id}`} className="btn-primary w-full text-center block">
          View Details
        </Link>
      </div>
    </div>
  );
}
