import React, { useState } from 'react';
import AdminDashboard from '../components/AdminDashboard';
import FinanceDashboard from '../components/FinanceDashboard';
import { USER_ROLES, type UserRole } from '../common/common';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../components/context/AuthContext';
import type { AdminTab } from '../components/AdminNavBar';

const DashboardHome: React.FC = () => {
  const { auth, loading } = useAuth();
  const [, setActiveTab] = useState<AdminTab>('Dashboard');

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading Dashboard...</div>;
  }

  if (!auth) {
    return <Navigate to="/" replace />;
  }

  const roleId = auth.roleId;

  const userRole: UserRole = Object.values(USER_ROLES).includes(roleId as UserRole)
    ? (roleId as UserRole)
    : roleId;

  if (userRole === USER_ROLES.FINANCE_USER) {
    return (
        <FinanceDashboard />
    );
  }



  return (
    <Routes>
      <Route
        index
        element={<AdminDashboard userRole={userRole} setActiveTab={setActiveTab} />}
      />
      <Route
        path="chat-bot"
        element={<AdminDashboard userRole={userRole} tab="Chatbot" setActiveTab={setActiveTab} />}
      />
      <Route
        path="ticket/*"
        element={<AdminDashboard userRole={userRole} tab="New Ticket" setActiveTab={setActiveTab} />}
      />
      <Route
        path="company"
        element={<AdminDashboard userRole={userRole} tab="Company Names" setActiveTab={setActiveTab} />}
      />
      <Route
        path="menu"
        element={<AdminDashboard userRole={userRole} tab="Menu" setActiveTab={setActiveTab} />}
      />
      <Route
        path="content"
        element={<AdminDashboard userRole={userRole} tab="Dashboard" setActiveTab={setActiveTab} />}
      />
      <Route
        path="invoice"
        element={<AdminDashboard userRole={userRole} tab="Invoice Dashboard" setActiveTab={setActiveTab} />}
      />
      <Route
        path="bots/*"
        element={<AdminDashboard userRole={userRole} tab="Bots" setActiveTab={setActiveTab} />}
      />
      <Route
        path="apps/*"
        element={<AdminDashboard userRole={userRole} tab="Apps" setActiveTab={setActiveTab} />}
      />
      <Route
        path="buyer-invoice/*"
        element={<AdminDashboard userRole={userRole} tab="Buyer Invoice Dashboard" setActiveTab={setActiveTab} />}
      />
       <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default DashboardHome;
