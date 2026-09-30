import React, { type JSX } from 'react';
import './TicketList.css';

import {
  AlertCircle,
  TimerReset,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  CheckCheck,
  XOctagon
} from 'lucide-react';

import {
  USER_ROLES,
  TICKET_STATUS,
  type UserRole
} from '../common/common';

import { useNavigate } from 'react-router-dom';
import type { TicketDto } from '../Dto/TicketDto';

interface TicketListProps {
  tickets: TicketDto[];
  onSelect: (ticket: TicketDto) => void;
  selectedId: string | null;
  userRole: UserRole;
}

const statusIcons: Record<string, JSX.Element> = {
  [TICKET_STATUS.OPEN]: <AlertCircle size={14} className="icon blue" />,
  [TICKET_STATUS.IN_PROGRESS]: <TimerReset size={14} className="icon purple" />,
  [TICKET_STATUS.CLOSED]: <XCircle size={14} className="icon gray" />,
  [TICKET_STATUS.APPROVED]: <CheckCheck size={14} className="icon green" />,
  [TICKET_STATUS.DECLINE]: <XOctagon size={14} className="icon red" />,
  [TICKET_STATUS.RE_APPROVE]: <TimerReset size={14} className="icon yellow" />,
  [TICKET_STATUS.REJECTED]: <XCircle size={14} className="icon rejected" />,
  [TICKET_STATUS.RESOLVED]: <CheckCircle2 size={14} className="icon green" />,
  [TICKET_STATUS.ON_HOLD]: <TimerReset size={14} className="icon orange" />,
};

const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelect,
  selectedId,
  userRole
}) => {
  const navigate = useNavigate();
  
  const formatText = (text: string | undefined | null) => {
    if (!text) return 'Not specified';
    return text
      .replace(/_/g, ' ')
      .replace(/(^\w|\s\w)/g, l => l.toUpperCase());
  };

  const getTruncatedDescription = (description: string | undefined | null) => {
    if (!description) return 'No description';

    const isMobile = window.innerWidth <= 480;
    const maxLength = isMobile ? 60 : 80;

    if (description.length <= maxLength) {
      return description; 
    }

    return `${description.slice(0, maxLength)}...`;
  };

  // Fixed: returns DD/MM/YYYY
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "No Date";
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  return (
    <div className="ticketlist-container">
      {Array.isArray(tickets) &&
        tickets.map((ticket) => {
          const status = ticket.status ?? '';
          const icon = statusIcons[status];

          return (
            <div
              key={ticket.id}
              className={`ticketlist-card ${ticket.id === selectedId ? 'ticketlist-selected' : ''}`}
              onClick={() => onSelect(ticket)}
            >
              <div className="ticketlist-header">
                <div
                  className="ticketlist-title"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {ticket.title ?? 'Untitled'}
                </div>
                <div className="ticketlist-tags">
                  <span className={`ticketlist-tag ${ticket.priority?.toLowerCase() ?? ''}`}>
                    {formatText(ticket.priority) ?? 'No Priority'}
                  </span>
                  <span className={`ticketlist-tag ${ticket.status?.replace(/\s+/g, '-') ?? ''}`}>
                    {icon}&nbsp;
                    {formatText(ticket.status) ?? 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="ticketlist-desc-row">
                <div
                  className="ticketlist-desc"
                  style={{ whiteSpace: 'pre-wrap' }} 
                >
                  {getTruncatedDescription(ticket.description)}
                </div>
              </div>

              {/* Fixed: removed duplicated opening <div> and closed properly */}
              <div className="ticketlist-footer">
                <div className="ticketlist-meta">
                  <div className="ticketlist-meta-info">
                    <span>👤 {ticket.name ?? 'Unknown'}</span>
                    <span>{ticket.dateCreated ? formatDate(ticket.dateCreated) : 'No Date'}</span>
                  </div>

                  <span className="ticketlist-category">
                    {formatText(ticket.category) ?? 'No Category'}
                  </span>
                  <span>Ticket Number : {ticket.ticketCode}</span>
                </div>

                {[USER_ROLES.MANAGER, USER_ROLES.BUSINESS_USER, USER_ROLES.BUSINESS_ADMIN_USER, USER_ROLES.LEAD, USER_ROLES.CONSULTANT, USER_ROLES.LEADERSHIP_USER, USER_ROLES.OPERATIONS_USER, USER_ROLES.FINANCE_OPERATION_USER].includes(userRole) && (
                  <div className="ticketlist-actions">
                    <button
                      className="ticketlist-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/ticket-details", { 
                          state: { 
                            id: ticket.id,
                            ticket: ticket 
                          } 
                        });
                      }}
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>      

                    {(() => {
                      const ticketStatus = ticket.status?.toUpperCase() ?? '';

                      if (ticketStatus === TICKET_STATUS.RESOLVED) {
                        return null;
                      }

                      if (ticketStatus === TICKET_STATUS.REJECTED) {
                        return (
                          <button
                            className="ticketlist-edit-btn ticketlist-edit-btn-disabled"
                            disabled
                            title="Cannot edit - Rejected"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Can't edit - Rejected</span>
                          </button>
                        );
                      }

                      const isBusinessUser = userRole === USER_ROLES.BUSINESS_ADMIN_USER || userRole === USER_ROLES.BUSINESS_USER;
                      const canBusinessUserEdit = ticketStatus === TICKET_STATUS.OPEN || ticketStatus === TICKET_STATUS.RE_APPROVE;
                      const shouldEnableEdit = !isBusinessUser || canBusinessUserEdit;

                      if (shouldEnableEdit) {
                        return (
                          <button
                            className="ticketlist-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              navigate("/ticket-edit", { state: { id: ticket.id } });
                            }}
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>
                        );
                      } else {
                        return (
                          <button
                            className="ticketlist-edit-btn ticketlist-edit-btn-disabled"
                            disabled
                            title={`Cannot edit - ${ticket.status}`}
                            onClick={(e) => e.stopPropagation()} 
                          >
                            <span>Can't edit - {ticket.status}</span>
                          </button>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default TicketList;