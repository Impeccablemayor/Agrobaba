import { useNavigate } from 'react-router-dom';
import { formatPrice, starString } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import type { Product } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  Vegetables: 'fa-apple-whole',
  Grains: 'fa-wheat-awn',
  Tubers: 'fa-leaf',
  Fish: 'fa-fish',
  Poultry: 'fa-egg',
  Fertilizers: 'fa-flask',
  Pesticides: 'fa-spray-can-sparkles',
  Irrigation: 'fa-droplet',
  'Animal Feed': 'fa-bone',
  'Equipment Hire': 'fa-tractor',
  Veterinary: 'fa-stethoscope',
  Consultancy: 'fa-user-tie',
  default: 'fa-box',
};

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const icon = CATEGORY_ICONS[product.category] || CATEGORY_ICONS.default;

  const detailPath = product.type === 'service' ? `/shop/service/${product.id}` : `/shop/product/${product.id}`;

  function handleQuickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addToCart(product, 1, 'Standard');
  }

  return (
    <div className="card" onClick={() => navigate(detailPath)}>
      <div className="card-img">
        {product.discount > 0 && <div className="disc-tag">{product.discount}% OFF</div>}
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="card-img-inner">
            <i className={`fa-solid ${icon}`}></i>
            <span className="cat-label">{product.category}</span>
          </div>
        )}
        <button className="quick-add" onClick={handleQuickAdd}>
          <i className="fa-solid fa-cart-plus"></i>
        </button>
      </div>
      <div className="card-body">
        <div className="card-stars">
          {starString(product.rating)} <span>({product.reviews || 0})</span>
        </div>
        <div className="card-name">{product.name}</div>
        <div className="card-seller">
          <i className="fa-solid fa-circle-check"></i>
          {product.sellerName}
          {product.verified && (
            <span className="verified-chip">
              <i className="fa-solid fa-circle-check"></i> Verified
            </span>
          )}
        </div>
        <div className="card-bottom">
          <div className="card-price">
            {formatPrice(product.price)}{' '}
            {product.discount > 0 && (
              <del>{formatPrice(Math.round(product.price / (1 - product.discount / 100)))}</del>
            )}
          </div>
          <button className="card-add-btn" onClick={handleQuickAdd}>
            {product.type === 'service' ? 'Book' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
