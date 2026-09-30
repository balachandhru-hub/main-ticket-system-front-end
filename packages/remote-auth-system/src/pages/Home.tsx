import { useState } from 'react';
import TabHeader from '../components/TabHeader';
import DashboardContent from './DashboardContent';
import Chatbot from './Chatbot';
import NewTickets from './NewTickets';
import type { UserRole } from '../common/common';
import type { AdminTab } from '../components/AdminNavBar'; 

interface HomeProps {
  userRole: UserRole;
}

const Home = ({ userRole }: HomeProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardContent
            userRole={userRole}
            onTabChange={(tab: AdminTab) => setActiveTab(tab.toLowerCase())}
          />
        );
      case 'chatbot':
        return <Chatbot />;
      case 'newticket':
        return <NewTickets />;
      default:
        return <div style={{ padding: '2rem' }}>Unknown tab</div>;
    }
  };

  return (
    <div className="pper">
      <div className="header-bar">
        <TabHeader activeTab={activeTab} onTabChange={setActiveTab} />
      </div> 
      <div className="content-container">{renderContent()}</div>
    </div>
  );
};

export default Home;
