import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import { CATEGORY_ICONS } from '../lib/constants';
import type { FlashSaleItem } from '../types';

export const FlashSaleCard = memo(function FlashSaleCard({ item }: { item: FlashSaleItem }) {
  const navigate = useNavigate();
  const icon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.default;

  return (
    <div className="card" onClick={() => navigate(`/shop/product/${item.productId}`)}>
      <div className="card-img">
        <div className="disc-tag">{item.discountPercent}% OFF</div>
        {item.productImage ? (
          <img src={item.productImage} alt={item.productName} loading="lazy" />
        ) : (
          <div className="card-img-inner">
            <i className={`fa-solid ${icon}`}></i>
            <span className="cat-label">{item.category}</span>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{item.productName}</div>
        <div className="card-bottom">
          <div className="card-price">
            {formatPrice(item.salePrice)} <del>{formatPrice(item.originalPrice)}</del>
          </div>
        </div>
      </div>
    </div>
  );
});
