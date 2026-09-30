import React from 'react';
import './PopupBase.css';
import { IoCloseOutline } from 'react-icons/io5';
import type { CustomerListResponseDto } from '../Dto/CustomerListResponseDto';

interface Props {
  onClose: () => void;
  data: CustomerListResponseDto | null
}

const PopupCompanyDetails: React.FC<Props> = ({ onClose, data }) => {
  return (
    <div className="popup-overlay">
      <div className="company-popup-box">
        <div className="company-popup-header">
          <h3>COMPANY DETAILS</h3>
          <button onClick={onClose} className="company-close-icon">
            <IoCloseOutline size={18} />
          </button>
        </div>
        <div className="company-popup-content">
          {!data?.companyDetails ? (<div className="no-data">No data available</div>) :
            (<>
              <div className="row"><span className="key">Company name</span><span className="colon">:</span><span className="value" title={data?.companyDetails.companyName || 'N/A'}>{data?.companyDetails.companyName || 'N/A'}</span></div>
              <div className="row"><span className="key">Ariba Network ID</span><span className="colon">:</span><span className="value" title={data?.companyDetails.aribaNetworkId || 'N/A'}>{data?.companyDetails.aribaNetworkId || 'N/A'}</span></div>
              <div className="row"><span className="key">Ariba realm ID</span><span className="colon">:</span><span className="value" title={data?.companyDetails.aribaRealmId || 'N/A'}>{data?.companyDetails.aribaRealmId || 'N/A'}</span></div>
              <div className="row"><span className="key">Company registration no</span><span className="colon">:</span><span className="value" title={data?.companyDetails.companyRegistrationNo || 'N/A'}>{data?.companyDetails.companyRegistrationNo || 'N/A'}</span></div>
              <div className="row"><span className="key">Location / Headquarters</span><span className="colon">:</span><span className="value" title={data?.companyDetails.location || 'N/A'}>{data?.companyDetails.location || 'N/A'}</span></div>
              <div className="row"><span className="key">Billing address</span><span className="colon">:</span><span className="value" title={data?.companyDetails?.billingAddress || 'N/A'}>{data?.companyDetails.billingAddress || 'N/A'}</span></div>
            </>)}
        </div>
      </div>
    </div>
  );
};

export default PopupCompanyDetails;
