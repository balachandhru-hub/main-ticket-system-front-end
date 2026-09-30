import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./QuickApproval.css";
import { IoMdEye } from "react-icons/io";
import { BiEdit } from "react-icons/bi";
import { FiFileText } from 'react-icons/fi';
import { FiX } from "react-icons/fi";
import { FiSearch } from "react-icons/fi";
import TicketStatsCard from "../components/TicketStatsCard";
import SignedContractPopup from './SignedContractPopup';
import ErrorModel from "../components/ErrorModel";
import QuickApprovalViewPopupForPR from "./QuickApprovalViewPopupForPR";
import {
  ApprovalDashBoard,
  getPendingApprovalsForPR,
  patchRequisitionForPR,
  triggerAribaNotificationForPR,
  getPendingApprovalsContractEditPr,
  downloadAribaApprovalsExcelPr,
} from "../api/AribaApi";
import type {
  PatchRequisitionRequest,
  StatusSummaryDto,
} from "../api/AribaApi";
import type { PendingApprovalPRDto } from "../Dto/PendingApprovalDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import { toast } from "react-toastify";
import { USER_ROLES, type UserRole } from "../common/common";
import { useAuth } from "./context/AuthContext";
import { syncLatestPendingApprovalsPR } from "../api/PRSyncApi";
import GLAccountsFilter from "./GLAccountsFilter";

// Interfaces remain unchanged
export interface Invoice {
  id: string;
  requisitionId: string;
  requesterName: string;
  approver: string;
  entity: string;
  contractId: string;
  supplier: string;
  prTaxAmount: string;
  prNetAmount: string;
  requisitionsDate: string;
  amount: string;
  department: string;
  glAccount?: string; 
  costCenter?: string;
  description: string;
  contractValue: string;
  needBYDate: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
  status: "approved" | "rejected" | "closed" | "pending" | null;
  currency?: string;
  aribaTaskId?: string;
  requisitionAmount?: number;
  approvalHistory: ApprovalHistoryDto[];
  dueDate: string;
  hasAttachment: boolean;
  attachmentId: string | null;
  fullUrl?: string;
}

export interface ApprovalHistoryDto {
  approvalDate: string | null;
  level: string;
  status: string;
  aribaUser: string;
}
export interface InvoiceEditDto {
  description: string;
  contractValue: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  action: "approve" | "deny" | null;
  invoiceId: string | null;
  onConfirm: (id: string, action: "approve" | "deny") => void;
  onCancel: () => void;
}
interface EditPRModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onConfirm: (id: string, data: InvoiceEditDto) => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  action,
  invoiceId,
  onConfirm,
  onCancel,
}) => {
  const [comment, setComment] = useState("");
  if (!isOpen || !action || !invoiceId) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm {action === "approve" ? "Approval" : "Rejection"}</h2>
        <p>Are you sure you want to {action} this requisition?</p>
        <div className="modal-comment-section">
          <label htmlFor="comment">Comment:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment here..."
            maxLength={50}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
        </div>
        <div className="modal-buttons">
          <button
            className={`modal-button ${
              action === "approve" ? "approve" : "reject"
            }`}
            onClick={() =>{ onConfirm(invoiceId, action);
              setComment("");
            }}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </button>
          <button className="modal-button cancel" onClick={()=>{onCancel();
            setComment("");
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
const EditPRModal: React.FC<EditPRModalProps> = ({
  isOpen,
  invoice,
  onConfirm,
  onCancel,
}) => {
  const [comment, setComment] = useState<InvoiceEditDto>({
    description: "",
    contractValue: "",
    valueAlreadyPaid: "",
    remainingBalance: "",
  });
  useEffect(() => {
    if (invoice) {
      setComment({
        description: invoice.description ?? "",
        contractValue: invoice.contractValue ?? "",
        valueAlreadyPaid: invoice.valueAlreadyPaid ?? "",
        remainingBalance: invoice.remainingBalance ?? "",
      });
    }
  }, [invoice]);
  if (!isOpen || !invoice) return null;

  return (
    <div className="edit-popup-overlay">
      <div className="edit-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-popup-header">
          <h2>Edit PR Details</h2>
          <button className="edit-popup-close-btn" onClick={onCancel}>
            <FiX size={22} />
          </button>
        </div>

        <div className="edit-popup-body">
          <div className="edit-field">
            <label>Description</label>
            <textarea
              rows={3}
              value={comment.description}
              onChange={(e) =>
                setComment((c) => ({ ...c, description: e.target.value }))
              }
            />
          </div>
          <div className="edit-field">
            <label>Contract Value</label>
            <input
              type="number"
              step="0.01"
              value={comment.contractValue}
              onChange={(e) =>
                setComment((c) => ({ ...c, contractValue: e.target.value }))
              }
            />
          </div>
          <div className="edit-field">
            <label>Value Already Paid</label>
            <input
              type="number"
              step="0.01"
              value={comment.valueAlreadyPaid}
              onChange={(e) =>
                setComment((c) => ({ ...c, valueAlreadyPaid: e.target.value }))
              }
            />
          </div>
          <div className="edit-field">
            <label>Remaining Balance</label>
            <input
              type="number"
              step="0.01"
              value={comment.remainingBalance}
              onChange={(e) =>
                setComment((c) => ({ ...c, remainingBalance: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="edit-popup-footer">
          <button
            className="edit-popup-btn save"
            onClick={() => onConfirm(invoice.requisitionId, comment)}
          >
            Save Changes
          </button>
          <button className="edit-popup-btn cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function isPendingApprovalArray(
  response: PendingApprovalPRDto[] | ErrorResponseDto,
): response is PendingApprovalPRDto[] {
  return Array.isArray(response);
}

const PRtable: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(""); // Just for input
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "approved" | "rejected" | "pending" | "closed"
  >("all");
  const { auth } = useAuth();
  const roleId = auth?.roleId;
  const isbusinesAdmin = roleId === USER_ROLES.BUSINESS_ADMIN_USER;
  const isBusinessUser = roleId === USER_ROLES.BUSINESS_USER;
  const isLeadershipUser = roleId === USER_ROLES.LEADERSHIP_USER;
  const isBusinessAdminOrLeadership = isbusinesAdmin || isLeadershipUser;
  const isOperationsUser = roleId === USER_ROLES.OPERATIONS_USER;
  const isFinanceOperationUser = roleId === USER_ROLES.FINANCE_OPERATION_USER;
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeCard, setActiveCard] = useState<string>("total");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({
    title: "",
    message: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "deny" | null>(
    null,
  );
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(100);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string | null>(null);
  const [modalInvoiceId, setModalInvoiceId] = useState<string | null>(null);
  const [isViewPopupOpen, setIsViewPopupOpen] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<UserRole | null>(null);
  const [selectedGLFilters, setSelectedGLFilters] = useState<string[]>([]);
  // const userRole: UserRole = USER_ROLES.LEADERSHIP_USER;
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceEdit, setSelectedInvoiceEdit] =
    useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<
    "PR-contract" | "approval-history"
  >("PR-contract");
  const [statusSummary, setStatusSummary] = useState<StatusSummaryDto>({
    pending: 0,
    approved: 0,
    deny: 0,
    total: 0,
    closed: 0,
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCooldown, setSyncCooldown] = useState(0);
  const [canSync, setCanSync] = useState(true);
  const limit = 8;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [signedContractPRId, setSignedContractPRId] = useState<string | null>(null);
const [isInitialLoad, setIsInitialLoad] = useState(true);

useEffect(() => {
    const loadData = async () => {
        if (isInitialLoad) {

            const hasSynced = sessionStorage.getItem("syncDashAutoSyncedPR");
            if (!hasSynced) {
                await runFirstTimeAutoSync();
                sessionStorage.setItem("syncDashAutoSyncedPR", "true");
            } else {
                await fetchPendingApprovals(currentPage);
            }
            setIsInitialLoad(false); 
        } else {
            await fetchPendingApprovals(currentPage);
        }
    };

    const handler = setTimeout(() => {
        loadData();
    }, isInitialLoad ? 200 : 0);

    return () => {
        clearTimeout(handler);
    };

}, [currentPage, fromDate, toDate, activeCard, statusFilter, selectedGLFilters]);


const runFirstTimeAutoSync = async () => {
  try {
    await syncLatestPendingApprovalsPR();

    await fetchPendingApprovals(1);

    toast.success("synced");
  } catch (err) {
    toast.error("Auto sync failed");
  }
};



// 2. Create a handler function for GL selection changes
const handleGLAccountsChange = (selectedCodes: string[]): void => {
  if (selectedCodes.length > 5) {
    toast('You can select a maximum of 5 GL accounts only.');
    setSelectedGLFilters(selectedCodes.slice(0, 5));
  } else {
    setSelectedGLFilters(selectedCodes);
  }
  setCurrentPage(1);
};
  const handleOptionSelect = (value: React.SetStateAction<number>) => {
    setSelectedOption(value);
    setIsDropdownOpen(false);
  };
const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
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
      // ADD THIS LINE - pass GL filters to download
      ...(selectedGLFilters.length > 0 && { glAccounts: selectedGLFilters.join(',') }),
    });

    cleanGLAccounts.forEach(glCode => params.append('glAccount', glCode));
    
    toast.info('Preparing your Excel download. This may take a moment...');

    const responseBlob = await downloadAribaApprovalsExcelPr(params.toString()); 
    
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
  const fetchPendingApprovals = async (page: number = 1) => {
    setLoading(true);
    try{
        const index = (page - 1) * limit; 
        
        let status =
            statusFilter !== "all"
                ? statusFilter
                : activeCard !== "total"
                ? activeCard
                : "";
        if (status === "approved") {
            status = "approve";
        } else if (status === "rejected") {
            status = "deny";
        }

      const formatDateToDateTime = (dateString: string) => {
            if (!dateString) return "";
            return `${dateString}T00:00:00`;
        };

      const cleanGLAccounts = selectedGLFilters.length > 0
      ? selectedGLFilters.map(id => id.split('-')[0])
      : undefined;

      const response = await getPendingApprovalsForPR(
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
          id: item.requisitionId || "N/A",
          requisitionId: item.requisitionsId || "N/A",
          approver: item.approver || "N/A",
          entity: item.companyUniqueName || "N/A",
          contractId: item.contractId || "N/A",
          supplier: item.supplierName || "N/A",
          fullUrl: item.fullUrl || "N/A",
          amount: `${item.amount.toFixed(2)} ${item.currency}` || "N/A",
          prTaxAmount: item.prTaxAmount?.toFixed(2) || "N/A",
          prNetAmount: item.prNetAmount?.toFixed(2) || "N/A",
          needBYDate:
            new Date(item.needBYDate).toLocaleDateString("en-GB") || "N/A",
          requisitionsDate:
            new Date(item.requisitionsDate).toLocaleDateString("en-GB") ||
            "N/A",
          requesterName: item.requesterName || "N/A",
          department: item.department || "N/A",
          paymentDueDate:
            new Date(item.dueDate).toLocaleDateString("en-GB") || "N/A",
          glAccount: item.glAccount || 'N/A',
          costCenter: item.costCenter || 'N/A',
          description: item.description || "N/A",
          contractValue:
            item.contractValue !== null && item.contractValue !== undefined
              ? `${Number(item.contractValue).toFixed(2)} ${
                  item.contractCurrency || item.currency
                }`
              : "N/A",
          valueAlreadyPaid:
            item.valueAlreadyPaid !== null &&
            item.valueAlreadyPaid !== undefined
              ? `${Number(item.valueAlreadyPaid).toFixed(2)} ${
                  item.contractCurrency || item.currency
                }`
              : "N/A",
          remainingBalance:
            item.remainingBalance !== null &&
            item.remainingBalance !== undefined
              ? `${Number(item.remainingBalance).toFixed(2)} ${
                  item.contractCurrency || item.currency
                }`
              : "N/A",
          status:
            item.status.toLowerCase() === "pending"
              ? "pending"
              : item.status.toLowerCase() === "approve" ||
                item.status.toLowerCase() === "approved"
              ? "approved"
              : item.status.toLowerCase() === "closed"
              ? "closed"
              : item.status.toLowerCase() === "reject" ||
                item.status.toLowerCase() === "rejected" ||
                item.status.toLowerCase() === "deny"
              ? "rejected"
              : null,
          currency: item.currency,
          aribaTaskId: item.aribaTaskId,
          requisitionAmount: item.amount,
          approvalHistory: item.approvalHistory || [],
          dueDate: item.dueDate,
          hasAttachment: item.hasAttachment || false,
          attachmentId: item.attachmentId || null,
        }));
        setInvoices(transformedInvoices);
      } else if (isErrorResponse(response)) {
        if (response.statusCode === 401) {
          setErrorPage(true);
          setErrorPageData({
            title: response.message || "Unauthorized",
            message:
              response.description ||
              "You are not authorized to perform this action.",
          });
          navigate("/");
        } else if (response.statusCode === 404) {
          toast.info("No pending approvals found");
          setInvoices([]);
        } else {
          toast.error(response.message || "Failed to fetch pending approvals");
          setInvoices([]);
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setErrorPage(true);
        setErrorPageData({
          title: "Unauthorized",
          message: "You are not authorized to perform this action.",
        });
      } else {
        toast.error("Failed to fetch pending approvals");
      }
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); 
    fetchPendingApprovals(1); 
  };

  // ── Open modal ──
  const handleSendReminder = (taskId: string) => {
    setReminderTaskId(taskId);
    setIsReminderModalOpen(true);
  };

  // ── Confirm ──
  const handleConfirmReminder = async () => {
    if (!reminderTaskId) return;

    // find invoice by requisitionId
    const invoice = invoices.find(
      (inv) => inv.requisitionId === reminderTaskId,
    );
    if (!invoice) {
      toast.error("Invoice not found for reminder.");
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
      return;
    }

    // try to pick approver from approvalHistory (pending approver)
    const pendingApprover = invoice.approver;

    if (!pendingApprover) {
      toast.error("Approver username not found for this invoice.");
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
      return;
    }

    try {
      // entityType for invoice is typically "invoice" (adjust if you need "PR" or "contract"
      const aribaId = invoice.requisitionId || reminderTaskId;
      const entityType = "PR";

      const resp = await triggerAribaNotificationForPR(
        entityType,
        aribaId,
        pendingApprover,
      );
      if ((resp as any).statusCode === 200) {
        toast.success("Reminder email triggered successfully.");
      } else {
        toast.error((resp as any).message || "Failed to trigger reminder.");
      }
    } catch (err: any) {
      toast.error("Failed to send reminder. Please try again.");
    } finally {
      setIsReminderModalOpen(false);
      setReminderTaskId(null);
    }
  };

  // ── Cancel ──
  const handleCancelReminder = () => {
    setIsReminderModalOpen(false);
    setReminderTaskId(null);
  };

  // ── Reminder Confirmation Modal (re-uses your existing styles) ──
  const ReminderConfirmationModal: React.FC = () => {
    if (!isReminderModalOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Send Reminder</h2>
          <p>Are you sure you want to send a reminder for this invoice?</p>
          <div className="modal-buttons">
            <button
              className="modal-button approve"
              onClick={handleConfirmReminder}
            >
              Send
            </button>
            <button
              className="modal-button cancel"
              onClick={handleCancelReminder}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isErrorResponse = (data: any): data is ErrorResponseDto => {
    return data && typeof data.statusCode === "number";
  };

  useEffect(() => {
    const loadStatus = async () => {
      const data = await ApprovalDashBoard("PR");
      if (isErrorResponse(data)) {
      } else {
        setStatusSummary(data);
      }
    };
    loadStatus();
  }, []);

  // ... (All other functions SAME - handleApprove, handleReject, etc.)

  const handleApprove = (id: string) => {
    setModalAction("approve");
    setModalInvoiceId(id);
    setIsModalOpen(true);
  };

  const handleReject = (id: string) => {
    setModalAction("deny");
    setModalInvoiceId(id);
    setIsModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    const invoice = invoices.find((inv) => inv.requisitionId === id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setIsViewPopupOpen(true);
    }
  };
  const handleEditModalOpen = (id: string) => {
    setIsEditModalOpen(true);
    const invoice = invoices.find((inv) => inv.requisitionId === id);
    if (invoice) {
      setSelectedInvoiceEdit(invoice);
      setIsViewPopupOpen(true);
    }
  };

  const handleEditModalConfirm = async (
    id: string,
    updatedData: InvoiceEditDto,
  ) => {
    const invoice = invoices.find((inv) => inv.requisitionId === id);
    if (!invoice) {
      setIsModalOpen(false);
      toast.error("Invalid invoice");
      return;
    }
    try {
      const response = await getPendingApprovalsContractEditPr(id, updatedData);
      if (response) {
        toast.success("Invoice updated successfully");
        await fetchPendingApprovals(currentPage);
      }
    } catch (error: any) {
      toast.error(`${error.message || "Unknown error"}`);
      await fetchPendingApprovals(currentPage);
    } finally {
      setIsEditModalOpen(false);
      setSelectedInvoiceEdit(null);
    }
  };

  const handleModalConfirm = async (id: string, action: "approve" | "deny") => {
    const invoice = invoices.find((inv) => inv.requisitionId === id);
    if (!invoice || !invoice.aribaTaskId || invoice.status !== "pending") {
      setIsModalOpen(false);
      toast.error("Invalid invoice or invoice is not pending");
      return;
    }

    const request: PatchRequisitionRequest = {
      state: action,
      comment: {
        text: `${
          action === "approve" ? "Approved" : "Rejected"
        } via QuickApproval`,
        visibleToSupplier: false,
      },
      approvedInvoiceAmount:
        action === "approve" ? invoice.requisitionAmount || 0 : 0,
    };

    try {
      const response = await patchRequisitionForPR(
        invoice.aribaTaskId,
        request,
      );
      if (response.statusCode === 200) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.requisitionId === id
              ? { ...inv, status: action as "approved" | "rejected" }
              : inv,
          ),
        );
        toast.success(
          `Invoice ${
            action === "approve" ? "approved" : "rejected"
          } successfully`,
        );
        await fetchPendingApprovals(currentPage);
      } else if (response.statusCode === 401) {
        setErrorPage(true);
        setErrorPageData({
          title: "Unauthorized",
          message: "You are not authorized to perform this action.",
        });
      } else if (response.statusCode === 404) {
        toast.error(
          "Invoice not found in Ariba. It may have been processed already.",
        );
        await fetchPendingApprovals(currentPage);
      } else {
        toast.error(response.message || `Failed to ${action} invoice`);
      }
    } catch (error: any) {
      toast.error(
        `Failed to ${action} invoice: ${error.message || "Unknown error"}`,
      );
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
  const handleEditModalCancel = () => {
    setIsEditModalOpen(false);
    setSelectedInvoiceEdit(null);
  };
  
useEffect(() => {
  const closeDropdown = () => setIsStatusOpen(false);
  document.addEventListener('click', closeDropdown);

  return () => document.removeEventListener('click', closeDropdown);
}, []);
const handleDownloadUser = () => {
  if (invoices.length === 0) {
    toast.info('No data to export');
    return;
  }
  
  // Define columns exactly as in the table
  const headers = [
    'ENTITY',
    ...(isbusinesAdmin ? ['APPROVER'] : []),
    'CONTRACT ID',
    'PR NO',
    'SUPPLIER',
    'VALUE (With Taxes)',
    'REQUESTER NAME',
    'DEPARTMENT',
    'GL ACCOUNT',
    'COST CENTER',
    'DESCRIPTION',
    'NEED BY DATE',
    'CONTRACT VALUE',
    'VALUE ALREADY PAID',
    'REMAINING BALANCE',
    ...(isbusinesAdmin || isLeadershipUser ? ['APPROVE/REJECT/ STATUS'] : []),
    ...(isBusinessUser || isOperationsUser || isFinanceOperationUser ? ['STATUS'] : []),
  ];

  const csvRows = [
    headers.join(','),
    ...invoices.map(inv => {
      const row = [
        inv.entity,
        ...(isbusinesAdmin ? [inv.approver || 'N/A'] : []),
        inv.contractId,
        inv.requisitionId,
        inv.supplier,
        inv.amount,
        inv.requesterName,
        inv.department,
        inv.glAccount,
        inv.costCenter,
        inv.description,
        inv.needBYDate,
        inv.contractValue,
        inv.valueAlreadyPaid,
        inv.remainingBalance,
        ...(isbusinesAdmin || isLeadershipUser
          ? [inv.status?.toUpperCase() ?? '']
          : []),
        ...(isBusinessUser || isOperationsUser || isFinanceOperationUser
          ? [inv.status?.toUpperCase() ?? '']
          : []),
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
  link.setAttribute('download', `PR_Approvals_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success('PR data downloaded (open in Excel)');
};

  const totalPages = Math.ceil(statusSummary.total / limit);
  const handleCardClick = (type: string) => {
    setActiveCard(type);
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleModalConfirmError = () => {
    setErrorPage(false);
    navigate("/");
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate("/");
  };

  const handlePopupClose = () => {
    setIsViewPopupOpen(false);
    setActiveTab("PR-contract");
  };

  useEffect(() => {
    // Assume this component is only for leadership users
    setResolvedRole(USER_ROLES.LEADERSHIP_USER);
  }, []);

  // const handleTabChange = (newTab: AdminTab) => {
  //   setActiveNavTab(newTab);
  // };
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

  if (!resolvedRole) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }


// Add the sync handler function (add with other handler functions)
const handleSync = async () => {
  if (!canSync) {
    toast.info(`Please wait ${syncCooldown} seconds before syncing again`);
    return;
  }

  setIsSyncing(true);

  try {
    // 1) HIT SYNC API
    const syncResponse = await syncLatestPendingApprovalsPR();


    if (!syncResponse || typeof syncResponse !== "object") {
      toast.error("Invalid response from sync API");
      return;
    }

    // 2) FETCH UPDATED DATA
    await fetchPendingApprovals(1); // always refresh page 1 after sync

    toast.success("Synced successfully");
  } catch (error) {
    toast.error("Error during sync");
  } finally {
    setIsSyncing(false);
  }
};


  return (
    <div className="quick-approval">
      {/* <AdminNavBar
  activeTab={activeNavTab}
  onTabChange={handleTabChange}
  userRole={userRole}
  expandedCompany={false}
/> */}
      <div className="quick-approvals-main">
        <div className="quick-approvals-content">
          <div className="quick-approval-header">
          <h1 className="title">Purchase Requisitions</h1>
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
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Filters</span>
            </div>

            <div className="filters-inputs">
              {/* *** NEW: SEARCH BUTTON INSIDE SEARCH BAR *** */}
              <div className="quick-search-input">
                <label>Search</label>
                <div className="quick-search-wrapper">
                  <input
                    type="text"
                    placeholder="Search by PR no or supplier name or ....."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleSearch();
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

          {/* *** REST OF JSX SAME AS BEFORE *** */}
          <div className="invoices-section">
            <div className="invoices-header">
              <h2>PR Details</h2>
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
              <div className="view-toggle">
                <button
                  className={viewMode === "table" ? "active" : ""}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="3"
                      y1="9"
                      x2="21"
                      y2="9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="3"
                      y1="15"
                      x2="21"
                      y2="15"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                <button
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <rect
                      x="14"
                      y="3"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <rect
                      x="3"
                      y="14"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <rect
                      x="14"
                      y="14"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </div>
            </div>
            </div>

            {loading ? (
              <div className="loading-state">Loading pending approvals...</div>
            ) : invoices.length === 0 ? (
              <div className="empty-state">No PR found</div>
            ) : viewMode === "table" ? (
              <div className="table-container">
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>ENTITY</th>
                      {isbusinesAdmin && <th>APPROVER</th>}
                      <th>CONTRACT ID</th>
                      <th>PR NO</th>
                      <th>SUPPLIER</th>
                      <th>VALUE (With Taxes)</th>
                      <th>REQUESTER NAME</th>
                      <th>DEPARTMENT</th>
                      <th >GL ACCOUNT</th>
                      <th >COST CENTER</th>
                      <th className="description-width">DESCRIPTION</th>
                      <th>NEED BY DATE</th>
                      <th>CONTRACT VALUE</th>
                      <th>VALUE ALREADY PAID</th>
                      <th>REMAINING BALANCE</th>
                      {isbusinesAdmin && <th>EDIT</th>}
                      <th>VIEW</th>
                      {(isLeadershipUser || isOperationsUser || isFinanceOperationUser) && <th>SIGNED CONTRACT</th>}
                      {(isbusinesAdmin || isLeadershipUser) && (
                        <th>APPROVE/REJECT/ STATUS</th>
                      )}
                      {isBusinessUser || isOperationsUser || isFinanceOperationUser && <td>STATUS</td>}
                      <th>FULL URL</th>
                      {isBusinessUser || isOperationsUser || isFinanceOperationUser && <th>REMINDER</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.entity}</td>
                        {isbusinesAdmin && <td>{invoice.approver}</td>}
                        <td>{invoice.contractId}</td>
                        <td>{invoice.requisitionId}</td>
                        <td>{invoice.supplier}</td>
                        <td>{invoice.amount}</td>
                        <td>{invoice.requesterName}</td>
                        <td>{invoice.department}</td>
                        <td>{invoice?.glAccount}</td>
                        <td>{invoice?.costCenter}</td>
                        <td className="description-width">
                          {invoice.description}
                        </td>
                        <td>{invoice.needBYDate}</td>
                        <td>{invoice.contractValue}</td>
                        <td>{invoice.valueAlreadyPaid}</td>
                        <td>{invoice.remainingBalance}</td>
                        {isbusinesAdmin && (
                          <td>
                            <button
                              onClick={() =>
                                handleEditModalOpen(invoice.requisitionId)
                              }
                              className="icon-button view-button"
                            >
                              <BiEdit size={18} />
                            </button>
                          </td>
                        )}
                        <td>
                          <button
                            className="icon-button view-button"
                            onClick={() =>
                              handleViewDetails(invoice.requisitionId)
                            }
                          >
                            <IoMdEye size={18} />
                          </button>
                        </td>
                        {(isLeadershipUser || isOperationsUser || isFinanceOperationUser) && (
                          <td>
                            <button
                              className="icon-button"
                              onClick={() => setSignedContractPRId(invoice.requisitionId)}
                              title="Signed PR"
                            >
                              <FiFileText size={18} style={{ color: '#28a745' }} />
                            </button>
                          </td>
                        )}
                        {(isbusinesAdmin || isLeadershipUser) && (
                          <td>
                            {invoice.status === "approved" && (
                              <span className="status-badge approved">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M20 6L9 17l-5-5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Approved
                              </span>
                            )}
                            {invoice.status === "rejected" && (
                              <span className="status-badge rejected">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <line
                                    x1="18"
                                    y1="6"
                                    x2="6"
                                    y2="18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                  <line
                                    x1="6"
                                    y1="6"
                                    x2="18"
                                    y2="18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                Rejected
                              </span>
                            )}
                            {invoice.status === "closed" && (
                              <span className="status-badge closed">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <line
                                    x1="18"
                                    y1="6"
                                    x2="6"
                                    y2="18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                  <line
                                    x1="6"
                                    y1="6"
                                    x2="18"
                                    y2="18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                Closed
                              </span>
                            )}
                            {invoice.status === "pending" && (
                              <div className="action-buttons">
                                <button
                                  className="icon-button approve-button"
                                  onClick={() =>
                                    handleApprove(invoice.requisitionId)
                                  }
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                  >
                                    <path
                                      d="M20 6L9 17l-5-5"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                <button
                                  className="icon-button reject-button"
                                  onClick={() =>
                                    handleReject(invoice.requisitionId)
                                  }
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                  >
                                    <line
                                      x1="18"
                                      y1="6"
                                      x2="6"
                                      y2="18"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                    <line
                                      x1="6"
                                      y1="6"
                                      x2="18"
                                      y2="18"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                        {isBusinessUser || isOperationsUser || isFinanceOperationUser && (
                          <td className="status-only-column">
                            {invoice.status === "approved" && (
                              <span className="status-badge approved">
                                Approved
                              </span>
                            )}
                            {invoice.status === "rejected" && (
                              <span className="status-badge rejected">
                                Rejected
                              </span>
                            )}
                            {invoice.status === "closed" && (
                              <span className="status-badge closed">
                                Closed
                              </span>
                            )}
                            {invoice.status === "pending" && (
                              <span className="status-badge pending">
                                Pending
                              </span>
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
                            "—"
                          )}
                        </td>
                        {isBusinessUser || isOperationsUser || isFinanceOperationUser && (
                          <td>
                            {invoice.status === "pending" &&
                            invoice.requisitionId ? (
                              <button
                                className="reminder-btn"
                                onClick={() =>
                                  handleSendReminder(invoice.requisitionId!)
                                }
                              >
                                Send Reminder
                              </button>
                            ) : (
                              "—"
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
                        <span className="grid-label">Contract ID:</span>
                        <span className="grid-value">{invoice.contractId}</span>
                      </div>
                      <div className="grid-row">
                        <span className="grid-label">PR No:</span>
                        <span className="grid-value">
                          {invoice.requisitionId}
                        </span>
                      </div>

                      <div className="grid-row">
                        <span className="grid-label">Department:</span>
                        <span className="grid-value">{invoice.department}</span>
                      </div>
                      <div className="grid-row">
                        <span className="grid-label">Need BY:</span>
                        <span className="grid-value">{invoice.contractId}</span>
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
                        <span className="grid-value">
                          {invoice.description}
                        </span>
                      </div>
                      <div className="grid-row">
                        <span className="grid-label">Contract Value:</span>
                        <span className="grid-value">
                          {invoice.contractValue}
                        </span>
                      </div>
                      <div className="grid-row">
                        <span className="grid-label">Paid:</span>
                        <span className="grid-value">
                          {invoice.valueAlreadyPaid}
                        </span>
                      </div>
                      <div className="grid-row">
                        <span className="grid-label">Balance:</span>
                        <span className="grid-value">
                          {invoice.remainingBalance}
                        </span>
                      </div>
                      <div className="grid-row">
                        <span className="grid-label">Ariba URL:</span>
                        <span className="grid-value">
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
                            "—"
                          )}
                        </span>
                      </div>
                      {isBusinessUser || isOperationsUser || isFinanceOperationUser && (
                        <div className="grid-row">
                          <span className="grid-label">Reminder:</span>
                          <span className="grid-value">
                            {invoice.status === "pending" &&
                            invoice.requisitionId ? (
                              <button
                                className="reminder-btn small"
                                onClick={() =>
                                  handleSendReminder(invoice.requisitionId!)
                                }
                              >
                                Send Reminder
                              </button>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid-card-footer">
                      <div className="grid-actions">
                        {isbusinesAdmin && (
                          <button
                            className="icon-button edit"
                            onClick={() => handleEditModalOpen(invoice.requisitionId)}
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
                        )}
                        <button
                          className="icon-button view-button"
                          onClick={() =>
                            handleViewDetails(invoice.requisitionId)
                          }
                        >
                          <IoMdEye size={18} />
                        </button>
                        {(isLeadershipUser || isOperationsUser || isFinanceOperationUser) && (
                          <button
                            className="icon-button"
                            onClick={() => setSignedContractPRId(invoice.requisitionId)}
                            title="Signed PR"
                          >
                            <FiFileText size={18} style={{ color: '#28a745' }} />
                          </button>
                        )}
                      </div>
                      {invoice.status === "approved" && (
                        <span className="status-badge approved">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Approved
                        </span>
                      )}
                      {invoice.status === "rejected" && (
                        <span className="status-badge rejected">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <line
                              x1="18"
                              y1="6"
                              x2="6"
                              y2="18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <line
                              x1="6"
                              y1="6"
                              x2="18"
                              y2="18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          Rejected
                        </span>
                      )}
                      {invoice.status === "closed" && (
                        <span className="status-badge closed">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <line
                              x1="18"
                              y1="6"
                              x2="6"
                              y2="18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <line
                              x1="6"
                              y1="6"
                              x2="18"
                              y2="18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          Closed
                        </span>
                      )}
                      {invoice.status === "pending" && (
                        <div className="action-buttons">
                          <button
                            className="icon-button approve-button"
                            onClick={() => handleApprove(invoice.requisitionId)}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M20 6L9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="icon-button reject-button"
                            onClick={() => handleReject(invoice.id)}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <line
                                x1="18"
                                y1="6"
                                x2="6"
                                y2="18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <line
                                x1="6"
                                y1="6"
                                x2="18"
                                y2="18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className="pagination-button next"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= totalPages || invoices.length < limit}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        action={modalAction}
        invoiceId={modalInvoiceId}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />

      <QuickApprovalViewPopupForPR
        isOpen={isViewPopupOpen}
        selectedRow={selectedInvoice}
        onClose={handlePopupClose}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <EditPRModal
        isOpen={isEditModalOpen}
        invoice={selectedInvoiceEdit}
        onConfirm={handleEditModalConfirm}
        onCancel={handleEditModalCancel}
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

     {signedContractPRId && (() => {
  const foundPR = invoices.find(i => i.requisitionId === signedContractPRId);
  
  return (
    <SignedContractPopup
      entityType="pr"
      entityId={signedContractPRId}
      approver={foundPR?.approver || ''}
      onClose={() => setSignedContractPRId(null)}
      onUploadSuccess={(_fileName) => {
      }}
      userRole={roleId}
    />
  );
})()}
    </div>
  );
};

export default PRtable;
