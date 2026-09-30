import React from 'react';
import './NoTicketsFound.css';
import { Ban } from 'lucide-react';

const NoTicketsFound: React.FC = () => {
  return (
    <div className="no-tickets-container">
      <div className="no-tickets-icon">
        <Ban size={48} strokeWidth={1.5} />
      </div>
      <h2>No Tickets Found</h2>
      <p>No tickets match your current filters. Try adjusting them to see results.</p>
    </div>
  );
};

export default NoTicketsFound;
