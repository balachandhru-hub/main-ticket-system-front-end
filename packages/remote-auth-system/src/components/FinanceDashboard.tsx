import React, { useState, useMemo } from 'react';
import './FinanceDashboard.css';
import { FaFilter } from 'react-icons/fa';
import {
  Eye,
  Download,
  Search,
  Calendar
} from 'lucide-react';
import TicketStatsCard from '../components/TicketStatsCard';
import { TICKET_STATUS } from '../common/common';

interface CompanyData {
  companyName: string;
  invoiceNumber: string;
  amount: string;
  date: string;
  paymentStatus: string;
  approval: string;
}

const companyData: CompanyData[] = [
  {
    companyName: 'TechCorp',
    invoiceNumber: 'INV-001',
    amount: '$1,200',
    date: '2025-07-15',
    paymentStatus: 'Paid',
    approval: 'Approved'
  },
  {
    companyName: 'BizSolutions',
    invoiceNumber: 'INV-002',
    amount: '$950',
    date: '2025-07-18',
    paymentStatus: 'Unpaid',
    approval: 'Pending'
  },
  {
    companyName: 'InnovateX',
    invoiceNumber: 'INV-003',
    amount: '$3,100',
    date: '2025-07-20',
    paymentStatus: 'Invoice Not Generated',
    approval: 'Pending'
  },
  {
    companyName: 'SoftTech',
    invoiceNumber: 'INV-004',
    amount: '$2,000',
    date: '2025-07-21',
    paymentStatus: 'Paid',
    approval: 'Approved'
  }
];

const FinanceDashboard: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeStatusCard, setActiveStatusCard] = useState<string>('');

  const handleStatCardClick = (status: string) => {
    setActiveStatusCard(status);
    
    if (status === TICKET_STATUS.TOTAL) {
      setPaymentStatusFilter('');
      setApprovalFilter('');
    } else if (status === TICKET_STATUS.APPROVED) {
      setApprovalFilter('Approved');
      setPaymentStatusFilter('');
    } else if (status === TICKET_STATUS.PAID) {
      setPaymentStatusFilter('Paid');
      setApprovalFilter('');
    } else if (status === TICKET_STATUS.UNPAID) {
      setPaymentStatusFilter('Unpaid');
      setApprovalFilter('');
    }
  };

  const filteredData = useMemo(() => {
    const nameMatch = (d: CompanyData) =>
      d.companyName.toLowerCase().includes(searchInput.toLowerCase());
    const statusMatch = (d: CompanyData) =>
      !paymentStatusFilter || d.paymentStatus === paymentStatusFilter;
    const approvalMatch = (d: CompanyData) =>
      !approvalFilter || d.approval === approvalFilter;

    const filtered = companyData.filter(
      d => nameMatch(d) && statusMatch(d) && approvalMatch(d)
    );

    if (searchInput && filtered.length === 0) {
      setErrorMessage('Invalid company name entered');
    } else {
      setErrorMessage('');
    }

    return filtered;
  }, [searchInput, paymentStatusFilter, approvalFilter]);

  const totalInvoices = companyData.length;
  const totalApproved = companyData.filter(d => d.approval === 'Approved').length;
  const totalPaid = companyData.filter(d => d.paymentStatus === 'Paid').length;
  const totalUnpaid = companyData.filter(d => d.paymentStatus === 'Unpaid').length;

  return (
    <div className="finance-dashboard">
      <h2 className="dashboard-title">Finance Dashboard</h2>

      <div className="stats-section">
        <TicketStatsCard
          title="TOTAL INVOICES"
          count={totalInvoices}
          type="total"
          active={activeStatusCard === TICKET_STATUS.TOTAL}
          onClick={() => handleStatCardClick(TICKET_STATUS.TOTAL)}
        />
        
        <TicketStatsCard
          title="APPROVED"
          count={totalApproved}
          type="approved"
          active={activeStatusCard === TICKET_STATUS.APPROVED}
          onClick={() => handleStatCardClick(TICKET_STATUS.APPROVED)}
        />
        
        <TicketStatsCard
          title="PAID"
          count={totalPaid}
          type="paid"
          active={activeStatusCard === TICKET_STATUS.PAID}
          onClick={() => handleStatCardClick(TICKET_STATUS.PAID)}
        />
        
        <TicketStatsCard
          title="UNPAID"
          count={totalUnpaid}
          type="unpaid"
          active={activeStatusCard === TICKET_STATUS.UNPAID}
          onClick={() => handleStatCardClick(TICKET_STATUS.UNPAID)}
        />
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <FaFilter className="filter-icon" />
          <span> Filters</span>
        </div>
        <div className="filters-inputs">
          <div className="input-with-icon">
            <Search className="input-icon" />
            <input
              type="text"
              placeholder="Search company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="input-with-icon">
            <Calendar className="input-icon" />
            <input type="date" />
          </div>

          <select
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            value={paymentStatusFilter}
          >
            <option value="">Payment Status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Invoice No</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Payment Status</th>
              <th>Approval</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((data, index) => (
              <tr key={index}>
                <td>{data.companyName}</td>
                <td>{data.invoiceNumber}</td>
                <td>{data.amount}</td>
                <td>{data.date}</td>
                <td>{data.paymentStatus}</td>
                <td>{data.approval}</td>
                <td className="table-actions">
                  <Eye className="action-icon" />
                  <Download className="action-icon" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceDashboard;