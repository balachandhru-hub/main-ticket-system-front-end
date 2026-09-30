import React from 'react';
import './PopupBase.css';
import { IoCloseOutline } from 'react-icons/io5';
import type { CustomerListResponseDto } from '../Dto/CustomerListResponseDto';

interface Props {
  onClose: () => void;
  data: CustomerListResponseDto | null
}

const PopupTaxDetails: React.FC<Props> = ({ onClose, data }) => {
  return (
    <div className="popup-overlay">
      <div className="tax-popup-box">
        <div className="tax-popup-header">
          <h3>TAX DETAILS</h3>
          <button onClick={onClose} className="tax-close-icon">
            <IoCloseOutline size={18} />
          </button>
        </div>
        <div className="tax-popup-content">
          {!data?.taxDetails ? (<div className="no-data">No data available</div>) :
            (<>
              <div className="row"><span className="key">GST Number</span><span className="colon">:</span><span className="value">{data?.taxDetails.gst}</span></div>
              <div className="row"><span className="key">PAN Number</span><span className="colon">:</span><span className="value">{data?.taxDetails.pan}</span></div>
              <div className="row"><span className="key">TAN Number</span><span className="colon">:</span><span className="value">{data?.taxDetails.tan}</span></div>
              <div className="row"><span className="key">TAX Registration</span><span className="colon">:</span><span className="value">{data?.taxDetails.taxRegistration}</span></div>
              <div className="row"><span className="key">VAT Number</span><span className="colon">:</span><span className="value">{data?.taxDetails.vat}</span></div>
              <div className="row"><span className="key">Other Local TAX ID</span><span className="colon">:</span><span className="value">{data?.taxDetails.otherLocalTaxId}</span></div>
              <div className="row"><span className="key">CIN Number</span><span className="colon">:</span><span className="value">{data?.taxDetails.cinNumber}</span></div>
              <div className="row"><span className="key">LUT Number</span><span className="colon">:</span><span className="value">{data?.taxDetails.lutNumber}</span></div>
            </>
            )}
        </div>
      </div>
    </div>
  );
};

export default PopupTaxDetails;
