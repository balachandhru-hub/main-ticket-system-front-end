import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TicketList from './TicketList';
import TicketDetails from './TicketDetails';
import NewTicketForm from '../pages/NewTickets';
import NoTicketsFound from './NoTicketsFound';
import { downloadTicketsExcel } from '../api/TicketApi';
import './TicketContent.css';

import { USER_ROLES, type UserRole } from '../common/common';
import type { AdminTab } from '../components/AdminNavBar';
import type { TicketDto } from '../Dto/TicketDto';

interface TicketContentProps {
  userRole: UserRole;
  tickets: TicketDto[];
  loading: boolean;
  pageIndex?: number;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasMore?: boolean;
  onTabChange?: (tab: AdminTab) => void;
  onPageSizeChange?: (size: number) => void;

  searchTerm?: string;
  status?: string;
  category?: string;
  priority?: string;
  fromDate?: string | null;
  toDate?: string | null;
}

const TicketContent: React.FC<TicketContentProps> = ({
  userRole,
  tickets,
  loading,
  pageIndex = 0,
  onNextPage,
  onPrevPage,
  hasMore = false,
  onTabChange,
  onPageSizeChange,
  searchTerm = '',
  status = '',
  category = '',
  priority = '',
  fromDate = null,
  toDate = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedTicket, setSelectedTicket] = useState<TicketDto | null>(null);
  const [pageSize, setPageSize] = useState<number>(100);
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const limitRef = useRef<HTMLDivElement>(null);
  const isNewTicket = location.pathname.endsWith('/ticket/new');

  useEffect(() => {
    if (isNewTicket && onTabChange) onTabChange('New Ticket');
  }, [isNewTicket, onTabChange]);

  useEffect(() => {
    onPageSizeChange?.(pageSize);
  }, [pageSize, onPageSizeChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (limitRef.current && !limitRef.current.contains(e.target as Node)) {
        setIsLimitOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateParam = (d: string | null, endOfDay = false) => {
    if (!d) return undefined;
    if (d.includes('T')) return d;
    return endOfDay ? `${d}T23:59:59` : `${d}T00:00:00`;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const params: Record<string, any> = {};

      // Index is offset
      params.Index = pageIndex * pageSize;
      params.Limit = pageSize;

      if (searchTerm && searchTerm.trim() !== '') params.SearchTerm = searchTerm.trim();
      if (status && status.trim() !== '') params.Status = status.trim();
      if (category && category.trim() !== '') params.Category = category.trim();
      if (priority && priority.trim() !== '') params.Priority = priority.trim();

      const fd = formatDateParam(fromDate, false);
      const td = formatDateParam(toDate, true);
      if (fd) params.FromDate = fd;
      if (td) params.ToDate = td;

      // Use the correct API function name
      await downloadTicketsExcel(params);

      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { type: 'success', message: 'Excel download started' },
        })
      );
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { type: 'error', message: err?.message || 'Download failed' },
        })
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePageSizeSelect = (size: number) => {
    setPageSize(size);
    setIsLimitOpen(false);
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'info', message: `Showing ${size} entries per page` },
      })
    );
  };

  if (isNewTicket) return <NewTicketForm />;

  if (loading) {
    return (
      <div className="loader-container-user">
        <div className="loader"></div>
      </div>
    );
  }

  const canCreateTicket = [
    USER_ROLES.BUSINESS_USER,
    USER_ROLES.BUSINESS_ADMIN_USER,
    USER_ROLES.LEADERSHIP_USER,
    USER_ROLES.OPERATIONS_USER,
    USER_ROLES.FINANCE_OPERATION_USER,
  ].includes(userRole);

  if (!Array.isArray(tickets) || tickets.length === 0) {
    return (
      <div className="ticketcontent-main-container">
        <div className="ticketcontent-header">
          <h2>Tickets</h2>

          <div className="header-right-controls">
            {canCreateTicket && (
              <button
                className="ticketcontent-new-button"
                onClick={() => {
                  onTabChange?.('New Ticket');
                  navigate('/dashboard/ticket/new');
                }}
              >
                <div>+</div>
                <div>New</div>
              </button>
            )}

            <div className="limit-dropdown-wrapper" ref={limitRef}>
              <button className="limit-toggle-btn" onClick={() => setIsLimitOpen(!isLimitOpen)}>
                {pageSize}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isLimitOpen && (
                <div className="limit-menu">
                  {[100, 200, 300, 400, 500].map((size) => (
                    <button key={size} className="limit-option" onClick={() => handlePageSizeSelect(size)}>
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="download-excel-btn" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </div>

        <NoTicketsFound />
      </div>
    );
  }
    const handleTicketUpdate = (updatedTicket: TicketDto) => {
    setSelectedTicket(updatedTicket);
  };

  return (
    <div className="ticketcontent-main-container">
      <div className="ticketcontent-ticket-view">
        <div className="ticketcontent-sidebar">
          <div className="ticketcontent-header">
            <div className="header-top-row">
            <h2>Tickets</h2>

              {canCreateTicket && (
                <button
                  className="ticketcontent-new-button"
                  onClick={() => {
                    onTabChange?.('New Ticket');
                    navigate('/dashboard/ticket/new');
                  }}
                >
                  <div>+</div>
                  <div>New</div>
                </button>
              )}
            </div>

            <div className="header-bottom-controls">
              <div className="limit-dropdown-wrapper" ref={limitRef}>
                <button className="limit-toggle-btn" onClick={() => setIsLimitOpen(!isLimitOpen)}>
                  {pageSize}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {isLimitOpen && (
                  <div className="limit-menu">
                    {[100, 200, 300, 400, 500].map((size) => (
                      <button key={size} className="limit-option" onClick={() => handlePageSizeSelect(size)}>
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="download-excel-btn" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>

          <div className="ticket-list-container">
            <TicketList tickets={tickets} onSelect={setSelectedTicket} selectedId={selectedTicket?.id ?? null} userRole={userRole} />
          </div>

          <div className="ticketcontent-pagination">
            <button onClick={onPrevPage} disabled={pageIndex === 0}>
              Prev
            </button>
            <span>Page {pageIndex + 1}</span>
            <button onClick={onNextPage} disabled={!hasMore}>
              Next
            </button>
          </div>
        </div>
        <div className="ticketcontent-detail-view">
          <TicketDetails
            ticket={selectedTicket}
            onTicketUpdate={handleTicketUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketContent;