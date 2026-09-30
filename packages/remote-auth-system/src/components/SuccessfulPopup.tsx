import React from 'react';
import './SuccessfulPopup.css';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom'; 

interface Props {
  show: boolean;
  onClose: () => void;
  formType: string;
  startDate: string;
  endDate?: string;
}

const SuccessfulPopup: React.FC<Props> = ({ show, onClose, formType, startDate, endDate }) => {
  const navigate = useNavigate();

  if (!show) return null;

  const getFormattedDate = (dateStr: string) => {
    try {
      const parsed = new Date(dateStr);
      return format(parsed, 'dd.MM.yyyy');
    } catch {
      return '-';
    }
  };

  const getEndDate = () => {
    if (endDate) {
      return getFormattedDate(endDate);
    }
    return '-';
  };

  const formatPlanType = () => {
    if (!formType) return '';
    switch (formType) {
      case 'payg':
        return 'Pay As You Go';
      case 'subscription':
        return 'Subscription';
      case 'support':
        return 'Support Team';
      default:
        return formType.charAt(0).toUpperCase() + formType.slice(1);
    }
  };

  const handleOkClick = () => {
    onClose(); // Call existing close handler
    navigate('/dashboard'); // Redirect to Domain Registration Details page
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-status">
          <FontAwesomeIcon icon={faCheckCircle} className="popup-icon" />
          <span className="popup-blue">{formatPlanType()} Plan Activation Successful!</span>
        </div>

        <div className="popup-dates">
          <div><strong>Plan Start Date</strong> : {getFormattedDate(startDate)}</div>
          <div><strong>Plan End Date</strong> : {getEndDate()}</div>
        </div>

        <button className="popup-ok" onClick={handleOkClick}>OK</button>
      </div>
    </div>
  );
};

export default SuccessfulPopup;
