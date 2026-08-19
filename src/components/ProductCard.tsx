import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, starString } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import { CATEGORY_ICONS } from '../lib/constants';
import type { Product } from '../types';

export const ProductCard = memo(function ProductCard({
  product,
  onNotInterested,
}: {
  product: Product;
  /** Only passed by the "Recommended for You" rail — dismissing a specific recommendation isn't
   *  a meaningful action on general listing surfaces (produce/services rails, search results). */
  onNotInterested?: (productId: string) => void;
}) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const icon = CATEGORY_ICONS[product.category] || CATEGORY_ICONS.default;

  const isService = product.type === 'service';
  const detailPath = isService ? `/shop/service/${product.id}` : `/shop/product/${product.id}`;

  function handleQuickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (isService || product.negotiated) {
      // A service needs a date/location/notes, and a negotiated listing has no fixed price to
      // add at all — neither has a valid "quick add", so go to the real form instead.
      navigate(detailPath);
      return;
    }
    // A product with a minOrderQuantity can't be validly added as just 1 (Flexible Commerce
    // Architecture Phase 1) - quick-add must respect it, not silently violate the seller's rule.
    addToCart(product, Math.max(1, product.minOrderQuantity || 1), 'Standard');
  }

  function handleNotInterested(e: React.MouseEvent) {
    e.stopPropagation();
    onNotInterested?.(product.id);
  }

  return (
    <div className="card" onClick={() => navigate(detailPath)}>
      <div className="card-img">
        {product.discount > 0 && <div className="disc-tag">{product.discount}% OFF</div>}
        {onNotInterested && (
          <button className="not-interested-btn" onClick={handleNotInterested} title="Not interested">
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
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
        {product.recommendationReason && (
          <div className="reco-reason">
            <i className="fa-solid fa-sparkles"></i> {product.recommendationReason}
          </div>
        )}
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
            {product.negotiated ? (
              <span style={{ fontSize: 13 }}>Negotiable</span>
            ) : (
              <>
                {formatPrice(product.price ?? 0)}{' '}
                {product.discount > 0 && (
                  <del>{formatPrice(Math.round((product.price ?? 0) / (1 - product.discount / 100)))}</del>
                )}
              </>
            )}
          </div>
          <button className="card-add-btn" onClick={handleQuickAdd}>
            {product.type === 'service' ? 'Book' : product.negotiated ? 'Quote' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
});
