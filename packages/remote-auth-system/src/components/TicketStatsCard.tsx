import './TicketStatsCard.css';
import { AlertCircle, TimerReset, CheckCircle2, XCircle, CircleDollarSign, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TicketStatsCardProps {
  title: string;
  count: number;
  type: 'open' | 'progress' | 'resolved' | 'rejected' | 'approved' | 'paid' | 'unpaid' | 'total' | 'onhold' | 'pending' |'closed'; 
  onClick?: () => void;
  active?: boolean;
}

const icons = {
  open: <AlertCircle className="icon blue" />,
  progress: <TimerReset className="icon purple" />,
  resolved: <CheckCircle2 className="icon green" />,
  rejected: <XCircle className="icon red" />,
  approved: <CheckCircle2 className="icon green" />,
  paid: <CircleDollarSign className="icon green" />,
  unpaid: <XCircle className="icon red" />,
  total: <Building2 className="icon blue" />,
  onhold: <TimerReset className="icon orange" />,
  pending: <TimerReset className="icon orange" />,
  closed: <XCircle className="icon red" />
};

const TicketStatsCard: React.FC<TicketStatsCardProps> = ({ title, count, type, onClick, active }) => {
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = 600;
    const initialCount = displayCount;
    const difference = count - initialCount;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayCount(Math.floor(initialCount + difference * progress));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [count]);

  return (
    <div
      className={`ticket-card ${type} ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer', borderRadius: '10px' }}
    >
      <div className="card-text">
        <p>{title}</p>
        <h2>{displayCount}</h2>
      </div>
      <div className={`status-icon ${type}`}>
        {icons[type]}
      </div>
    </div>
  );
};

export default TicketStatsCard;