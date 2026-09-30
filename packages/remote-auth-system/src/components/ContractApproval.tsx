import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ContractApproval.css';
import { IoMdEye } from "react-icons/io";
import { FiFileText, FiSearch } from "react-icons/fi";
import TicketStatsCard from '../components/TicketStatsCard';
import ErrorModel from '../components/ErrorModel';
import ContractApprovalViewPopup from './ContractApprovalViewPopup';
import { ContractDashBoard, getContractApprovals, syncLatestPendingApprovalsContract, triggerAribaNotification} from '../api/AribaApi';
import { downloadContractApprovalsExcel, type StatusSummaryDto } from '../api/AribaApi';
import { approveOrRejectContract } from '../api/ContractApprovalApi';
import type { InvoiceApprovalDto } from "../Dto/InvoiceApprovalDto";
import { useAuth } from './context/AuthContext';
import { USER_ROLES } from '../common/common';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import ContractEditModal from './ContractEditModal';
import type{ContractEditDto} from './ContractEditModal';
import { getContractEditData } from '../api/ContractApi';
import SignedContractPopup from './SignedContractPopup';

export interface Invoice {
  id: string;
  contractTaskId: string;
  contractId: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  beginDate: string;
  endDate?: string;
  description: string;
  department?: string;
  approver: string;
  status: 'approved' | 'rejected' | 'closed' | 'pending' | null;
  fullUrl?: string;
  approvalHistory: ApprovalHistoryDto[];
  attachmentID: string;
  companyUniqueName?: string;
  materialCode?: string;
  commodityCode?: string;
  balanceAmount?: number;
  amountSpend?: number;
  hasAttachment: boolean;
  workspaceId?: string;
}

export interface ApprovalHistoryDto {
  approvalDate: string | null;
  level: string;
  status: string;
  aribaUser: string;
  approver: string;
}


interface ConfirmationModalProps {
  isOpen: boolean;
  action: 'approve' | 'deny' | null;
  contractId: string | null;
  onConfirm: (id: string, action: 'approve' | 'deny', comment: string) => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, action, contractId, onConfirm, onCancel }) => {
  const [comment, setComment] = useState('');
 
  if (!isOpen || !action || !contractId) return null;

  const handleConfirm = () => {
    onConfirm(contractId, action, comment);
    setComment('');
  };

  const handleCancel = () => {
    onCancel();
    setComment('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm {action === 'approve' ? 'Approval' : 'Rejection'}</h2>
        <p>Are you sure you want to {action} this contract?</p>
        <div className="modal-comment-section">
          <label htmlFor="comment">Comment (Optional):</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment here..."
            maxLength={500}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              minHeight: '80px',
              fontFamily: 'inherit'
            }}
          />
          <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
            {comment.length}/500
          </span>
        </div>
        <div className="modal-buttons">
          <button
            className={`modal-button ${action === 'approve' ? 'approve' : 'reject'}`}
            onClick={handleConfirm}
          >
            {action === 'approve' ? 'Approve' : 'Reject'}
          </button>
          <button className="modal-button cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function isPendingApprovalArray(
  response: any[] | ErrorResponseDto
): response is any[] {
  return Array.isArray(response);
}

const ContractApproval: React.FC = () => {
  const navigate = useNavigate();
  const lastErrorToastRef = useRef<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(window.innerWidth <= 768 ? 'grid' : 'table');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [modalContractId, setModalContractId] = useState<string | null>(null);
  const [isViewPopupOpen, setIsViewPopupOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(100);
  const [isInitialDashboardLoaded, setIsInitialDashboardLoaded] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<'contract' | 'approval-history'>('contract');
  const [editLoadingState, setEditLoadingState] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusSummary, setStatusSummary] = useState<StatusSummaryDto>({
    pending: 0,
    approved: 0,
    deny: 0,
    total: 0,
    closed: 0,
  });
  const [signedContractContractId, setSignedContractContractId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Invoice[]>([]);
  const limit = 8;
  const { auth } = useAuth();
  const roleId = auth?.roleId;
  const isbusinessAdmin = roleId === USER_ROLES.BUSINESS_ADMIN_USER;
  const isbusinessUser = roleId === USER_ROLES.BUSINESS_USER;
  const isleadershipUser = roleId === USER_ROLES.LEADERSHIP_USER;
  const isBusinessAdminOrLeadership = isbusinessAdmin || isleadershipUser;
  const isOperationsUser = roleId === USER_ROLES.OPERATIONS_USER;
  const isFinanceOperationUser = roleId === USER_ROLES.FINANCE_OPERATION_USER;
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editInitialForm, setEditInitialForm] = useState<ContractEditDto>({
    description: '',
    contractValue: '',
  });

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  const handleOptionSelect = (value: React.SetStateAction<number>) => {
    setSelectedOption(value);
    setIsDropdownOpen(false);
  };

  const formatAmount = (amount?: number | string): string => {
    if (amount === null || amount === undefined || amount === '') return '-';

    const value = Number(amount);
    if (isNaN(value)) return '-';

    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };



  const handleDownloadUser = () => {
    if (contracts.length === 0) {
      toast.info('No data to export');
      return;
    }

    const headers = [
      'ENTITY',
      ...(isbusinessAdmin ? ['APPROVER'] : []),
      'CONTRACT ID',
      'SUPPLIER',
      'AMOUNT',
      'CURRENCY',
      'BEGIN DATE',
      'END DATE',
      'DEPARTMENT',
      'DESCRIPTION',
      'MATERIAL CODE',
      'COMMODITY CODE',
      ...(isbusinessAdmin || isleadershipUser ? ['APPROVE/REJECT/ STATUS'] : []),
      ...(isbusinessUser || isOperationsUser || isFinanceOperationUser ? ['STATUS'] : []),
    ];

    const csvRows = [
      headers.join(','),
      ...contracts.map(contract => {
        const row = [
          contract.companyUniqueName || '-',
          ...(isbusinessAdmin ? [contract.approver || '-'] : []),
          contract.contractTaskId,
          contract.supplierName,
          formatAmount(contract.totalAmount),
          contract.currency,
          contract.beginDate,
          contract.endDate || '-',
          contract.department || '-',
          contract.description,
          contract.materialCode || '-',
          contract.commodityCode || '-',
          ...(isbusinessAdmin || isleadershipUser ? [contract.status?.toUpperCase() ?? ''] : []),
          ...(isbusinessUser || isOperationsUser || isFinanceOperationUser ? [contract.status?.toUpperCase() ?? ''] : []),
        ];

        return row.map(cell =>
          `"${String(cell).replace(/"/g, '""')}"`
        ).join(',');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Contract_Approvals_${new Date().toISOString().slice(0, 10)}.csv`);
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
      const params = new URLSearchParams({
        limit: String(selectedOption),
        searchTerm: searchTerm.trim(),
        fromDate: formatDateToDateTime(fromDate),
        toDate: formatDateToDateTime(toDate),
        status: statusParam,
      });

      toast.info('Preparing your Excel download. This may take a moment...');
      const responseBlob = await downloadContractApprovalsExcel(params.toString());

      const url = URL.createObjectURL(responseBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Contract_Approvals_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

const handleEdit = (id: string) => {
  const contract = contracts.find((c) => c.id === id);
  if (!contract) return;

  setEditingContractId(id);
  setEditInitialForm({
    description: contract.description || '',
    contractValue: contract.totalAmount?.toString() || '',
  });
  setEditPopupOpen(true);
};

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string | null>(null);
 const [canSync, setCanSync] = useState(true);
 const [isSyncing, setIsSyncing] = useState(false);
 const [syncCooldown, setSyncCooldown] = useState(0);
 const [isLoading, setIsLoading] = useState(false);
 const [autoSynced, setAutoSynced] = useState(false);
  const handleSendReminder = (taskId: string) => {
    setReminderTaskId(taskId);
    setIsReminderModalOpen(true);
  };

const handleEditSaveFromPopup = async (form: ContractEditDto) => {
  if (!editingContractId) return;

  const contract = contracts.find((c) => c.id === editingContractId);
  if (!contract) return;

  setEditLoadingState(true);

  try {
    const taskId = contract.contractTaskId;
    
    if (!taskId) {
      toast.error('Contract Task ID not found');
      setEditLoadingState(false);
      return;
    }

    const resp = await getContractEditData(taskId, form) as any;

    if (resp?.statusCode === 200) {
      const updatedAmount = form.contractValue
        ? Number(form.contractValue)
        : contract.totalAmount;

      setContracts((prev) =>
        prev.map((c) =>
          c.id === editingContractId
            ? {
                ...c,
                description: form.description.trim(),
                totalAmount: updatedAmount,
              }
            : c
        )
      );

      setEditPopupOpen(false);
      setEditingContractId(null);
      setEditLoadingState(false);

      toast.success('Contract updated successfully');
      
      await fetchPendingApprovals(currentPage);
    } else if (resp?.statusCode === 401) {
      toast.error('Unauthorized');
      setErrorPage(true);
      setErrorPageData({ 
        title: resp.message || 'Unauthorized', 
        message: resp.description || 'Not authorized.' 
      });
      setEditLoadingState(false);
      navigate('/');
    } else if (resp?.statusCode === 404) {
      toast.error('Contract not found. It may have been processed already.');
      setEditLoadingState(false);
      await fetchPendingApprovals(currentPage);
    } else {
      toast.error(resp?.message || 'Failed to save contract');
      setEditLoadingState(false);
    }
  } catch (err: any) {
    const error = err as any;
    setEditLoadingState(false);
    
    if (error?.statusCode === 401) {
      toast.error('Unauthorized');
      setErrorPage(true);
      setErrorPageData({ 
        title: 'Unauthorized', 
        message: 'You are not authorized to edit this contract.' 
      });
      navigate('/');
    } else if (error?.statusCode === 404) {
      toast.error('Contract task not found in Ariba');
      await fetchPendingApprovals(currentPage);
    } else {
      toast.error(error?.message || 'Failed to update contract');
    }
  }
};

  const handleConfirmReminder = async () => {
    if (!reminderTaskId) return;

    const contract = contracts.find(c => c.contractTaskId === reminderTaskId);
    if (!contract) {
      toast.error('Contract not found for reminder.');
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
      return;
    }

    const pendingApprover = contract.approvalHistory?.find(h => h.status?.toLowerCase() === 'pending')?.aribaUser
      || contract.approvalHistory?.[0]?.aribaUser;

    if (!pendingApprover) {
      toast.error('Approver username not found for this contract.');
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
      return;
    }

    try {
      const entityType = 'contract';
      const aribaId = contract.contractId || contract.id || reminderTaskId;

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

  const handleCancelReminder = () => {
    setIsReminderModalOpen(false);
    setReminderTaskId(null);
  };



  const ReminderConfirmationModal: React.FC = () => {
    if (!isReminderModalOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Send Reminder</h2>
          <p>Are you sure you want to send a reminder for this contract?</p>
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
    setCurrentPage(1);
  };

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

      const response = await getContractApprovals(
        index,
        limit,
        searchTerm.trim(),
        formatDateToDateTime(fromDate),
        formatDateToDateTime(toDate),
        status,
      );

      if (isPendingApprovalArray(response)) {
        
        const transformedContracts: Invoice[] = response.map((item: any) => ({
          id: item.contractTaskId || '-',
          contractTaskId: item.contractTaskId,
          contractId: item.contractId || '-',
          supplierName: item.supplierName || '-',
          totalAmount: item.totalAmount || 0,
          currency: item.currency || '-',
          beginDate: item.beginDate ? new Date(item.beginDate).toLocaleDateString('en-GB') : '-',
          endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB') : '-',
          description: item.description || '-',
          department: item.department || '-',
          approver: item.approver || '-',
          status: ((): Invoice['status'] => {
            const s = item.status?.toLowerCase() || '';
            if (s.includes('approve')) return 'approved';
            if (s.includes('reject') || s.includes('deny')) return 'rejected';
            if (s.includes('close')) return 'closed';
            if (s.includes('pending')) return 'pending';
            return null;
          })(),
          fullUrl: item.fullUrl,
          approvalHistory: item.approvalHistory || [],
          attachmentID: item.attachmentID,
          companyUniqueName: item.companyUniqueName || 'N/A',
          materialCode: item.materialCode,
          commodityCode: item.commodityCode,
          balanceAmount: item.balanceAmount,
          amountSpend: item.amountSpend,
          hasAttachment: !!item.attachmentID,
          workspaceId: item.workspaceID,
        }));
        setContracts(transformedContracts);
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
          setContracts([]);
        } else {
          const errMsg = response.message || 'Failed to fetch pending approvals';
          if (lastErrorToastRef.current !== errMsg) {
            toast.error(errMsg);
            lastErrorToastRef.current = errMsg;
          }
          setContracts([]);
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
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialDashboardLoaded && contracts.length === 0) return;
    fetchPendingApprovals(currentPage);
  }, [currentPage, fromDate, toDate, activeCard, statusFilter, searchTerm, selectedOption]);

  const isErrorResponse = (data: any): data is ErrorResponseDto => {
    return data && typeof data.statusCode === 'number';
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoading(true);

      const [dashboardResponse, approvalsResponse] = await Promise.all([
        ContractDashBoard().catch(() => ({ total: 0, pending: 0, approved: 0, deny: 0, closed: 0 })),
        getContractApprovals(0, limit, '', '', '', '')
      ]);

      if (!isMounted) return;

      if (dashboardResponse && !isErrorResponse(dashboardResponse)) {
        setStatusSummary(dashboardResponse);
      }

      if (isPendingApprovalArray(approvalsResponse)) {
        const transformedContracts: Invoice[] = approvalsResponse.map((item: any) => ({
          id: item.contractTaskId || 'N/A',
          contractTaskId: item.contractTaskId,
          contractId: item.contractId || 'N/A',
          supplierName: item.supplierName || 'N/A',
          totalAmount: item.totalAmount || 0,
          currency: item.currency || 'N/A',
          beginDate: item.beginDate ? new Date(item.beginDate).toLocaleDateString('en-GB') : 'N/A',
          endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB') : 'N/A',
          description: item.description || 'N/A',
          department: item.department || 'N/A',
          approver: item.approver || 'N/A',
          status: ((): Invoice['status'] => {
            const s = item.status?.toLowerCase() || '';
            if (s.includes('approve')) return 'approved';
            if (s.includes('reject') || s.includes('deny')) return 'rejected';
            if (s.includes('close')) return 'closed';
            if (s.includes('pending')) return 'pending';
            return null;
          })(),
          fullUrl: item.fullUrl,
          approvalHistory: item.approvalHistory || [],
          attachmentID: item.attachmentID,
          companyUniqueName: item.companyUniqueName || 'N/A',
          materialCode: item.materialCode,
          commodityCode: item.commodityCode,
          balanceAmount: item.balanceAmount,
          amountSpend: item.amountSpend,
          hasAttachment: !!item.attachmentID,
          workspaceId: item.workspaceId,
        }));

        setContracts(transformedContracts);
      } else if (isErrorResponse(approvalsResponse)) {
        if (approvalsResponse.statusCode === 401) {
          navigate('/');
        } else {
          toast.error('Failed to load approvals');
          setContracts([]);
        }
      }

      setLoading(false);
      setIsInitialDashboardLoaded(true);
    };

    loadInitialData();

    return () => { isMounted = false; };
  }, []);

  const handleApprove = (id: string) => {
    setModalAction('approve');
    setModalContractId(id);
    setIsModalOpen(true);
  };

  const handleReject = (id: string) => {
    setModalAction('deny');
    setModalContractId(id);
    setIsModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (contract) {
      setSelectedInvoice(contract);
      setIsViewPopupOpen(true);
    }
  };

  const updateStatusSummary = (oldStatus: string, newStatus: 'approved' | 'rejected' | 'closed') => {
    setStatusSummary(prev => {
      const updated = { ...prev };

      if (oldStatus === 'pending') updated.pending = Math.max(0, updated.pending - 1);
      else if (oldStatus === 'approved') updated.approved = Math.max(0, updated.approved - 1);
      else if (oldStatus === 'rejected') updated.deny = Math.max(0, updated.deny - 1);
      else if (oldStatus === 'closed') updated.closed = Math.max(0, updated.closed - 1);

      if (newStatus === 'approved') updated.approved += 1;
      else if (newStatus === 'rejected') updated.deny += 1;
      else if (newStatus === 'closed') updated.closed += 1;

      if (oldStatus === 'pending') {
        updated.total = Math.max(0, updated.total - 1);
      }

      return updated;
    });
  };

const handleModalConfirm = async (id: string, action: 'approve' | 'deny', comment: string = '') => {
  const contract = contracts.find(c => c.id === id);
  if (!contract || !contract.contractTaskId || contract.status !== 'pending') {
    setIsModalOpen(false);
    toast.error('Invalid contract or contract is not pending');
    return;
  }

  const request: InvoiceApprovalDto = {
    actionableType: 'Task',
    uniqueName: contract.contractTaskId,
    actionName: action === 'approve' ? 'Approve' : 'Deny', 
    options: {
      comment: comment.trim(), 
    },
  };

  try {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    setContracts(prev =>
      prev.map(c => (c.id === id ? { ...c, status: newStatus as any } : c))
    );
    updateStatusSummary(contract.status || 'pending', newStatus as any);

    const response = await approveOrRejectContract(request);
    if (response.statusCode === 200) {
      toast.success(
        `Contract ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      );
      await fetchPendingApprovals(currentPage);
    } else if (response.statusCode === 401) {
      setContracts(prev =>
        prev.map(c => (c.id === id ? { ...c, status: contract.status as any } : c))
      );
      setErrorPage(true);
      setErrorPageData({
        title: 'Unauthorized',
        message: 'You are not authorized to perform this action.',
      });
    } else if (response.statusCode === 404) {
      setContracts(prev =>
        prev.map(c => (c.id === id ? { ...c, status: contract.status as any } : c))
      );
      toast.error(
        'Contract not found in Ariba. It may have been processed already.'
      );
      await fetchPendingApprovals(currentPage);
    } else {
      setContracts(prev =>
        prev.map(c => (c.id === id ? { ...c, status: contract.status as any } : c))
      );
      toast.error(response.message || `Failed to ${action} contract`);
    }
  } catch (error: any) {
    setContracts(prev =>
      prev.map(c => (c.id === id ? { ...c, status: contract.status as any } : c))
    );
    toast.error(`Failed to ${action} contract: ${error.message || 'Unknown error'}`);
    await fetchPendingApprovals(currentPage);
  } finally {
    setIsModalOpen(false);
    setModalAction(null);
    setModalContractId(null);
  }
};
  const handleModalCancel = () => {
    setIsModalOpen(false);
    setModalAction(null);
    setModalContractId(null);
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
    setActiveTab('contract');
  };
   const refreshTable = async () => {
     try {
      const response: any = await getContractApprovals(  0,
        limit,
        searchTerm.trim(),
        "",
        "",
        status,);
      if (isErrorResponse(response) && response.statusCode === 401) {
          setContracts([]);
         navigate('/');
        return;
      }
  if (isPendingApprovalArray(response)) {
  
        const transformedContracts: Invoice[] = response.map((item: any) => ({
          id: item.contractTaskId || '-',
          contractTaskId: item.contractTaskId,
          contractId: item.contractId || '-',
          supplierName: item.supplierName || '-',
          totalAmount: item.totalAmount || 0,
          currency: item.currency || '-',
          beginDate: item.beginDate ? new Date(item.beginDate).toLocaleDateString('en-GB') : '-',
          endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB') : '-',
          description: item.description || '-',
          department: item.department || '-',
          approver: item.approver || '-',
          status: ((): Invoice['status'] => {
            const s = item.status?.toLowerCase() || '';
            if (s.includes('approve')) return 'approved';
            if (s.includes('reject') || s.includes('deny')) return 'rejected';
            if (s.includes('close')) return 'closed';
            if (s.includes('pending')) return 'pending';
            return null;
          })(),
          fullUrl: item.fullUrl,
          approvalHistory: item.approvalHistory || [],
          attachmentID: item.attachmentID,
          companyUniqueName: item.companyUniqueName || 'N/A',
          materialCode: item.materialCode,
          commodityCode: item.commodityCode,
          balanceAmount: item.balanceAmount,
          amountSpend: item.amountSpend,
          hasAttachment: !!item.attachmentID,
          workspaceId: item.workspaceID,
        }));
        setContracts(transformedContracts);
     

      setTimeout(() => {
        setIsLoading(false);
     
      }, 1500);

    } 
  }catch (error: any) {
     if(error.response?.status === 401){
       navigate('/');
     }
      setIsLoading(false);
    }
}
 const handleSync = async () => {
    if (!canSync) return;
  
    setIsSyncing(true);
    setCanSync(false);
    setSyncCooldown(30);
  
    try {
      const syncRes = await syncLatestPendingApprovalsContract();
  
      if (syncRes?.statusCode === 200 || syncRes?.statusCode === 204) {
        await refreshTable();
      }
    } catch (err) {
     
    }
  
    // Cooldown timer
    const timer = setInterval(() => {
      setSyncCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSync(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
    setIsSyncing(false);
  };
  useEffect(() => {
    if (autoSynced) return;  // already synced once
  
    const autoSync = async () => {
      setAutoSynced(true);
      setIsSyncing(true);
  
      try {
        const syncRes = await syncLatestPendingApprovalsContract();
  
        if (syncRes?.statusCode === 200 || syncRes?.statusCode === 204) {
          await refreshTable();
        }
      } catch (err:any) {
        if(err.response?.status === 401){
        navigate('/');
        }
      
      }
  
      setIsSyncing(false);
    };
  
    autoSync();
  }, []);
    
  useEffect(() => {
    const closeDropdown = () => setIsStatusOpen(false);
    document.addEventListener('click', closeDropdown);
  
    return () => document.removeEventListener('click', closeDropdown);
  }, []);
  return (
    <div className="quick-approval">
      <div className="quick-approval-header">
        <h1 className="title">Contract Approvals</h1>
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
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Filters</span>
        </div>

        <div className="filters-inputs">
          <div className="quick-search-input">
            <label>Search</label>
            <div className="quick-search-wrapper">
              <input
                type="text"
                placeholder="Search by contract ID or supplier name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <button
                className="search-button-inside"
                onClick={handleSearch}
                disabled={!isLoading}
                type="button"
                aria-label="Search"
              >
                <FiSearch size={20} />
              </button>
            </div>
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
          <h2>Contracts</h2>
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
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading pending approvals...</div>
        ) : contracts.length === 0 ? (
          <div className="empty-state">No contracts found</div>
        ) : !isMobile && viewMode === 'table' ? (
          <div className="table-container">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>ENTITY</th>
                  {isbusinessAdmin && <th>APPROVER</th>}
                  <th>CONTRACT ID</th>
                  <th>SUPPLIER</th>
                  <th>AMOUNT</th>
                  <th>CURRENCY</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>DEPARTMENT</th>
                  <th>DESCRIPTION</th>
                  <th>MATERIAL CODE</th>
                  <th>COMMODITY CODE</th>
                  {isbusinessAdmin && <th>EDIT</th>}
                  <th>VIEW</th>
                  {(isleadershipUser || isOperationsUser || isFinanceOperationUser) && <th>SIGNED CONTRACT</th>}
                  {(isbusinessAdmin || isleadershipUser) && <th>APPROVE/REJECT/STATUS</th>}
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && <th>STATUS</th>}
                  <th>URL</th>
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) && <th>REMINDER</th>}
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.companyUniqueName}</td>
                    {isbusinessAdmin && <td>{contract.approver || 'N/A'}</td>}
                    <td>{contract.contractTaskId}</td>
                    <td>{contract.supplierName}</td>
                    <td>{formatAmount(contract.totalAmount)}</td>
                    <td>{contract.currency}</td>
                    <td>{contract.beginDate}</td>
                    <td>{contract.endDate || 'N/A'}</td>
                    <td>{contract.department || 'N/A'}</td>
                    <td>{contract.description}</td>
                    <td>{contract.materialCode || 'N/A'}</td>
                    <td>{contract.commodityCode || 'N/A'}</td>
                    {(isbusinessAdmin &&
                        <td>
                          <button
                            className="icon-button"
                            onClick={() => handleEdit(contract.id)}
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
                        onClick={() => handleViewDetails(contract.id)}
                        title="View"
                      >
                        <IoMdEye size={18} />
                      </button>
                    </td>
                    {(isleadershipUser || isOperationsUser || isFinanceOperationUser) && (
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => setSignedContractContractId(contract.id)}
                          title="Signed Contract"
                        >
                          <FiFileText size={18} style={{ color: '#28a745' }} />
                        </button>
                      </td>
                    )}
                    {(isbusinessAdmin || isleadershipUser) &&
                      <td className="approve-reject-status">
                        {contract.status === 'approved' && (
                          <span className="status-badge approved">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Approved
                          </span>
                        )}
                        {contract.status === 'rejected' && (
                          <span className="status-badge rejected">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Rejected
                          </span>
                        )}
                        {contract.status === 'closed' && (
                          <span className="status-badge closed">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Closed
                          </span>
                        )}
                        {contract.status === 'pending' && (
                          <div className="action-buttons">
                            <button className="icon-button approve" onClick={() => handleApprove(contract.id)} title="Approve">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button className="icon-button reject" onClick={() => handleReject(contract.id)} title="Reject">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    }
                    {(isbusinessUser || isOperationsUser || isFinanceOperationUser) &&
                      <td className="status-only-column">
                        {contract.status === 'approved' && (
                          <span className="status-badge approved">Approved</span>
                        )}
                        {contract.status === 'rejected' && (
                          <span className="status-badge rejected">Rejected</span>
                        )}
                        {contract.status === 'closed' && (
                          <span className="status-badge closed">Closed</span>
                        )}
                        {contract.status === 'pending' && (
                          <span className="status-badge pending">Pending</span>
                        )}
                      </td>
                    }
                    <td>
                      {contract.fullUrl ? (
                        <a
                          href={contract.fullUrl}
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
                    {(isbusinessUser || isOperationsUser || isFinanceOperationUser) &&
                      <td>
                        {contract.status === 'pending' && contract.contractTaskId ? (
                          <button
                            className="reminder-btn"
                            onClick={() => handleSendReminder(contract.contractTaskId!)}
                          >
                            Send Reminder
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid-container">
            {contracts.map((contract) => (
              <div key={contract.id} className="grid-card">
                <div className="grid-card-header">
                  <h3>{contract.supplierName}</h3>
                  <span className="grid-amount">{formatAmount(contract.totalAmount)} {contract.currency}</span>
                </div>
                <div className="grid-card-body">
                  <div className="grid-row">
                    <span className="grid-label">Entity:</span>
                    <span className="grid-value">{contract.companyUniqueName}</span>
                  </div>
                  {isbusinessAdmin &&
                    <div className="grid-row">
                      <span className="grid-label">Approver:</span>
                      <span className="grid-value">{contract.approver || 'N/A'}</span>
                    </div>
                  }
                  <div className="grid-row">
                    <span className="grid-label">Contract ID:</span>
                    <span className="grid-value">{contract.contractId}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Begin Date:</span>
                    <span className="grid-value">{contract.beginDate}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">End Date:</span>
                    <span className="grid-value">{contract.endDate || 'N/A'}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Department:</span>
                    <span className="grid-value">{contract.department || 'N/A'}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Description:</span>
                    <span className="grid-value">{contract.description}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Material Code:</span>
                    <span className="grid-value">{contract.materialCode || 'N/A'}</span>
                  </div>
                  <div className="grid-row">
                    <span className="grid-label">Commodity Code:</span>
                    <span className="grid-value">{contract.commodityCode || 'N/A'}</span>
                  </div>
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) &&
                    <div className="grid-row">
                      <span className="grid-label">Status:</span>
                      <span className="grid-value">
                        {contract.status === 'approved' && (
                          <span className="status-badge approved">Approved</span>
                        )}
                        {contract.status === 'rejected' && (
                          <span className="status-badge rejected">Rejected</span>
                        )}
                        {contract.status === 'closed' && (
                          <span className="status-badge closed">Closed</span>
                        )}
                        {contract.status === 'pending' && (
                          <span className="status-badge pending">Pending</span>
                        )}
                      </span>
                    </div>
                  }
                  <div className="grid-row">
                    <span className="grid-label">Ariba URL:</span>
                    <span className="grid-value">
                      {contract.fullUrl ? (
                        <a href={contract.fullUrl} target="_blank" rel="noopener noreferrer" className="ariba-link">
                          Navigate to Ariba
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  {(isbusinessUser || isOperationsUser || isFinanceOperationUser) &&
                    <div className="grid-row">
                      <span className="grid-label">Reminder:</span>
                      <span className="grid-value">
                        {contract.status === 'pending' && contract.contractTaskId ? (
                          <button
                            className="reminder-btn small"
                            onClick={() => handleSendReminder(contract.contractTaskId!)}
                          >
                            Send Reminder
                          </button>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  }
                </div>
                <div className="grid-card-footer">
                  <div className="grid-actions">
                    {(isbusinessAdmin) && (
                      <button className="icon-button edit" onClick={() => handleEdit(contract.id)} title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    <button className="icon-button view" onClick={() => handleViewDetails(contract.id)} title="View">
                      <IoMdEye size={18} />
                    </button>
                    {(isleadershipUser || isOperationsUser || isFinanceOperationUser) && (
                    <button
                      className="icon-button"
                      onClick={() => setSignedContractContractId(contract.id)}
                      title="Signed Contract"
                    >
                      <FiFileText size={18} style={{ color: '#28a745' }} />
                    </button>
                  )}

                  </div>
                  {contract.status === 'approved' && (
                    <span className="status-badge approved">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Approved
                    </span>
                  )}
                  {contract.status === 'rejected' && (
                    <span className="status-badge rejected">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Rejected
                    </span>
                  )}
                  {contract.status === 'closed' && (
                    <span className="status-badge closed">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Closed
                    </span>
                  )}
                  {contract.status === 'pending' && (isbusinessAdmin || isleadershipUser) && (
                    <div className="grid-action-buttons">
                      <button className="icon-button approve-button" onClick={() => handleApprove(contract.id)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button className="icon-button reject-button" onClick={() => handleReject(contract.id)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
          disabled={currentPage >= totalPages || contracts.length < limit}
        >
          Next
        </button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        action={modalAction}
        contractId={modalContractId}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />

      <ContractApprovalViewPopup
        isOpen={isViewPopupOpen}
        selectedRow={selectedInvoice as any}
        onClose={handlePopupClose}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <ContractEditModal
        isOpen={editPopupOpen}
        invoiceId={editingContractId}
        initialForm={editInitialForm}
        onSave={handleEditSaveFromPopup}
        onClose={() => {
          setEditPopupOpen(false);
          setEditingContractId(null);
          setEditLoadingState(false); 
        }}
        isLoading={editLoadingState}
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

      <ReminderConfirmationModal />

      {signedContractContractId && (() => {
        const foundContract = contracts.find(c => c.id === signedContractContractId);

        return (
          <SignedContractPopup
            entityType="contract"
            entityId={signedContractContractId}
            approver={foundContract?.approver || ''}
            onClose={() => setSignedContractContractId(null)}
            onUploadSuccess={(_fileName) => {
            }}
            userRole={roleId}
          />
        );
      })()}
    </div>
  );
};

export default ContractApproval;