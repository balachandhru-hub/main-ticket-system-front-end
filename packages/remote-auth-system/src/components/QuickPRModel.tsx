import React from 'react';
import './QuickPRModel.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faChartLine,
  faHandshake,
  faMoneyBillWave,
  faGavel,
  faStar,
  faConciergeBell,
} from '@fortawesome/free-solid-svg-icons';

import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import PrTypeSwitcher from './PrTypeSwitcher';
import PrEntertainment from './PrEntertainment';
import ConciergeWrapper from './ConciergeWrapper';
import Legal from './Legal';

const QuickPROptionsGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="QP-container Qp-font-family qp-background">
      <p className="QP-popup-title">Simply PR</p>
      <div className="QP-grid">
        <div className="QP-option" onClick={() => navigate('marketing')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faBullhorn} />
          </div>
          <div className="QP-label">Marketing</div>
        </div>

        <div className="QP-option" onClick={() => navigate('sales')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="QP-label">Sales</div>
        </div>

        <div className="QP-option" onClick={() => navigate('public-relations')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faHandshake} />
          </div>
          <div className="QP-label">Public Relations</div>
        </div>

        <div className="QP-option" onClick={() => navigate('revenue')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faMoneyBillWave} />
          </div>
          <div className="QP-label">Revenue</div>
        </div>

        <div className="QP-option" onClick={() => navigate('legal')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faGavel} />
          </div>
          <div className="QP-label">Legal</div>
        </div>

        <div className="QP-option" onClick={() => navigate('pr-entertainment/material')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faStar} />
          </div>
          <div className="QP-label">PR Entertainment</div>
        </div>

        <div className="QP-option" onClick={() => navigate('concierge')}>
          <div className="QP-icon">
            <FontAwesomeIcon icon={faConciergeBell} />
          </div>
          <div className="QP-label">Concierge</div>
        </div>
      </div>
    </div>
  );
};

const QuickPRModel: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard/bots/simply-pr');
  };

  return (
    <Routes>
      <Route index element={<QuickPROptionsGrid />} />
      <Route path="marketing" element={<div className="QP-placeholder Qp-font-family qp-background"><p>Marketing Content</p></div>} />
      <Route path="sales" element={<div className="QP-placeholder Qp-font-family qp-background"><p>Sales Content</p></div>} />
      <Route path="public-relations" element={<Navigate to="material" replace />} />
      <Route
        path="public-relations/:type/*"
        element={
          <div className="QP-placeholder Qp-font-family qp-background">
            <PrTypeSwitcher
              module="public-relations"
              onBack={handleBack}
            />
          </div>
        }
      />
      <Route path="revenue" element={<div className="QP-placeholder Qp-font-family qp-background"><p>Revenue Content</p></div>} />
      <Route
        path="legal/*"
        element={
          <div className="QP-placeholder Qp-font-family qp-background">
            <Legal onBack={handleBack} />
          </div>
        }
      />
      <Route path="pr-entertainment" element={<Navigate to="pr-entertainment/material" replace />} />
<Route
    path="pr-entertainment/:mode/*"
    element={
        <div className="QP-placeholder Qp-font-family qp-background">
            <PrEntertainment onBack={handleBack} />
        </div>
    }
/>
      <Route
        path="concierge/*"
        element={
          <div className="QP-placeholder Qp-font-family qp-background">
            <ConciergeWrapper onBack={handleBack} />
          </div>
        }
      />
    </Routes>
  );
};

export default QuickPRModel;
