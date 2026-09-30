import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './Contract.css';

const Contract: React.FC = () => {
  return (
    <div className="contract-workspace-container">
      {/* Header */}
      <header className="contract-header">
        <div className="contract-header-title-row">
          <h1 className="contract-header-title">Contract Request</h1>
        </div>

        <div className="contract-nav-tabs-wrapper">
          <div className="contract-nav-tabs">
            <NavLink 
              to="/dashboard/bots/contract"
              end
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              Create Contract
            </NavLink>
            <NavLink 
              to="/dashboard/bots/contract/summary"
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              Summary
            </NavLink>
          </div>
        </div>
      </header>
      <main className="contract-form-wrapper">
        <Outlet />
      </main>
    </div>
  );
};

export default Contract;