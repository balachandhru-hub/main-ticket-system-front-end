import React, { useState } from 'react';
import './DiscountCouponPopup.css';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (discount: number) => void;
  couponCode?: string | null;
  disabled?: boolean;
}

const DiscountCouponPopup: React.FC<Props> = ({ visible, onClose, onSubmit, couponCode, disabled }) => {
  const [discount, setDiscount] = useState(1);

  if (!visible) return null;

  return (
    <div className="discount-popup-overlay">
      <div className="discount-popup">
        <h3>Select Discount Percentage</h3>
        <div style={{ margin: '2rem 0' }}>
          <span style={{ fontSize: '2rem', color: '#888' }}>{discount}</span>
          <input
            type="range"
            min={1}
            max={50}
            value={discount}
            onChange={e => setDiscount(Number(e.target.value))}
            disabled={!!couponCode || disabled}
            style={{ width: '100%', marginTop: '1rem' }}
          />
        </div>
        <div className="popup-actions">
          <button
            onClick={() => onSubmit(discount)}
            disabled={!!couponCode || disabled}
          >Submit</button>
          <button onClick={onClose}>Cancel</button>
        </div>
        {couponCode && (
          <div className="coupon-success">
            <span>Coupon code generated:</span>
            <strong>{couponCode}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscountCouponPopup;
