import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuickApproval.css';
import { IoMdEye } from "react-icons/io";
import { FiSearch } from "react-icons/fi";
import { FiFileText } from 'react-icons/fi';
import TicketStatsCard from '../components/TicketStatsCard';
import ErrorModel from '../components/ErrorModel';
import QuickApprovalViewPopup from './QuickApprovalViewPopup';
import SignedContractPopup from './SignedContractPopup';
import InvoiceEditPopup from '../components/InvoiceEditPopup';
import type { InvoiceEditForm } from "../components/InvoiceEditPopup";
import { ApprovalDashBoard, getPendingApprovals, patchRequisition, triggerAribaNotification, getPendingApprovalsContractEdit, updatePaymentStatus } from '../api/AribaApi';
import { downloadAribaApprovalsExcel, type PatchRequisitionRequest, type StatusSummaryDto } from '../api/AribaApi';
import { useAuth } from './context/AuthContext';
import type { PendingApprovalDto } from '../Dto/PendingApprovalDto';
import { USER_ROLES } from '../common/common';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import { syncLatestPendingApprovals } from "../api/LatestPendingApprovalApi";
import GLAccountsFilter from './GLAccountsFilter';

export interface Invoice {
  id: string;
  invoiceId: string;
  entity: string;
  contractId: string;
  invoiceNo: string;
  poNumber: string;
  epid: string;
  supplier: string;
  amount: string;
  department: string;
  paymentDueDate: string;
  glAccount?: string;
  costCenter?: string;
  description: string;
  contractValue: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
  status: 'approved' | 'rejected' | 'closed' | 'pending' | null;
  fullUrl?: string;
  currency?: string;
  aribaTaskId?: string;
  invoiceAmount?: number;
  approver?: string;
  approvalHistory: ApprovalHistoryDto[];
  dueDate: string;
  hasAttachment: boolean;
  attachmentId: string | null;
  paymentStatus?: string;
}

export interface ApprovalHistoryDto {
  approvalDate: string | null;
  level: string;
  status: string;
  aribaUser: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  action: 'approve' | 'deny' | null;
  invoiceId: string | null;
  onConfirm: (id: string, action: 'approve' | 'deny') => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, action, invoiceId, onConfirm, onCancel }) => {
  const [comment, setComment] = useState('');
  if (!isOpen || !action || !invoiceId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm {action === 'approve' ? 'Approval' : 'Rejection'}</h2>
        <p>Are you sure you want to {action} this invoice?</p>
        <div className="modal-comment-section">
          <label htmlFor="comment">Comment:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment here..."
            maxLength={50}
            style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div className="modal-buttons">
          <button
            className={`modal-button ${action === 'approve' ? 'approve' : 'reject'}`}
            onClick={() => {
              onConfirm(invoiceId, action);
              setComment('');
            }}
          >
            {action === 'approve' ? 'Approve' : 'Reject'}
          </button>
          <button className="modal-button cancel" onClick={() => {
            onCancel();
            setComment('');
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function isPendingApprovalArray(
  response: PendingApprovalDto[] | ErrorResponseDto
): response is PendingApprovalDto[] {
  return Array.isArray(response);
}

const QuickApproval: React.FC = () => {
  const navigate = useNavigate();
  const lastErrorToastRef = useRef<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(window.innerWidth <= 768 ? 'grid' : 'table');
  const [searchTerm, setSearchTerm] = useState(''); // Just for input
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected' | 'pending' | 'closed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCard, setActiveCard] = useState<string>('total');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({ title: '', message: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'deny' | null>(null);
  const [modalInvoiceId, setModalInvoiceId] = useState<string | null>(null);
  const [isViewPopupOpen, setIsViewPopupOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedGLFilters, setSelectedGLFilters] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState(100);
  const [isInitialDashboardLoaded, setIsInitialDashboardLoaded] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isStatusOpen, setIsStatusOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'invoice-contract' | 'approval-history'>('invoice-contract');
  const [statusSummary, setStatusSummary] = useState<StatusSummaryDto>({
    pending: 0,
    approved: 0,
    deny: 0,
    total: 0,
    closed: 0
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentStatusInputs, setPaymentStatusInputs] = useState<Record<string, string>>({});
  const [isEditingPaymentStatus, setIsEditingPaymentStatus] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCooldown, setSyncCooldown] = useState(0);
  const [canSync, setCanSync] = useState(true);
  const limit = 8;
  const [signedContractInvoiceId, setSignedContractInvoiceId] = useState<string | null>(null);
  const { auth } = useAuth();
  const roleId = auth?.roleId;
  const isbusinessAdmin = roleId === USER_ROLES.BUSINESS_ADMIN_USER;
  const isbusinessUser = roleId === USER_ROLES.BUSINESS_USER;
  const isleadershipUser = roleId === USER_ROLES.LEADERSHIP_USER;
  const isBusinessAdminOrLeadership = isbusinessAdmin || isleadershipUser;
  const isOperationsUser = roleId === USER_ROLES.OPERATIONS_USER;
  const isFinanceOperationUser = roleId === USER_ROLES.FINANCE_OPERATION_USER;
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editInitialForm, setEditInitialForm] = useState<InvoiceEditForm>({
    description: '',
    contractValue: '',
    valueAlreadyPaid: '',
    remainingBalance: '',
  });

  const handleGLAccountsChange = (selectedCodes: string[]): void => {
    if (selectedCodes.length > 5) {
      toast.warning('You can select a maximum of 5 GL accounts only.');
      setSelectedGLFilters(selectedCodes.slice(0, 5));
    } else {
      setSelectedGLFilters(selectedCodes);
    }
    setCurrentPage(1);
  };

  const handleEdit = (id: string) => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;

    setEditingInvoiceId(id);
    setEditInitialForm({
      description: invoice.description || '',
      contractValue: invoice.contractValue?.replace(/[^0-9.]/g, '') || '',
      valueAlreadyPaid: invoice.valueAlreadyPaid?.replace(/[^0-9.]/g, '') || '',
      remainingBalance: invoice.remainingBalance?.replace(/[^0-9.]/g, '') || '',
    });
    setEditPopupOpen(true);
  };

  const handlePaymentStatusChange = (invoiceId: string, value: string) => {
    setPaymentStatusInputs(prev => ({ ...prev, [invoiceId]: value }));
  };

  const handleStartEditingPaymentStatus = (invoiceId: string, currentValue: string) => {
    setPaymentStatusInputs(prev => ({ ...prev, [invoiceId]: currentValue }));
    setIsEditingPaymentStatus(prev => ({ ...prev, [invoiceId]: true }));
  };

  const handlePaymentStatusUpdate = async (invoiceId: string) => {
    const paymentStatus = paymentStatusInputs[invoiceId]?.trim();
    if (!paymentStatus) {
      toast.warn('Payment status cannot be empty');
      return;
    }

    try {
      const result = await updatePaymentStatus(invoiceId, paymentStatus);

      if ('statusCode' in result && result.statusCode >= 400) {
        toast.error(result.message || 'Failed to update payment status');
        return;
      }

      setInvoices(prev =>
        prev.map(inv =>
          inv.id === invoiceId ? { ...inv, paymentStatus } : inv
        )
      );

      toast.success('Payment status updated successfully');

      setIsEditingPaymentStatus(prev => ({ ...prev, [invoiceId]: false }));
      setPaymentStatusInputs(prev => ({ ...prev, [invoiceId]: '' }));

    } catch (error: any) {
      toast.error('Network error. Please try again.');
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  const handleOptionSelect = (value: React.SetStateAction<number>) => {
    setSelectedOption(value);
    setIsDropdownOpen(false);
  };

  const handleEditSaveFromPopup = async (form: InvoiceEditForm) => {
    if (!editingInvoiceId) return;

    const invoice = invoices.find((inv) => inv.id === editingInvoiceId);
    if (!invoice) return;

    const payload = {
      description: form.description.trim(),
      contractValue: form.contractValue ?? '',
      valueAlreadyPaid: form.valueAlreadyPaid ?? '',
      remainingBalance: form.remainingBalance ?? '',
    };

    try {
      const invoiceId = invoice.invoiceId || invoice.id;
      const resp = await getPendingApprovalsContractEdit(invoiceId, payload) as any;

      if (resp?.statusCode === 200) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === editingInvoiceId
              ? {
                ...inv,
                description: payload.description,
                contractValue: payload.contractValue
                  ? `${Number(payload.contractValue).toFixed(2)} ${inv.currency ?? ''}`.trim()
                  : inv.contractValue,
                valueAlreadyPaid: payload.valueAlreadyPaid
                  ? `${Number(payload.valueAlreadyPaid).toFixed(2)} ${inv.currency ?? ''}`.trim()
                  : inv.valueAlreadyPaid,
                remainingBalance: payload.remainingBalance
                  ? `${Number(payload.remainingBalance).toFixed(2)} ${inv.currency ?? ''}`.trim()
                  : inv.remainingBalance,
              }
              : inv
          )
        );

        toast.success('Invoice updated successfully');
        setEditPopupOpen(false);
        setEditingInvoiceId(null);
        await fetchPendingApprovals(currentPage);
      } else if (resp?.statusCode === 401) {
        setErrorPage(true);
        setErrorPageData({ title: resp.message || 'Unauthorized', message: resp.description || 'Not authorized.' });
        navigate('/');
      } else {
        toast.error(resp?.message || 'Failed to save');
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setErrorPage(true);
        setErrorPageData({ title: 'Unauthorized', message: 'You are not authorized.' });
        navigate('/');
      } else {
        toast.error(err?.message || 'Failed to update invoice');
      }
    }
  };

  const handleDownloadUser = () => {
    if (invoices.length === 0) {
      toast.info('No data to export');
      return;
    }
    const headers = [
      'ENTITY',
      ...(isbusinessAdmin ? ['APPROVER'] : []),
      'CONTRACT ID',
      'INVOICE NO',
      'PO NUMBER',
      'SUPPLIER',
      'AMOUNT (With Taxes)',
      'DEPARTMENT',
      'PAYMENT DUE DATE',
      'GL ACCOUNT',
      'COST CENTER',
      'DESCRIPTION',
      'CONTRACT VALUE',
      'VALUE ALREADY PAID',
      'REMAINING BALANCE',
      ...(isbusinessAdmin || isleadershipUser ? ['APPROVE/REJECT/ STATUS'] : []),
      ...(isbusinessUser || isOperationsUser || isFinanceOperationUser ? ['STATUS'] : []),
    ];

    const csvRows = [
      headers.join(','),
      ...invoices.map(inv => {
        const row = [
          inv.entity,
          ...(isbusinessAdmin ? [inv.approver || 'N/A'] : []),
          inv.contractId,
          inv.invoiceNo,
          inv.poNumber,
          inv.supplier,
          inv.amount,
          inv.department,
          inv.paymentDueDate,
          inv.glAccount,
          inv.costCenter,
          inv.description,
          inv.contractValue,
          inv.valueAlreadyPaid,
          inv.remainingBalance,
          ...(isbusinessAdmin || isleadershipUser
            ? [inv.status?.toUpperCase() ?? '']
            : []),
          ...(isbusinessUser || isOperationsUser || isFinanceOperationUser
            ? [inv.status?.toUpperCase() ?? '']
            : []),
        ];

        return row.map(cell =>
          `"${String(cell).replace(/"/g, '""')}"`
        ).join(',');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n'); // BOM + CRLF

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QuickApproval_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded (open in Excel)');
  };

  const handleDownload = async () => {
    if (loading) {
      toast.info('Please wait for current data loading to complete.');
      return;
    }

    let statusParam = statusFilter !== 'all' ? statusFilter : activeCard !== 'total' ? activeCard : '';
    if (statusParam === 'approved') {
      statusParam = 'approve';
    } else if (statusParam === 'rejected') {
      statusParam = 'deny';
    }

    const formatDateToDateTime = (dateString: string) => {
      if (!dateString) return '';
      return `${dateString}T00:00:00`;
    };

    try {
      const cleanGLAccounts = selectedGLFilters.length > 0
        ? selectedGLFilters.map(id => id.split('-')[0])
        : [];
      // ADD glAccounts parameter here
      const params = new URLSearchParams({
        limit: String(selectedOption),
        searchTerm: searchTerm.trim(),
        fromDate: formatDateToDateTime(fromDate),
        toDate: formatDateToDateTime(toDate),
        status: statusParam,
      });
      cleanGLAccounts.forEach((glCode: string) => {
        params.append('glAccount', glCode);
      });

      toast.info('Preparing your Excel download. This may take a moment...');

      const responseBlob = await downloadAribaApprovalsExcel(params.toString());

      const url = URL.createObjectURL(responseBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ariba_Approvals_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      const errorData = error as ErrorResponseDto;
      if (errorData.statusCode === 401) {
        setErrorPage(true);
        setErrorPageData({ title: errorData.message, message: errorData.description });
        navigate('/');
      } else {
        toast.error(errorData.message || 'Failed to start download. Please try again.');
      }
    }
  };

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string | null>(null);

  // ── Open modal ──
  const handleSendReminder = (taskId: string) => {
    setReminderTaskId(taskId);
    setIsReminderModalOpen(true);
  };

  // ── Confirm ──
  const handleConfirmReminder = async () => {
    if (!reminderTaskId) return;

    // find invoice by aribaTaskId
    const invoice = invoices.find(inv => inv.aribaTaskId === reminderTaskId);
    if (!invoice) {
      toast.error('Invoice not found for reminder.');
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
      return;
    }

    // try to pick approver from approvalHistory (pending approver)
    const pendingApprover = invoice.approvalHistory?.find(h => h.status?.toLowerCase() === 'pending')?.aribaUser
      || invoice.approvalHistory?.[0]?.aribaUser;

    if (!pendingApprover) {
      toast.error('Approver username not found for this invoice.');
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
      return;
    }

    try {
      // entityType for invoice is typically "invoice" (adjust if you need "PR" or "contract")
      const entityType = 'invoice';
      const aribaId = invoice.invoiceId || invoice.id || reminderTaskId;

      const resp = await triggerAribaNotification(entityType, aribaId, pendingApprover);
      if ((resp as any).statusCode === 200) {
        toast.success('Reminder email triggered successfully.');
      } else {
        toast.error((resp as any).message || 'Failed to trigger reminder.');
      }
    } catch (err: any) {
      toast.error('Failed to send reminder. Please try again.');
    } finally {
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(max-width: 768px)');

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : mq.matches;
      setIsMobile(matches);
      if (matches) setViewMode('grid');
    };

    // Initialize from current match state
    handleMediaChange(mq);

    if ((mq as any).addEventListener) {
      (mq as any).addEventListener('change', handleMediaChange);
    } else if ((mq as any).addListener) {
      (mq as any).addListener(handleMediaChange);
    }

    return () => {
      if ((mq as any).removeEventListener) {
        (mq as any).removeEventListener('change', handleMediaChange);
      } else if ((mq as any).removeListener) {
        (mq as any).removeListener(handleMediaChange);
      }
    };
  }, []);
  // ── Cancel ──
  const handleCancelReminder = () => {
    setIsReminderModalOpen(false);
    setReminderTaskId(null);
  };
  // Add this useEffect for countdown timer
  useEffect(() => {
    if (syncCooldown <= 0) {
      if (!canSync) setCanSync(true);
      return;
    }

    const timer = setTimeout(() => {
      setSyncCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [syncCooldown]);
  // ── Reminder Confirmation Modal (re-uses your existing styles) ──
  const ReminderConfirmationModal: React.FC = () => {
    if (!isReminderModalOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Send Reminder</h2>
          <p>Are you sure you want to send a reminder for this invoice?</p>
          <div className="modal-buttons">
            <button className="modal-button approve" onClick={handleConfirmReminder}>
              Send
            </button>
            <button className="modal-button cancel" onClick={handleCancelReminder}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };


  const handleSearch = () => {
    setCurrentPage(1); // Only update state, let useEffect handle API
  };
  // ==================== STEP 1: Update the fetchPendingApprovals function ====================
  const fetchPendingApprovals = async (page: number = 1) => {
    setLoading(true);
    try {
      const index = (page - 1) * limit;
      let status = statusFilter !== 'all' ? statusFilter : activeCard !== 'total' ? activeCard : '';
      if (status === 'approved') {
        status = 'approve';
      } else if (status === 'rejected') {
        status = 'deny';
      }

      const formatDateToDateTime = (dateString: string) => {
        if (!dateString) return '';
        return `${dateString}T00:00:00`;
      };

      const cleanGLAccounts = selectedGLFilters.length > 0
        ? selectedGLFilters.map(id => id.split('-')[0])
        : undefined;

      // *** IMPORTANT: Use searchTerm DIRECTLY (no debounce!) ***
      // *** ADD selectedGLFilters HERE ***
      const response = await getPendingApprovals(
        index,
        limit,
        searchTerm.trim(),
        formatDateToDateTime(fromDate),
        formatDateToDateTime(toDate),
        status,
        cleanGLAccounts
      );

      if (isPendingApprovalArray(response)) {
        const transformedInvoices: Invoice[] = response.map((item) => ({
          id: item.invoiceId || 'N/A',
          invoiceId: item.invoiceId || 'N/A',
          entity: item.companyUniqueName || 'N/A',
          contractId: item.contractId || 'N/A',
          invoiceNo: item.invoiceNumber,
          poNumber: item.poNumber || 'N/A',
          epid: item.epid || 'N/A',
          supplier: item.supplierName,
          amount: `${item.invoiceAmount.toFixed(2)} ${item.currency}` || 'N/A',
          department: item.department || 'N/A',
          paymentDueDate: new Date(item.dueDate).toLocaleDateString('en-GB') || 'N/A',
          glAccount: item.glAccount || 'N/A',
          costCenter: item.costCenter || 'N/A',
          description: item.description || 'N/A',
          contractValue: item.contractValue !== null && item.contractValue !== undefined
            ? `${Number(item.contractValue).toFixed(2)} ${item.contractCurrency || item.currency}`
            : 'N/A',
          valueAlreadyPaid: item.valueAlreadyPaid !== null && item.valueAlreadyPaid !== undefined
            ? `${Number(item.valueAlreadyPaid).toFixed(2)} ${item.contractCurrency || item.currency}`
            : 'N/A',
          remainingBalance: item.remainingBalance !== null && item.remainingBalance !== undefined
            ? `${Number(item.remainingBalance).toFixed(2)} ${item.contractCurrency || item.currency}`
            : 'N/A',
          status: item.status.toLowerCase() === 'pending'
            ? 'pending'
            : item.status.toLowerCase() === 'approve' || item.status.toLowerCase() === 'approved'
              ? 'approved'
              : item.status.toLowerCase() === 'closed'
                ? 'closed'
                : item.status.toLowerCase() === 'reject' || item.status.toLowerCase() === 'rejected' || item.status.toLowerCase() === 'deny'
                  ? 'rejected'
                  : null,
          fullUrl: item.fullUrl,
          currency: item.currency,
          aribaTaskId: item.aribaTaskId,
          invoiceAmount: item.invoiceAmount,
          approvalHistory: item.approvalHistory || [],
          approver: item.approver || 'N/A',
          dueDate: item.dueDate,
          paymentStatus: item.paymentStatus || '',
          hasAttachment: item.hasAttachment || false,
          attachmentId: item.attachmentId || null,
        }));
        setInvoices(transformedInvoices);
      } else if (isErrorResponse(response)) {
        if (response.statusCode === 401) {
          setErrorPage(true);
          setErrorPageData({
            title: response.message || 'Unauthorized',
            message: response.description || 'You are not authorized to perform this action.',
          });
          navigate("/");
        } else if (response.statusCode === 404) {
          const msg = 'No pending approvals found';
          if (lastErrorToastRef.current !== msg) {
            toast.info(msg);
            lastErrorToastRef.current = msg;
          }
          setInvoices([]);
        } else {
          const errMsg = response.message || 'Failed to fetch pending approvals';
          if (lastErrorToastRef.current !== errMsg) {
            toast.error(errMsg);
            lastErrorToastRef.current = errMsg;
          }
          setInvoices([]);
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
        const errMsg = 'Failed to fetch pending approvals';
        if (lastErrorToastRef.current !== errMsg) {
          toast.error(errMsg);
          lastErrorToastRef.current = errMsg;
        }
      }
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {

    if (!isInitialDashboardLoaded && invoices.length === 0) return;

    fetchPendingApprovals(currentPage);
  }, [currentPage, fromDate, toDate, activeCard, statusFilter, selectedGLFilters, searchTerm, selectedOption]);

  const isErrorResponse = (data: any): data is ErrorResponseDto => {
    return data && typeof data.statusCode === 'number';
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoading(true);

      // Start BOTH API calls in parallel
      const [dashboardResponse, approvalsResponse] = await Promise.all([
        ApprovalDashBoard().catch(() => ({ total: 0, pending: 0, approved: 0, deny: 0, closed: 0 })),
        getPendingApprovals(0, limit, '', '', '', '', selectedGLFilters.length > 0 ? selectedGLFilters.map(id => id.split('-')[0]) : undefined) // initial fetch
      ]);

      if (!isMounted) return;

      // Update dashboard counts (even if failed, show 0)
      if (dashboardResponse && !isErrorResponse(dashboardResponse)) {
        setStatusSummary(dashboardResponse);
      }

      // Update invoice list
      if (isPendingApprovalArray(approvalsResponse)) {
        const transformedInvoices: Invoice[] = approvalsResponse.map((item) => ({
          id: item.invoiceId || 'N/A',
          invoiceId: item.invoiceId || 'N/A',
          entity: item.companyUniqueName || 'N/A',
          contractId: item.contractId || 'N/A',
          invoiceNo: item.invoiceNumber,
          poNumber: item.poNumber || 'N/A',
          epid: item.epid || 'N/A',
          supplier: item.supplierName,
          amount: `${item.invoiceAmount.toFixed(2)} ${item.currency}` || 'N/A',
          department: item.department || 'N/A',
          paymentDueDate: new Date(item.dueDate).toLocaleDateString('en-GB') || 'N/A',
          glAccount: item.glAccount || 'N/A',
          costCenter: item.costCenter || 'N/A',
          description: item.description || 'N/A',
          contractValue: item.contractValue != null
            ? `${Number(item.contractValue).toFixed(2)} ${item.contractCurrency || item.currency}`
            : 'N/A',
          valueAlreadyPaid: item.valueAlreadyPaid != null
            ? `${Number(item.valueAlreadyPaid).toFixed(2)} ${item.contractCurrency || item.currency}`
            : 'N/A',
          remainingBalance: item.remainingBalance != null
            ? `${Number(item.remainingBalance).toFixed(2)} ${item.contractCurrency || item.currency}`
            : 'N/A',
          status: ((): Invoice['status'] => {
            const s = item.status.toLowerCase();
            if (s.includes('approve')) return 'approved';
            if (s.includes('reject') || s.includes('deny')) return 'rejected';
            if (s.includes('close')) return 'closed';
            if (s.includes('pending')) return 'pending';
            return null;
          })(),
          fullUrl: item.fullUrl,
          currency: item.currency,
          aribaTaskId: item.aribaTaskId,
          invoiceAmount: item.invoiceAmount,
          approvalHistory: item.approvalHistory || [],
          approver: item.approver || 'N/A',
          dueDate: item.dueDate,
          paymentStatus: item.paymentStatus || '',
          hasAttachment: item.hasAttachment || false,
          attachmentId: item.attachmentId || null,
        }));

        setInvoices(transformedInvoices);  // Now 100% correct type
      } else if (isErrorResponse(approvalsResponse)) {
        if (approvalsResponse.statusCode === 401) {
          navigate('/');
        } else {
          toast.error('Failed to load approvals');
          setInvoices([]);
        }
      }

      setLoading(false);
      setIsInitialDashboardLoaded(true); // now safe to allow filter-based refetches
    };

    loadInitialData();

    return () => { isMounted = false; };
  }, []);

  const handleApprove = (id: string) => {
    setModalAction('approve');
    setModalInvoiceId(id);
    setIsModalOpen(true);
  };

  const handleReject = (id: string) => {
    setModalAction('deny');
    setModalInvoiceId(id);
    setIsModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setIsViewPopupOpen(true);
    }
  };

  const updateStatusSummary = (oldStatus: string, newStatus: 'approved' | 'rejected' | 'closed') => {
    setStatusSummary(prev => {
      const updated = { ...prev };

      // Decrease old status count
      if (oldStatus === 'pending') updated.pending = Math.max(0, updated.pending - 1);
      else if (oldStatus === 'approved') updated.approved = Math.max(0, updated.approved - 1);
      else if (oldStatus === 'rejected') updated.deny = Math.max(0, updated.deny - 1);
      else if (oldStatus === 'closed') updated.closed = Math.max(0, updated.closed - 1);

      // Increase new status count
      if (newStatus === 'approved') updated.approved += 1;
      else if (newStatus === 'rejected') updated.deny += 1;
      else if (newStatus === 'closed') updated.closed += 1;

      // Adjust total (only if status changed from pending)
      if (oldStatus === 'pending') {
        updated.total = Math.max(0, updated.total - 1);
      }

      return updated;
    });
  };

  const handleModalConfirm = async (id: string, action: 'approve' | 'deny') => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice || !invoice.aribaTaskId || invoice.status !== 'pending') {
      setIsModalOpen(false);
      toast.error('Invalid invoice or invoice is not pending');
      return;
    }

    const request: PatchRequisitionRequest = {
      state: action,
      comment: {
        text: `${action === 'approve' ? 'Approved' : 'Rejected'} via QuickApproval`,
        visibleToSupplier: false,
      },
      approvedInvoiceAmount: action === 'approve' ? invoice.invoiceAmount || 0 : 0,
    };

    try {

      const newStatus = action === 'approve' ? 'approved' : action === 'deny' ? 'rejected' : 'closed';
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: newStatus as 'approved' | 'rejected' | 'closed' } : inv
      ));
      updateStatusSummary(invoice.status || 'pending', newStatus as 'approved' | 'rejected' | 'closed');

      toast.success(`Invoice ${action === 'approve' ? 'approved' : 'rejected'} successfully`);

      const response = await patchRequisition(invoice.aribaTaskId, request);

      if (response.statusCode === 200) {
        await fetchPendingApprovals(currentPage);
      } else if (response.statusCode === 401) {
        setInvoices(prev => prev.map(inv =>
          inv.id === id ? { ...inv, status: invoice.status as any } : inv
        ));

        setErrorPage(true);
        setErrorPageData({
          title: 'Unauthorized',
          message: 'You are not authorized to perform this action.',
        });
      } else if (response.statusCode === 404) {
        setInvoices(prev => prev.map(inv =>
          inv.id === id ? { ...inv, status: invoice.status as any } : inv
        ));

        toast.error('Invoice not found in Ariba. It may have been processed already.');
        await fetchPendingApprovals(currentPage);
      } else {
        setInvoices(prev => prev.map(inv =>
          inv.id === id ? { ...inv, status: invoice.status as any } : inv
        ));

        toast.error(response.message || `Failed to ${action} invoice`);
      }
    } catch (error: any) {
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: invoice.status as any } : inv
      ));

      toast.error(`Failed to ${action} invoice: ${error.message || 'Unknown error'}`);
      await fetchPendingApprovals(currentPage);
    } finally {
      setIsModalOpen(false);
      setModalAction(null);
      setModalInvoiceId(null);
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setModalAction(null);
    setModalInvoiceId(null);
  };

  const totalPages = Math.ceil(statusSummary.total / limit);

  const handleCardClick = (type: string) => {
    setActiveCard(type);
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const handleModalConfirmError = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handlePopupClose = () => {
    setIsViewPopupOpen(false);
    setActiveTab('invoice-contract');
  };

  const handleSync = async () => {
    if (!canSync) {
      toast.info(`Please wait ${syncCooldown} seconds before syncing again`);
      return;
    }

    setIsSyncing(true);
    try {
      const response = await syncLatestPendingApprovals();

      if (!response || typeof response !== 'object') {
        toast.error('Invalid response from server');
        return;
      }

      if (response.statusCode === 204) {
        toast.info('You are up to date, No content');
      } else if (response.statusCode === 200) {
        toast.success(response.message || 'Sync completed successfully');

        await fetchPendingApprovals(1);
      } else if (response.statusCode === 401) {
        toast.error('Unauthorized - Please login again');
      } else if (response.statusCode === 403) {
        toast.error('Forbidden - You do not have permission');
      } else {
        toast.error(response.message || 'Failed to sync pending approvals');
      }
      setCanSync(false);
      setSyncCooldown(30);

    } catch (error: any) {
      toast.error('Failed to sync: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };
useEffect(() => {
  const closeDropdown = () => setIsStatusOpen(false);
  document.addEventListener('click', closeDropdown);

  return () => document.removeEventListener('click', closeDropdown);
}, []);

  return (
    <div className="quick-approval">
      <div className="quick-approval-header">
        <h1 className="title">Quick Approvals</h1>
        <div className="sync-button-wrapper">
          <button
            className="action-btn sync"
            title={!canSync ? `Wait ${syncCooldown}s` : "Sync"}
            onClick={handleSync}
            disabled={isSyncing || !canSync}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64" />
              <path d="M3.51 15A9 9 0 0 0 18.36 18.36" />
            </svg>
            <span>
              {isSyncing
                ? 'Syncing...'
                : !canSync
                  ? `Wait ${syncCooldown}s`
                  : 'Sync'
              }
            </span>
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <TicketStatsCard
          title="Total"
          count={loading ? 0 : statusSummary.total}
          type="total"
          active={activeCard === "total"}
          onClick={() => handleCardClick("total")}
        />
        <TicketStatsCard
          title="Approved"
          count={loading ? 0 : statusSummary.approved}
          type="approved"
          active={activeCard === "approved"}
          onClick={() => handleCardClick("approved")}
        />
        <TicketStatsCard
          title="Rejected"
          count={loading ? 0 : statusSummary.deny}
          type="rejected"
          active={activeCard === "rejected"}
          onClick={() => handleCardClick("rejected")}
        />
        <TicketStatsCard
          title="Pending"
          count={loading ? 0 : statusSummary.pending}
          type="pending"
          active={activeCard === "pending"}
          onClick={() => handleCardClick("pending")}
        />
        <TicketStatsCard
          title="Closed"
          count={loading ? 0 : statusSummary.closed}
          type="closed"
          active={activeCard === "closed"}
          onClick={() => handleCardClick("closed")}
        />
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Filters</span>
        </div>

        <div className="filters-inputs">
          <div className="quick-search-input">
            <label>Search</label>
            <div className="quick-search-wrapper">
              <input
                type="text"
                placeholder="Search by invoice no or supplier name or EP ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <button
                className="search-button-inside"
                onClick={handleSearch}
                type="button"
                aria-label="Search"
              >
                <FiSearch size={20} />
              </button>
            </div>
          </div>

          <div className="quick-search-input">
            <GLAccountsFilter onSelectionChange={handleGLAccountsChange} />
          </div>

          <div className="status-filter">     
  <label>Status</label>

  <div className="custom-select" onClick={(e) => e.stopPropagation()}>
    <div
  className="selected"
  onClick={() => setIsStatusOpen((prev) => !prev)}
>
  <span>
    {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
  </span>

  <svg
    className={`dropdown-icon ${isStatusOpen ? 'open' : ''}`}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>


    {isStatusOpen && (
      <div className="options">
        {[
          { label: 'All', value: 'all' },
          { label: 'Approved', value: 'approved' },
          { label: 'Pending', value: 'pending' },
          { label: 'Rejected', value: 'rejected' },
          { label: 'Closed', value: 'closed' },
        ].map((item) => (
          <div
            key={item.value}
            className="option"
            onClick={() => {
              setStatusFilter(item.value as any);
              setActiveCard('total');
              setCurrentPage(1);
              setIsStatusOpen(false);
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    )}
  </div>


          </div>

          <div className="date-input">
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="date-input">
            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="invoices-section">
        <div className="invoices-header">
          <h2>Invoices</h2>
          <div className="invoices-header-right">
            <div className="d-down-container">
              <button className="d-down-toggle-btn" onClick={toggleDropdown}>
                {selectedOption}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="d-down-menu">
                  {[100, 200, 300, 400, 500].map(option => (
                    <button
                      key={option}
                      className="d-down-item"
                      onClick={() => handleOptionSelect(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="action-btn download"
              onClick={isBusinessAdminOrLeadership ? handleDownload : handleDownloadUser}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download</span>
            </button>

            {!isMobile && (
              <div className="view-toggle">
                <button
                  className={viewMode === 'table' ? 'active' : ''}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading pending approvals...</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">No invoices found</div>
        ) : !isMobile && viewMode === 'table' ? (
          <div className="table-container">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>ENTITY</th>
                  {(isbusinessAdmin && <th>APPROVER</th>)}
                  <th>CONTRACT ID</th>
                  <th>INVOICE NO</th>
                  <th>PO NUMBER</th>
                  <th>EP ID</th>
                  <th>SUPPLIER</th>
                  <th>AMOUNT (With Taxes)</th>
                  <th>DEPARTMENT</th>
                  <th>PAYMENT DUE DATE</th>
                  <th >GL ACCOUNT</th>
                  <th >COST CENTER</th>
                  <th className='description-width'>DESCRIPTION</th>
                  <th>CONTRACT VALUE</th>
                  <th>VALUE ALREADY PAID</th>
                  <th>REMAINING BALANCE</th>
                  {(isbusinessAdmin && <th>EDIT</th>)}
                  <th>VIEW</th>
                  {(isleadershipUser || isOperationsUser || isFinanceOperationUser) && <th>SIGNED CONTRACT</th>}
                  <th className='qa-payment-status'>PAYMENT STATUS</th>
                  {(isbusinessAdmin || isleadershipUser) && <th>APPROVE/REJECT/ STATUS</th>}
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && <th>STATUS</th>}
                  <th>URL</th>
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && <th>Reminder</th>}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.entity}</td>
                    {(isbusinessAdmin && <td>{invoice.approver || 'N/A'}</td>)}
                    <td>{invoice.contractId}</td>
                    <td>{invoice.invoiceId}</td>
                    <td>{invoice.poNumber}</td>
                    <td>{invoice.epid}</td>
                    <td>{invoice.supplier}</td>
                    <td>{invoice.amount}</td>
                    <td>{invoice.department}</td>
                    <td>{invoice.paymentDueDate}</td>
                    <td>{invoice?.glAccount}</td>
                    <td>{invoice?.costCenter}</td>
                    <td className='description-width'>{invoice.description}</td>
                    <td>{invoice.contractValue}</td>
                    <td>{invoice.valueAlreadyPaid}</td>
                    <td>{invoice.remainingBalance}</td>
                    {(isbusinessAdmin &&
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => handleEdit(invoice.id)}
                          title="Edit"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </td>
                    )}

                    <td>
                      <button
                        className="icon-button"
                        onClick={() => handleViewDetails(invoice.id)}
                        title="View"
                      >
                        <IoMdEye size={18} />
                      </button>
                    </td>
                    {(isleadershipUser || isOperationsUser || isFinanceOperationUser) && (
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => setSignedContractInvoiceId(invoice.id)}
                          title="Signed Contract"
                        >
                          <FiFileText size={18} style={{ color: '#28a745' }} />
                        </button>
                      </td>
                    )}
                    <td className="qa-payment-status">
                      {isEditingPaymentStatus[invoice.id] ? (
                        <div className="payment-status-container">
                          <select
                            value={paymentStatusInputs[invoice.id] || ''}
                            onChange={(e) => handlePaymentStatusChange(invoice.id, e.target.value)}
                            className="payment-status-input"
                            autoFocus
                          >
                            <option value="" disabled>Select Status</option>
                            <option value="PENDING">PENDING</option>
                            <option value="PAID">PAID</option>
                            <option value="PARTIAL_PAID">PARTIAL_PAID</option>
                          </select>
                          <button
                            className="icon-button payment-status-submit-btn"
                            onClick={() => handlePaymentStatusUpdate(invoice.id)}
                            disabled={!paymentStatusInputs[invoice.id]?.trim()}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20,6 9,17 4,12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="payment-status-container">
                          {invoice.paymentStatus ? (
                            <>
                              {invoice.paymentStatus === 'PENDING' && (
                                <span className="status-badge payment-pending">PENDING</span>
                              )}
                              {invoice.paymentStatus === 'PAID' && (
                                <span className="status-badge payment-paid">PAID</span>
                              )}
                              {invoice.paymentStatus === 'PARTIAL_PAID' && (
                                <span className="status-badge payment-partial-paid">PARTIAL PAID</span>
                              )}
                            </>
                          ) : (
                            <span className="payment-status-placeholder">No payment status</span>
                          )}
                          {isFinanceOperationUser && (
                            <button
                              className="icon-button payment-status-edit-btn"
                              onClick={() => handleStartEditingPaymentStatus(invoice.id, invoice.paymentStatus || '')}
                              title="Edit Payment Status"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {(isbusinessAdmin || isleadershipUser) &&
                      <td className="approve-reject-status">
                        {invoice.status === 'approved' && (
                          <span className="status-badge approved">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Approved
                          </span>
                        )}
                        {invoice.status === 'rejected' && (
                          <span className="status-badge rejected">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Rejected
                          </span>
                        )}
                        {invoice.status === 'closed' && (
                          <span className="status-badge closed">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Closed
                          </span>
                        )}
                        {invoice.status === 'pending' && (
                          <div className="action-buttons">
                            <button className="icon-button approve" onClick={() => handleApprove(invoice.id)} title="Approve">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button className="icon-button reject" onClick={() => handleReject(invoice.id)} title="Reject">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    }
                    {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && (
                      <td className="status-only-column">
                        {invoice.status === 'approved' && (
                          <span className="status-badge approved">Approved</span>
                        )}
                        {invoice.status === 'rejected' && (
                          <span className="status-badge rejected">Rejected</span>
                        )}
                        {invoice.status === 'closed' && (
                          <span className="status-badge closed">Closed</span>
                        )}
                        {invoice.status === 'pending' && (
                          <span className="status-badge pending">Pending</span>
                        )}
                      </td>
                    )}
                    <td>
                      {invoice.fullUrl ? (
                        <a
                          href={invoice.fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ariba-link"
                        >
                          Navigate to Ariba
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    {(isbusinessUser || isOperationsUser) && (
                      <td>
                        {invoice.status === 'pending' && invoice.aribaTaskId ? (
                          <button
                            className="reminder-btn"
                            onClick={() => handleSendReminder(invoice.aribaTaskId!)}
                          >
                            Send Reminder
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid-container">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="grid-card">
                <div className="grid-card-header">
                  <h3>{invoice.supplier}</h3>
                  <span className="grid-amount">{invoice.amount}</span>
                </div>
                <div className="grid-card-body">
                  <div className="grid-row">
                    <span className="grid-label">Entity:</span>
                    <span className="grid-value">{invoice.entity}</span>
                  </div>
                  {(isbusinessAdmin &&
                    <div className="grid-row">
                      <span className="grid-label">Approver:</span>
                      <span className="grid-value">{invoice.approver || 'N/A'}</span>
                    </div>
                  )}
                  <div className="grid-row">
                    <span className="grid-label">Contract ID:</span>
                    <span className="grid-value">{invoice.contractId}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Invoice No:</span>
                    <span className="grid-value">{invoice.invoiceId}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">PO Number:</span>
                    <span className="grid-value">{invoice.poNumber}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">EP ID:</span>
                    <span className="grid-value">{invoice.epid}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Department:</span>
                    <span className="grid-value">{invoice.department}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Due Date:</span>
                    <span className="grid-value">{invoice.paymentDueDate}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">GL Account:</span>
                    <span className="grid-value">{invoice?.glAccount}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Cost Center:</span>
                    <span className="grid-value">{invoice?.costCenter}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Description:</span>
                    <span className="grid-value">{invoice.description}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Contract Value:</span>
                    <span className="grid-value">{invoice.contractValue}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Paid:</span>
                    <span className="grid-value">{invoice.valueAlreadyPaid}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Balance:</span>
                    <span className="grid-value">{invoice.remainingBalance}</span>
                  </div>
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && (
                    <div className="grid-row">
                      <span className="grid-label">Status:</span>
                      <span className="grid-value">
                        {invoice.status === 'approved' && (
                          <span className="status-badge approved">
                            Approved
                          </span>
                        )}
                        {invoice.status === 'rejected' && (
                          <span className="status-badge rejected">
                            Rejected
                          </span>
                        )}
                        {invoice.status === 'closed' && (
                          <span className="status-badge closed">
                            Closed
                          </span>
                        )}
                        {invoice.status === 'pending' && (
                          <span className="status-badge pending">Pending</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="grid-row">
                    <span className="grid-label">Ariba URL:</span>
                    <span className="grid-value">
                      {invoice.fullUrl ? (
                        <a href={invoice.fullUrl} target="_blank" rel="noopener noreferrer" className="ariba-link">
                          Navigate to Ariba
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && (
                    <div className="grid-row">
                      <span className="grid-label">Reminder:</span>
                      <span className="grid-value">
                        {invoice.status === 'pending' && invoice.aribaTaskId ? (
                          <button
                            className="reminder-btn small"
                            onClick={() => handleSendReminder(invoice.aribaTaskId!)}
                          >
                            Send Reminder
                          </button>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  )}
                  <div className="grid-row">
                    <span className="grid-label">Payment Status:</span>
                    <span className="grid-value">
                      {isEditingPaymentStatus[invoice.id] ? (
                        <div className="payment-status-container">
                          <select
                            value={paymentStatusInputs[invoice.id] || ''}
                            onChange={(e) => handlePaymentStatusChange(invoice.id, e.target.value)}
                            className="payment-status-input"
                            autoFocus
                          >
                            <option value="" disabled>Select Status</option>
                            <option value="PENDING">PENDING</option>
                            <option value="PAID">PAID</option>
                            <option value="PARTIAL_PAID">PARTIAL_PAID</option>
                          </select>
                          <button
                            className="icon-button payment-status-submit-btn"
                            onClick={() => handlePaymentStatusUpdate(invoice.id)}
                            disabled={!paymentStatusInputs[invoice.id]?.trim()}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20,6 9,17 4,12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="payment-status-container">
                          {invoice.paymentStatus ? (
                            <>
                              {invoice.paymentStatus === 'PENDING' && (
                                <span className="status-badge payment-pending">PENDING</span>
                              )}
                              {invoice.paymentStatus === 'PAID' && (
                                <span className="status-badge payment-paid">PAID</span>
                              )}
                              {invoice.paymentStatus === 'PARTIAL_PAID' && (
                                <span className="status-badge payment-partial-paid">PARTIAL PAID</span>
                              )}
                            </>
                          ) : (
                            <span className="payment-status-placeholder">No payment status</span>
                          )}
                          {isFinanceOperationUser && (
                            <button
                              className="icon-button payment-status-edit-btn"
                              onClick={() => handleStartEditingPaymentStatus(invoice.id, invoice.paymentStatus || '')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </span>
                  </div>
                </div>
                <div className="grid-card-footer">
                  <div className="grid-actions">
                    {(isbusinessAdmin) && (
                      <button className="icon-button edit" onClick={() => handleEdit(invoice.id)} title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    <button className="icon-button view" onClick={() => handleViewDetails(invoice.id)} title="View">
                      <IoMdEye size={18} />
                    </button>
                    {(isleadershipUser || isOperationsUser || isFinanceOperationUser) && (
                      <button
                        className="icon-button"
                        onClick={() => setSignedContractInvoiceId(invoice.id)}
                        title="Signed Contract"
                      >
                        <FiFileText size={18} style={{ color: '#28a745' }} />
                      </button>
                    )}
                  </div>
                  {invoice.status === 'approved' && (
                    <span className="status-badge approved">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Approved
                    </span>
                  )}
                  {invoice.status === 'rejected' && (
                    <span className="status-badge rejected">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Rejected
                    </span>
                  )}
                  {invoice.status === 'closed' && (
                    <span className="status-badge closed">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Closed
                    </span>
                  )}
                  {invoice.status === 'pending' && (isbusinessAdmin || isleadershipUser) && (
                    <div className="grid-action-buttons">
                      <button className="icon-button approve-button" onClick={() => handleApprove(invoice.id)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button className="icon-button reject-button" onClick={() => handleReject(invoice.id)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pagination">
        <button
          className="pagination-button"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <button
          className="pagination-button next"
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={currentPage >= totalPages || invoices.length < limit}
        >
          Next
        </button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        action={modalAction}
        invoiceId={modalInvoiceId}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />

      <QuickApprovalViewPopup
        isOpen={isViewPopupOpen}
        selectedRow={selectedInvoice}
        onClose={handlePopupClose}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {errorPage && (
        <ErrorModel
          visible={true}
          title={errorPageData.title}
          message={errorPageData.message}
          onClose={handleModalClose}
          onConfirm={handleModalConfirmError}
        />
      )}

      <InvoiceEditPopup
        isOpen={editPopupOpen}
        invoiceId={editingInvoiceId}
        initialForm={editInitialForm}
        onSave={handleEditSaveFromPopup}
        onClose={() => {
          setEditPopupOpen(false);
          setEditingInvoiceId(null);
        }}
      />
      <ReminderConfirmationModal />

      {signedContractInvoiceId && (() => {
        const foundInvoice = invoices.find(i => i.invoiceId === signedContractInvoiceId);

        return (
          <SignedContractPopup
            entityType="invoice"
            entityId={signedContractInvoiceId}
            approver={foundInvoice?.approver || ''}
            onClose={() => setSignedContractInvoiceId(null)}
            onUploadSuccess={(_fileName) => {
            }}
            userRole={roleId}
          />
        );
      })()}
    </div>

  );
};

export default QuickApproval;