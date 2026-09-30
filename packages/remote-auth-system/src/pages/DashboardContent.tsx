import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketStatsCard from '../components/TicketStatsCard';
import TicketFilters, { type FilterState } from '../components/TicketFilters';
import TicketContent from '../components/TicketContent';
import { getTickets } from '../api/getTickets';
import './DashBoard.css';
import { TICKET_STATUS, USER_ROLES, type UserRole } from '../common/common';
import type { TicketFilterParams, TicketDto } from '../Dto/TicketDto';
import type { AdminTab } from '../components/AdminNavBar';
import { getTicketDashboardSummary } from '../api/TicketApi';
import type { TicketDashboardSummaryDto } from '../Dto/TicketDashboardSummaryDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import ErrorModel from '../components/ErrorModel';

interface DashboardContentProps {
  userRole: UserRole;
  onTabChange: (tab: AdminTab) => void;
}

function isTicketDashboardSummary(
  response: TicketDashboardSummaryDto | ErrorResponseDto
): response is TicketDashboardSummaryDto {
  return 'inProgress' in response;
}

function isErrorResponse(
  response: TicketDashboardSummaryDto | ErrorResponseDto
): response is ErrorResponseDto {
  return 'message' in response && 'description' in response;
}

const DashboardContent = ({ userRole, onTabChange }: DashboardContentProps) => {
  const navigate = useNavigate();

  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({ title: '', message: '' });

  const [filter, setFilter] = useState<FilterState>({
    search: '',
    status: '',
    category: '',
    priority: '',
    fromDate: '',
    toDate: '',
  });

  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 4;
  const [hasMore, setHasMore] = useState(true);
  const [, setTotalTickets] = useState(0);
  const [dashboardSummary, setDashboardSummary] = useState<TicketDashboardSummaryDto | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const [activeStatusCard, setActiveStatusCard] = useState<string>('');

  const normalize = (text: string) => text.toLowerCase();

  const buildApiFilters = (filterState: FilterState): TicketFilterParams => {
    const params: TicketFilterParams = {
      Index: pageIndex * pageSize,
      Limit: pageSize,
    };

    if (filterState.search) params.SearchTerm = filterState.search;
    if (filterState.status) params.Status = filterState.status;
    if (filterState.category) params.Category = filterState.category;
    if (filterState.priority) params.Priority = filterState.priority;
    if (filterState.fromDate) {
      const [month, day, year] = filterState.fromDate.split('-');
      params.FromDate = new Date(`${year}-${month}-${day}`).toISOString();
    }
    if (filterState.toDate) {
      const [month, day, year] = filterState.toDate.split('-');
      params.ToDate = new Date(`${year}-${month}-${day}`).toISOString();
    }

    return params;
  };

  const fetchTickets = async () => {
    setLoading(true);
    const apiFilters = buildApiFilters(filter);

    try {
      const result = await getTickets(apiFilters);
      if (!result || typeof result !== 'object') {
        setTickets([]);
        setHasMore(false);
        setTotalTickets(0);
        return;
      }

      if ('statusCode' in result && result.statusCode === 401) {
        setErrorPage(true);
        setErrorPageData({
          title: result.message || 'Unauthorized',
          message: result.description || 'You are not authorized to perform this action.',
        });
        return;
      }

      if ('statusCode' in result) {
        toast.error(result.message || 'Failed to fetch tickets');
        setTickets([]);
        setHasMore(false);
        setTotalTickets(0);
      } else {
        setTickets(result);
        const currentTotal = pageIndex * pageSize + result.length;
        setTotalTickets(currentTotal);
        setHasMore(result.length === pageSize);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setErrorPage(true);
        setErrorPageData({
          title: 'Unauthorized',
          message: 'You are not authorized to perform this action.',
        });
      } else {
        toast.error('Failed to fetch tickets');
      }
      setTickets([]);
      setHasMore(false);
      setTotalTickets(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDashboardSummary = async () => {
    try {
      const data = await getTicketDashboardSummary();

      if (isTicketDashboardSummary(data)) {
        setDashboardSummary(data);
      } else if (isErrorResponse(data)) {
        if (data.statusCode === 401) {
          setErrorPage(true);
          setErrorPageData({
            title: data.message || 'Unauthorized',
            message: data.description || 'You are not authorized to perform this action.',
          });
        } else {
          toast.error(data.message || 'Failed to fetch dashboard summary');
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setErrorPage(true);
        setErrorPageData({
          title: 'Unauthorized',
          message: 'You are not authorized to perform this action.',
        });
      } else {
        toast.error('Failed to fetch dashboard summary');
      }
    } 
  };

  useEffect(() => {
    setPageIndex(0);
  }, [filter]);

  useEffect(() => {
    fetchTickets();
  }, [filter, pageIndex]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchTicketDashboardSummary();
      hasFetched.current = true;
    }
  }, []);

  const handleCardClick = (status: string) => {
    setFilter((prev) => ({ ...prev, status }));
    setActiveStatusCard(status);

    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleNextPage = () => {
    if (hasMore) setPageIndex((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex > 0) setPageIndex((prev) => prev - 1);
  };

  const handleModalConfirm = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate('/');
  };

  const isConsultant = userRole === USER_ROLES.CONSULTANT;

 return (
    <div className="dashboard-content">
      <div className="stats-section">
        {[USER_ROLES.BUSINESS_ADMIN_USER, USER_ROLES.BUSINESS_USER, USER_ROLES.LEADERSHIP_USER, USER_ROLES.OPERATIONS_USER, USER_ROLES.FINANCE_OPERATION_USER].includes(userRole) && (
          <TicketStatsCard
            title="Open Tickets"
            count={
              loading
                ? 0
                : dashboardSummary?.openTickets ?? tickets.filter((t) => normalize(t.status) === 'open').length
            }
            type="open"
            active={activeStatusCard === 'open'}
            onClick={() => handleCardClick(TICKET_STATUS.OPEN)}
          />
        )}
 
        <TicketStatsCard
          title="In Progress"
          count={
            loading
              ? 0
              : dashboardSummary?.inProgress ?? tickets.filter((t) => normalize(t.status) === 'in progress').length
          }
          type="progress"
          active={activeStatusCard === 'in progress'}
          onClick={() => handleCardClick(TICKET_STATUS.IN_PROGRESS)}
        />
 
        <TicketStatsCard
          title="Resolved"
          count={
            loading
              ? 0
              : dashboardSummary?.resolved ?? tickets.filter((t) => normalize(t.status) === 'resolved').length
          }
          type="resolved"
          active={activeStatusCard === 'resolved'}
          onClick={() => handleCardClick(TICKET_STATUS.RESOLVED)}
        />

        {isConsultant && (
          <TicketStatsCard
            title="On Hold"
            count={
              loading
                ? 0
                : dashboardSummary?.onHold ?? tickets.filter((t) => normalize(t.status) === 'on hold').length
            }
            type="onhold"
            active={activeStatusCard === 'on hold'}
            onClick={() => handleCardClick(TICKET_STATUS.ON_HOLD)}
          />
        )}
 
        {!isConsultant && (
          <TicketStatsCard
            title="Approved"
            count={
              loading
                ? 0
                : dashboardSummary?.approved ??
                  tickets.filter((t) => normalize(t.status) === 'approved').length
            }
            type="approved"
            active={activeStatusCard === 'approved'}
            onClick={() => handleCardClick(TICKET_STATUS.APPROVED)}
          />
        )}
 
        {![
          USER_ROLES.BUSINESS_ADMIN_USER,
          USER_ROLES.BUSINESS_USER,
          USER_ROLES.CONSULTANT,
          USER_ROLES.LEADERSHIP_USER,
          USER_ROLES.OPERATIONS_USER,
          USER_ROLES.FINANCE_OPERATION_USER,
        ].includes(userRole) && (
          <TicketStatsCard
            title="Rejected"
            count={
              loading
                ? 0
                : dashboardSummary?.rejected ??
                  tickets.filter((t) => normalize(t.status) === 'rejected').length
            }
            type="rejected"
            active={activeStatusCard === 'rejected'}
            onClick={() => handleCardClick(TICKET_STATUS.REJECTED)}
          />
        )}
      </div>

      <TicketFilters onFilterChange={setFilter} />

      <div ref={contentRef}>
        <TicketContent
          tickets={tickets}
          userRole={userRole}
          loading={loading}
          pageIndex={pageIndex}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          hasMore={hasMore}
          onTabChange={onTabChange}
        />
      </div>

      {errorPage && (
        <ErrorModel
          visible={true}
          title={errorPageData.title}
          message={errorPageData.message}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
};

export default DashboardContent;