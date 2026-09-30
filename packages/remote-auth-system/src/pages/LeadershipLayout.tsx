// src/pages/LeadershipLayout.tsx
import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../components/context/AuthContext';
import { USER_ROLES } from '../common/common';
import './LeadershipLayout.css';

const LeadershipLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();

  const roleId = auth?.roleId;
  const isLeadershipUser = roleId === USER_ROLES.LEADERSHIP_USER;

  const basePath = isLeadershipUser ? '/dashboard/bots' : '/dashboard/bots';

  const tabs = [
    { label: 'Contract', path: `${basePath}/contract-approval` },
     { label: 'PR',      path: `${basePath}/pr-table` },
    { label: 'Invoice', path: `${basePath}/quick-approval` },
   
  ];

  const activeTab = tabs.find(tab =>
    location.pathname === tab.path ||
    (tab.label === 'Invoice' && location.pathname === '/dashboard')
  )?.label || 'Invoice';

const handleTabClick = (path: string) => {
  const navState: any = {};
  if (path.includes('/pr-table')) {
    navState.fromTab = 'pr';
  } else if (path.includes('/quick-approval')) {
    navState.fromTab = 'invoice';
  } else if (path.includes('/contract-approval')) {
    navState.fromTab = 'contract';
  }

  navigate(path, { state: navState });
};


return (
    <div className="leadership-page">
      <div className="leader-navbar-wrapper">
        <div className="leader-navbar">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              className={activeTab === tab.label ? 'active' : ''}
              onClick={() => handleTabClick(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="leadership-content">
        <Outlet />
      </div>
    </div>
  );
};

export default LeadershipLayout;