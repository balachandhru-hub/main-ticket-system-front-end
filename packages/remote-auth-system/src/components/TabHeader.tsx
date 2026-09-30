import React from 'react';
import './TabHeader.css';
//import { Bot, TicketCheck, Plus } from 'lucide-react';

interface TabHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabHeader: React.FC<TabHeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { label: 'Chatbot', key: 'chatbot' },
    { label: 'Dashboard', key: 'dashboard' },
    { label: 'New Ticket', key: 'newticket' },
  ];

  return (
    <div className="nav-tabs-fixed">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`tab ${activeTab === tab.key ? 'active' : ''}`}
        >
           {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabHeader;
