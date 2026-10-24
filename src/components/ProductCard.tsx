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
  /** Only passed by the "Recommended for You" rail */
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
      navigate(detailPath);
      return;
    }
    addToCart(product, Math.max(1, product.minOrderQuantity || 1), 'Standard');
  }

  function handleNotInterested(e: React.MouseEvent) {
    e.stopPropagation();
    onNotInterested?.(product.id);
  }

  const effectiveUnit = product.unit || product.unitType || '';

  return (
    <div className="card product-card" onClick={() => navigate(detailPath)}>
      <div className="card-img">
        {product.discount > 0 && <span className="disc-tag">{product.discount}% OFF</span>}
        {onNotInterested && (
          <button
            className="not-interested-btn"
            onClick={handleNotInterested}
            title="Not interested"
            aria-label="Dismiss recommendation"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        ) : (
          <div className="card-img-inner">
            <i className={`fa-solid ${icon}`}></i>
            <span className="cat-label">{product.category}</span>
          </div>
        )}
        {!isService && !product.negotiated && (
          <button
            className="quick-add"
            onClick={handleQuickAdd}
            title="Quick add to cart"
            aria-label="Add to cart"
          >
            <i className="fa-solid fa-cart-plus"></i>
          </button>
        )}
      </div>

      <div className="card-body">
        {/* Rating & Reviews */}
        <div className="card-stars">
          <span className="stars-render">{starString(product.rating)}</span>
          <span className="reviews-count">({product.reviews || 0})</span>
        </div>

        {/* Product Title */}
        <h3 className="card-name" title={product.name}>
          {product.name}
        </h3>

        {/* Recommendation Reason tag if applicable */}
        {product.recommendationReason && (
          <div className="reco-reason">
            <i className="fa-solid fa-sparkles"></i> {product.recommendationReason}
          </div>
        )}

        {/* Seller & Location meta */}
        <div className="card-seller-info">
          <div className="seller-name-row">
            <span className="seller-name">{product.sellerName}</span>
            {product.verified && (
              <span className="verified-chip" title="Identity Verified Seller">
                <i className="fa-solid fa-circle-check"></i> Verified
              </span>
            )}
            {product.sellerBusinessVerified && (
              <span className="business-chip" title="CAC Registered Business">
                <i className="fa-solid fa-building"></i> Registered
              </span>
            )}
          </div>
          {product.location && (
            <div className="seller-location">
              <i className="fa-solid fa-location-dot"></i> {product.location}
            </div>
          )}
        </div>

        {/* Pricing and Action */}
        <div className="card-bottom">
          <div className="card-price-wrap">
            {product.negotiated ? (
              <span className="price-negotiable">Negotiable</span>
            ) : (
              <>
                <span className="card-price">{formatPrice(product.price ?? 0)}</span>
                {effectiveUnit && <span className="card-unit">/ {effectiveUnit}</span>}
                {product.discount > 0 && (
                  <del className="card-price-del">
                    {formatPrice(Math.round((product.price ?? 0) / (1 - product.discount / 100)))}
                  </del>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className={`card-add-btn ${product.type === 'service' ? 'is-service' : product.negotiated ? 'is-quote' : ''}`}
            onClick={handleQuickAdd}
          >
            {product.type === 'service' ? 'Book' : product.negotiated ? 'Quote' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
});
