import React from 'react';
import './MenuContent.css';
import { useNavigate } from 'react-router-dom';

const MenuContent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="menu-content">

      <div className="menu-header">
        <div className="menu-cell" onClick={() => navigate("/config")}>
          <img src="/assets/ConfigBlueIcon.png" alt="Config" className="cell-image default-img" />
          <img src="/assets/ConfigWhiteIcon.png" alt="Config Hover" className="cell-image hover-img" />
          <span className="cell-label">Config</span>
        </div>
        <div className="menu-cell" onClick={() => navigate("/user-details")}>
          <img src="/assets/UserDetailsBlueIcon.png" alt="Config" className="cell-image default-img" />
          <img src="/assets/UserDetailsWhiteIcon.png" alt="Config Hover" className="cell-image hover-img" />
          <span className="cell-label">User Details</span>
        </div>
      </div>
    </div>
  );
};


export default MenuContent;
