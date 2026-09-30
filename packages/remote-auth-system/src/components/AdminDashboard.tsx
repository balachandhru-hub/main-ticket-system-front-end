import { useState, useEffect } from 'react';
import AdminNavBar, { type AdminTab } from '../components/AdminNavBar';
import DashboardContent from '../pages/DashboardContent';
import CompanyList from '../components/CompanyList';
import MenuContent from '../components/MenuContent';
import FinanceDashboard from '../components/FinanceDashboard';
import BotsDashboard from '../pages/BotDashboard';
import AppsDashboard from '../components/AppsDashboard';
import InvoiceDashboard from '../components/InvoiceDashboard';
import './AdminDashboard.css';
import { USER_ROLES, type UserRole } from '../common/common';
import Chatbot from '../pages/Chatbot';
import ScreenshotUploader from '../pages/NewTickets';
import BuyerInvoiceDashboard from '../components/BuyerInvoiceDashboard';

interface AdminDashboardProps {
  userRole?: UserRole;
  tab?: AdminTab;
  setActiveTab?: (tab: AdminTab) => void;
}

const AdminDashboard = ({
  userRole,
  tab,
  setActiveTab,
}: AdminDashboardProps) => {
  const [activeTab, setActiveTabInternal] = useState<AdminTab | null>(null);
  const [resolvedRole, setResolvedRole] = useState<UserRole | null>(null);

  function isUserRole(role: string | undefined | null): role is UserRole {
    return !!role && Object.values(USER_ROLES).includes(role as UserRole);
  }

  useEffect(() => {
    if (userRole && isUserRole(userRole)) {
      setResolvedRole(userRole);
    }
  }, [userRole]);

  useEffect(() => {
    if (!userRole || !isUserRole(userRole)) return;

    if (!tab) {
      if (userRole === USER_ROLES.BUSINESS_DEVELOPMENT_USER) {
        setActiveTabInternal('Company Names');
      } else if (
        userRole === USER_ROLES.BUSINESS_USER ||
        userRole === USER_ROLES.BUSINESS_ADMIN_USER ||
        userRole === USER_ROLES.MANAGER ||
        userRole === USER_ROLES.FINANCE_USER ||
        userRole === USER_ROLES.LEADERSHIP_USER ||
        userRole === USER_ROLES.OPERATIONS_USER ||
        userRole === USER_ROLES.FINANCE_OPERATION_USER
      ) {
        setActiveTabInternal('Dashboard');
      } else if (userRole === USER_ROLES.SUPPLIER_USER) {
        setActiveTabInternal('Invoice Dashboard');
      } else {
        setActiveTabInternal('Dashboard');
      }
    } else {
      setActiveTabInternal(tab);
    }
  }, [tab, userRole]);

  const handleTabChange = (newTab: AdminTab) => {
    setActiveTabInternal(newTab);
    setActiveTab?.(newTab);
  };

  if (!resolvedRole || !activeTab) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {![USER_ROLES.BUSINESS_DEVELOPMENT_USER, USER_ROLES.LEAD, USER_ROLES.CONSULTANT].includes(resolvedRole) && (
        <AdminNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          userRole={resolvedRole}
          expandedCompany={false}
        />
      )}

      {activeTab === 'Dashboard' &&
        (resolvedRole === USER_ROLES.BUSINESS_USER ||
          resolvedRole === USER_ROLES.BUSINESS_ADMIN_USER ||
          resolvedRole === USER_ROLES.MANAGER ||
          resolvedRole === USER_ROLES.LEAD ||
          resolvedRole === USER_ROLES.LEADERSHIP_USER ||
          resolvedRole === USER_ROLES.OPERATIONS_USER ||
          resolvedRole === USER_ROLES.FINANCE_OPERATION_USER ||
          resolvedRole === USER_ROLES.CONSULTANT) && (
          <DashboardContent
            userRole={resolvedRole}
            onTabChange={handleTabChange}
          />
        )}

      {activeTab === 'Dashboard' && resolvedRole === USER_ROLES.FINANCE_USER && (
        <FinanceDashboard />
      )}

      {activeTab === 'Invoice Dashboard' &&
        resolvedRole === USER_ROLES.SUPPLIER_USER && (
          <InvoiceDashboard />
        )}

      {activeTab === 'Company Names' &&
        resolvedRole === USER_ROLES.BUSINESS_DEVELOPMENT_USER && (
          <CompanyList />
        )}

      {activeTab === 'Menu' && resolvedRole === USER_ROLES.MANAGER && (
        <MenuContent />
      )}

      {activeTab === 'New Ticket' &&
        (resolvedRole === USER_ROLES.BUSINESS_USER ||
          resolvedRole === USER_ROLES.LEADERSHIP_USER ||
          resolvedRole === USER_ROLES.OPERATIONS_USER ||
          resolvedRole === USER_ROLES.FINANCE_OPERATION_USER ||
          resolvedRole === USER_ROLES.BUSINESS_ADMIN_USER) && (
          <ScreenshotUploader />
        )}

      {activeTab === 'Chatbot' &&
        (resolvedRole === USER_ROLES.BUSINESS_USER ||
          resolvedRole === USER_ROLES.LEADERSHIP_USER ||
          resolvedRole === USER_ROLES.OPERATIONS_USER ||
          resolvedRole === USER_ROLES.FINANCE_OPERATION_USER ||
          resolvedRole === USER_ROLES.BUSINESS_ADMIN_USER) && (
          <Chatbot />
        )}

      {activeTab === 'Bots' &&
        (resolvedRole === USER_ROLES.SUPPLIER_USER ||
          resolvedRole === USER_ROLES.BUSINESS_USER ||
          resolvedRole === USER_ROLES.LEADERSHIP_USER ||
          resolvedRole === USER_ROLES.OPERATIONS_USER ||
          resolvedRole === USER_ROLES.FINANCE_OPERATION_USER ||
          resolvedRole === USER_ROLES.BUSINESS_ADMIN_USER) && (
          <BotsDashboard />
        )}

        {activeTab === 'Apps' &&
        (resolvedRole === USER_ROLES.SUPPLIER_USER ||
          resolvedRole === USER_ROLES.BUSINESS_USER ||
          resolvedRole === USER_ROLES.LEADERSHIP_USER ||
          resolvedRole === USER_ROLES.OPERATIONS_USER ||
          resolvedRole === USER_ROLES.FINANCE_OPERATION_USER ||
          resolvedRole === USER_ROLES.BUSINESS_ADMIN_USER) && (
          <AppsDashboard />
        )}
     

{activeTab === 'Buyer Invoice Dashboard' &&
  (resolvedRole === USER_ROLES.BUSINESS_USER || resolvedRole === USER_ROLES.OPERATIONS_USER ||
    resolvedRole === USER_ROLES.BUSINESS_ADMIN_USER || resolvedRole === USER_ROLES.LEADERSHIP_USER) && (
    <BuyerInvoiceDashboard />
)}

    </div>
  );
};

export default AdminDashboard;
