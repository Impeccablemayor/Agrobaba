import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, starString } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import { CATEGORY_ICONS } from '../lib/constants';
import type { Product } from '../types';

export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const icon = CATEGORY_ICONS[product.category] || CATEGORY_ICONS.default;

  const isService = product.type === 'service';
  const detailPath = isService ? `/shop/service/${product.id}` : `/shop/product/${product.id}`;

  function handleQuickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (isService) {
      // Booking a service needs a date/location/notes — there's no valid "quick add", so go to the real booking form.
      navigate(detailPath);
      return;
    }
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
        {!isService && (
          <button className="quick-add" onClick={handleQuickAdd}>
            <i className="fa-solid fa-cart-plus"></i>
          </button>
        )}
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
              <i className="fa-solid fa-circle-check"></i> Verified Seller
            </span>
          )}
          {product.sellerBusinessVerified && (
            <span className="business-chip">
              <i className="fa-solid fa-building"></i> Registered Business
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
});
