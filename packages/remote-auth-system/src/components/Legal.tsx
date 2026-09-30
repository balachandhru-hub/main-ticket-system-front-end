import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useManualBlocker } from '../hooks/useManualBlocker';
import { getTodayDate, getResetFormState } from '../common/common';
import { FaEdit, FaTrash, FaChevronDown, FaTimes, FaUpload, FaPaperclip, FaSave } from 'react-icons/fa';
import PrSummary from './PrSummary';
import PrEdit from './PrEdit';
import PrDraft from './PrDraft';
import './PrEntertainment.css';
import { toast, type TypeOptions } from 'react-toastify';
type ToastType = TypeOptions;
import {
  createLegalPR,
  fetchSuppliers,
  getLegalVenue,
  getLegalVenueDetails,
  getPRSmartDefaults,
  createMaterialPRDraft,
  uploadExcelDraftMaterialPR,
  getAllPRMaterialPR,
  getAllDraftMaterialPR,
  legalMaterialData,
  getLegalMaterialDetails
} from '../api/prEntertainmentApi';
import type { LineItemDto, CreateMaterialPRPayload, AssetDto } from '../api/prEntertainmentApi';
import BackButton from "./BackButton";
import { getCurrencies } from '../api/getCurrencies';

declare global {
  interface Window {
    hasUnsavedChanges?: boolean;
    savePRDraft?: () => Promise<void>;
  }
}

interface LegalProps {
  onBack?: () => void; onClose?: () => void; userId?: string;
  exitConfirmed?: boolean; onResetExitFlag?: () => void;
  onViewModeChange?: (viewMode: 'form' | 'summary' | 'edit' | 'draft') => void;
}

const extractCode = (value: string | undefined | null) => { if (!value) return ''; return value.split(' ')[0] || value; };
const extractVendorCode = (value: string | undefined | null) => { if (!value) return ''; const parts = value.split(' - '); if (parts.length >= 3) return parts[2].trim(); if (parts.length === 2) return parts[0].trim(); return value; };
const extractVendorCodes = (value: string | undefined | null) => { if (!value) return ''; const parts = value.split(' - '); if (parts.length >= 3) return parts[2].trim(); if (parts.length === 2) return parts[1].trim(); return value; };
const convertFileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => { const result = reader.result as string; resolve(result.split(',')[1] || result); }; reader.onerror = error => reject(error); });
const truncateFileName = (name: string, maxLength: number = 20) => { if (name.length <= maxLength) return name; const extension = name.split('.').pop(); const nameWithoutExt = name.substring(0, name.lastIndexOf('.')); const truncatedName = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0)); return `${truncatedName}...${extension}`; };
const formatDateForInput = (dateString: string | Date | undefined | null) => { if (!dateString) return ''; try { const date = new Date(dateString); if (isNaN(date.getTime())) return ''; const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { return ''; } };

interface Supplier { supplierId: string; supplierName: string; }
interface LineItem {
  id?: number; venue: string; supplier: string; description: string; amount: string; title?: string;
  contract?: string | null; glAccount?: string; uom?: string; quantity?: string;
  purchaseOrg?: string; costCenter?: string; needBy?: string; currency?: string;
  autoGRN?: boolean; autoInvoice?: boolean; materialcode?: string; unitPrice?: string;
  purchaseGroup?: string; deliveryTo?: string; taxCode?: string; companyCode?: string;
  shipToPlant?: string; billTo?: string; deliveryDate?: string; comments?: string;
  invoiceId?: string; invoiceDate?: string; invoiceComments?: string; vendorId?: string;
  taxInclude?: boolean; invoiceAttachments?: File[]; lineItemNumber?: number; ocrProceed?: boolean;
}

interface SearchableSelectProps {
  id: string; name: string; value: string; onChange: (value: string) => void;
  options: string[]; placeholder: string; label: string; loading?: boolean;
  onSearch?: (search: string) => void; onLoadMore?: () => void; hasMore?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ id, value, onChange, options, placeholder, label, loading = false, onSearch, onLoadMore, hasMore = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const filteredOptions = onSearch ? options : options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsOpen(false); setSearchTerm(''); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
  useEffect(() => { if (onSearch) { const debounce = setTimeout(() => { onSearch(searchTerm); }, 300); return () => clearTimeout(debounce); } }, [searchTerm, onSearch]);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => { const element = e.currentTarget; const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight; if (distanceFromBottom <= 100 && hasMore && !loading && onLoadMore) onLoadMore(); };
  const handleSelect = (option: string) => { onChange(option); setIsOpen(false); setSearchTerm(''); };

  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label} *</label>}
      <div className="searchable-select" ref={dropdownRef}>
        <div className="select-display" onClick={() => setIsOpen(!isOpen)}>
          <span className={value ? 'select-value' : 'select-placeholder'}>{value || placeholder}</span>
          <FaChevronDown className={`select-arrow ${isOpen ? 'open' : ''}`} />
        </div>
        {isOpen && (
          <div className="select-dropdown">
            <div className="select-search">
              <input type="text" className="search-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
            </div>
            <div className="select-options" ref={optionsRef} onScroll={handleScroll}>
              {loading && filteredOptions.length === 0 ? (
                <div className="select-option no-results">Loading...</div>
              ) : filteredOptions.length > 0 ? (
                <>{filteredOptions.map(option => (<div key={option} className={`select-option ${value === option ? 'selected' : ''}`} onClick={() => handleSelect(option)}>{option}</div>))}{loading && <div className="select-option no-results">Loading more...</div>}</>
              ) : <div className="select-option no-results">No results found</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PrEditWrapper = ({ onBack, onUpdateSuccess, onUpdate }: any) => {
  const location = useLocation();
  const prData = location.state?.prData ?? null;
  return <PrEdit data={prData} onBack={onBack} onUpdateSuccess={onUpdateSuccess} onUpdate={onUpdate} isService={false} />;
};

const Legal: React.FC<LegalProps> = ({ userId, exitConfirmed = false, onResetExitFlag, onViewModeChange, onBack }) => {
  const date = new Date(); date.setDate(date.getDate() + 7);
  const showToast = (message: React.ReactNode, type: ToastType, duration: number = 3000) => { toast(message, { type, autoClose: duration }); };

  const [formData, setFormData] = useState({
    venue: '', supplier: '', description: '', amount: '', title: '', costCenter: '', companyCode: '',
    shipToPlant: '', billTo: '', purchaseOrg: '', purchaseGroup: '',
    currency: 'AED', deliveryTo: '', materialcode: '',
    taxCode: '', needBy: getTodayDate(), contract: null as string | null, glAccount: '',
    uom: '', autoInvoice: false, quantity: '1',
    autoGRN: true, comments: '', invoiceId: '', invoiceDate: '', invoiceComments: '',
    vendorId: '', taxInclude: false,
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [invoiceAttachments, setInvoiceAttachments] = useState<File[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const isDraftEnabled = lineItems.length > 0 || Object.values({ venue: formData.venue, supplier: formData.supplier, amount: formData.amount, description: formData.description }).some(v => v !== "" && v !== null && v !== undefined);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedLineItemId, setSelectedLineItemId] = useState<number | null>(null);
  const [selectAllChecked, setSelectAllChecked] = useState<boolean>(false);
  const [nextId, setNextId] = useState(1);
  const [ocrProceed, setOcrProceed] = useState<boolean>(false);
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);
  const [vendorsList, setVendorsList] = useState<Supplier[]>([]);
  const [hasMoreVendors, setHasMoreVendors] = useState<boolean>(true);
  const [pendingSwitchId, setPendingSwitchId] = useState<number | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [venueLoading, setVenueLoading] = useState<boolean>(false);
  const [venuesList, setVenuesList] = useState<string[]>([]);
  const [hasMoreVenues, setHasMoreVenues] = useState<boolean>(true);
  const [pendingAction, setPendingAction] = useState<{ type: 'path', value: string } | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const isDirty = !isProceeding && (lineItems.length > 0 || isDraftEnabled);

  // Sync with global window flag for AdminNavBar and system prompt
  useEffect(() => {
    window.hasUnsavedChanges = isDirty;
    return () => {
      window.hasUnsavedChanges = false;
    };
  }, [isDirty]);

  // Automatically fill title from the first line item if empty and not editing
  useEffect(() => {
    if (!formData.title && lineItems.length > 0 && editingId === null) {
      const firstTitle = lineItems[0].title;
      if (firstTitle) {
        setFormData(prev => ({ ...prev, title: firstTitle }));
      }
    }
  }, [lineItems, editingId, formData.title]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const validateFileSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };


  useManualBlocker({
    when: isDirty,
    onBlock: (target) => {
      if (target) setPendingAction({ type: 'path', value: target });
      setShowExitModal(true);
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleManualProceed = useCallback(() => {
    setIsProceeding(true);
    setShowExitModal(false);
    setTimeout(() => {
      if (pendingAction) {
        if (pendingAction.type === 'path') {
          navigate(pendingAction.value);
        }
        setPendingAction(null);
      } else if (onBack) {
        onBack();
      } else {
        navigate('..');
      }
    }, 0);
  }, [pendingAction, navigate, onBack]);

  const handleManualNavigate = useCallback((to: string) => {
    if (isDirty) {
      setPendingAction({ type: 'path', value: to });
      setShowExitModal(true);
    } else {
      navigate(to);
    }
  }, [isDirty, navigate]);


  const currentViewMode = (() => { const path = location.pathname; if (path.endsWith('/summary')) return 'summary'; if (path.endsWith('/edit')) return 'edit'; if (path.endsWith('/draft')) return 'draft'; return 'form'; })();
  const [currentVendorIndex, setCurrentVendorIndex] = useState<number>(0);
  const [vendorSearch, setVendorSearch] = useState<string>('');
  const [currentVenueIndex, setCurrentVenueIndex] = useState<number>(0);
  const [venueSearch, setVenueSearch] = useState<string>('');
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [editingValidationIds, setEditingValidationIds] = useState<number[]>([]);
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<number[]>([]);
  const [lineItemsSnapshot, setLineItemsSnapshot] = useState<LineItem[]>([]);
  const [targetPrNumber, setTargetPrNumber] = useState<string | null>(null);
  const [invoicePdfMapping, setInvoicePdfMapping] = useState<{ [lineItemNumber: number]: File[] }>({});
  const [submitReqDisable, setSubmitReqDisable] = useState<boolean>(false);
  const [isCopyMode, setIsCopyMode] = useState<boolean>(false);
  const [invoiceIdError, setInvoiceIdError] = useState<string>('');
  const [originalCopyData, setOriginalCopyData] = useState<any>(null);
  const [isDraft, setIsDraft] = useState<boolean>(false);
  const [isDraftCopyMode, setIsDraftCopyMode] = useState<boolean>(false);
  const lastSearchedSupplierRef = useRef<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [currenciesList, setCurrenciesList] = useState<string[]>([]);
  const [materialsList, setMaterialsList] = useState<{ materialCode: string; description: string }[]>([]);
  const [materialLoading, setMaterialLoading] = useState<boolean>(false);
  const [hasMoreMaterials, setHasMoreMaterials] = useState<boolean>(true);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState<number>(0);
  const [materialSearch, setMaterialSearch] = useState<string>('');

  React.useEffect(() => {
    if (selectedLineItemId !== null && editingId === null) {
      const selectedItem = lineItems.find(item => item.id === selectedLineItemId);
      if (selectedItem) {
        setFormData(prev => ({ ...prev, title: prev.title, venue: selectedItem.venue || '', supplier: selectedItem.supplier || '', description: selectedItem.description || '', amount: selectedItem.amount || '', contract: selectedItem.contract || null, glAccount: selectedItem.glAccount || '', uom: selectedItem.uom || '', quantity: selectedItem.quantity || '1', purchaseOrg: selectedItem.purchaseOrg || '', costCenter: selectedItem.costCenter || '', needBy: selectedItem.needBy || getTodayDate(), currency: selectedItem.currency || '', autoGRN: selectedItem.autoGRN !== undefined ? selectedItem.autoGRN : true, autoInvoice: selectedItem.autoInvoice !== undefined ? selectedItem.autoInvoice : false, materialcode: selectedItem.materialcode || '', purchaseGroup: selectedItem.purchaseGroup || '', deliveryTo: selectedItem.deliveryTo || '', taxCode: selectedItem.taxCode || '', companyCode: selectedItem.companyCode || '', shipToPlant: selectedItem.shipToPlant || '', billTo: selectedItem.billTo || '', comments: selectedItem.comments || '', invoiceId: selectedItem.invoiceId || '', invoiceDate: selectedItem.invoiceDate || '', invoiceComments: selectedItem.invoiceComments || '', vendorId: selectedItem.vendorId || '', taxInclude: selectedItem.taxInclude || false, }));
        if (selectedItem.invoiceAttachments) setInvoiceAttachments(selectedItem.invoiceAttachments);
      }
    }
  }, [selectedLineItemId, editingId, lineItems]);

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsUploadingExcel(true);
    try {
      const response = await uploadExcelDraftMaterialPR(file);
      if (response && (response as any).statusCode && (response as any).statusCode !== 200 && (response as any).statusCode !== 201) { showToast('Failed to upload Excel: ' + ((response as any).message || 'Unknown error'), 'error'); if (excelInputRef.current) excelInputRef.current.value = ''; return; }
      const res = response as any; const successCount = res.successfulUploads ?? 0; const failedCount = res.failedUploads ?? 0; const totalRows = res.totalRows ?? (successCount + failedCount);
      if (successCount > 0) { showToast(`Excel uploaded: ${successCount} successful, ${failedCount} failed (total ${totalRows}).`, 'success', 4000); navigate('draft'); } else { showToast('Upload finished with no successful rows: ' + (res?.message || 'No successful uploads'), 'error', 6000); }
    } catch (err) { showToast('An error occurred while uploading the Excel file.', 'error'); } finally { setIsUploadingExcel(false); if (excelInputRef.current) excelInputRef.current.value = ''; }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if ((name === 'needBy' || name === 'invoiceDate') && value) { const selectedDate = new Date(value); if (selectedDate.getFullYear() < 2000) { showToast('Date cannot be before year 2000', 'error'); return; } }
    if (name === 'amount') { const numericValue = value.replace(/[^0-9.]/g, ''); const parts = numericValue.split('.'); const sanitizedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue; const amountValue = parseFloat(sanitizedValue); if (sanitizedValue && !isNaN(amountValue) && amountValue < 0) { showToast('Amount cannot be negative', 'error'); return; } setFormData(prev => ({ ...prev, [name]: sanitizedValue })); return; }

    // Invoice ID validation: allow typing but show error when length > 16
    if (name === 'invoiceId') {
      // enforce hard limit of 16 characters; if user pastes/enters more, truncate and show error
      if (value && value.length > 16) {
        const trimmed = value.slice(0, 16);
        setFormData(prev => ({ ...prev, [name]: trimmed }));
        setInvoiceIdError('Invoice ID must be at most 16 characters');
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (value && value.length === 16) {
          setInvoiceIdError('Maximum length reached (16 characters)');
        } else {
          setInvoiceIdError('');
        }
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = async (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'venue') {
      try {
        const response = await getLegalVenueDetails({ search: value });
        if (response && response.suppliers) {
          const v = response.suppliers;
          setFormData(prev => ({
            ...prev,
            purchaseOrg: v.purchaseOrg || prev.purchaseOrg,
            purchaseGroup: v.purchaseGroup || prev.purchaseGroup,
            glAccount: v.glAccount || prev.glAccount,
            costCenter: v.costCenter || prev.costCenter,
            companyCode: v.companyCode || prev.companyCode,
            shipToPlant: v.shipToPlant || prev.shipToPlant,
            billTo: v.billTo || prev.billTo,
            materialcode: v.materialCode || prev.materialcode,
            taxCode: v.taxCode || prev.taxCode,
            deliveryTo: v.deliverTo || v.deliveryTo || prev.deliveryTo,
            uom: v.uom || v.UOM || prev.uom
          }));
        }
      }
      catch (error: any) {
        if (error?.status === 401)
          return;
      }
    }
  };

  const handleAutoInvoiceToggle = () => { setFormData(prev => { if (!prev.autoInvoice && !prev.autoGRN) { showToast('Auto GRN must be active to enable Auto Invoice', 'warning'); return prev; } return { ...prev, autoInvoice: !prev.autoInvoice }; }); };
  const handleAutoGRNToggle = () => { setFormData(prev => { const newAutoGRN = !prev.autoGRN; if (!newAutoGRN && prev.autoInvoice) { showToast('Auto Invoice has been disabled because Auto GRN was deactivated', 'info'); return { ...prev, autoGRN: newAutoGRN, autoInvoice: false }; } return { ...prev, autoGRN: newAutoGRN }; }); };
  const handleAddTaxToggle = () => { setFormData(prev => ({ ...prev, taxInclude: !prev.taxInclude })); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);


      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      newFiles.forEach(file => {
        if (validateFileSize(file)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        }
      });

      if (invalidFiles.length > 0) {
        showToast(
          `The following file(s) exceed 10MB limit:\n${invalidFiles.join('\n')}`,
          'error',
          5000
        );
      }

      if (validFiles.length > 0) {
        setAttachments(prev => [...prev, ...validFiles]);
      }

      e.target.value = '';
    }
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (!formData.invoiceId || !formData.invoiceDate) {
        showToast('First fill the invoice date and invoice id', 'warning');
        e.target.value = '';
        return;
      }

      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.jpe', '.jfif', '.gif', '.tiff'];
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/jpe', 'image/jfif', 'image/gif', 'image/tiff'];

      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      const invalidExtFiles: string[] = [];

      selectedFiles.forEach(file => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        const isValidExt = allowedExtensions.includes(ext) || allowedTypes.includes(file.type);

        if (!isValidExt) {
          invalidExtFiles.push(file.name);
        } else if (!validateFileSize(file)) {
          invalidFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        } else {
          validFiles.push(file);
        }
      });

      if (invalidExtFiles.length > 0) {
        showToast(
          `Only PDF, PNG, JPG, and JPEG files are allowed for invoice attachments.`,
          'warning'
        );
      }

      if (invalidFiles.length > 0) {
        showToast(
          `The following file(s) exceed 10MB limit:\n${invalidFiles.join('\n')}`,
          'error',
          5000
        );
      }

      if (validFiles.length > 0) {
        setInvoiceAttachments(prev => [...prev, ...validFiles]);
      }

      e.target.value = '';
    }
  };


  const handleViewFile = (file: File) => { if (file) { const fileURL = URL.createObjectURL(file); window.open(fileURL, '_blank'); } };
  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };
  const removeInvoiceAttachment = (index: number) => { setInvoiceAttachments(prev => prev.filter((_, i) => i !== index)); };


  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (value && !validateComment(value)) {
      showToast('Special characters are not allowed in comments', 'error');
      return;
    }
    setFormData(prev => ({ ...prev, comments: value }));
  };

  const handleInvoiceCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (value && !validateComment(value)) {
      showToast('Special characters are not allowed in invoice comments', 'error');
      return;
    }
    setFormData(prev => ({ ...prev, invoiceComments: value }));
  };
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => { const isChecked = e.target.checked; setSelectAllChecked(isChecked); if (isChecked) setSelectedLineItemIds((lineItems || []).map(item => item.id || 0)); else setSelectedLineItemIds([]); };
  const handleAddOrDuplicateLineItems = () => {
    if (selectedLineItemIds.length > 0) {
      const itemsToDuplicate = lineItems.filter(item => item.id !== undefined && selectedLineItemIds.includes(item.id));
      const duplicatedItems: LineItem[] = itemsToDuplicate.map((item, index) => ({
        ...item,
        id: nextId + index,
        invoiceAttachments: item.invoiceAttachments ? [...item.invoiceAttachments] : []
      }));

      setLineItems(prev => [...prev, ...duplicatedItems]);
      setNextId(prev => prev + duplicatedItems.length);
      setSelectedLineItemIds([]);
      setSelectAllChecked(false);
      showToast(`${duplicatedItems.length} line item(s) duplicated successfully!`, 'success');
    } else {
      setEditingId(null);
      setSelectedLineItemId(null);
      setFormData({ venue: '', supplier: '', description: '', amount: '', costCenter: '', companyCode: '', shipToPlant: '', billTo: '', title: '', purchaseOrg: '', purchaseGroup: '', currency: 'AED', deliveryTo: '', materialcode: '', contract: null, glAccount: '', uom: '', autoInvoice: false, needBy: getTodayDate(), quantity: '1', autoGRN: true, comments: '', invoiceId: '', invoiceDate: '', invoiceComments: '', vendorId: '', taxCode: '', taxInclude: false, });
      setInvoiceAttachments([]);
    }
  };
  const validateComment = (text: string): boolean => {
    const specialCharPattern = /[!@#$%^&*()_+=\[\]{};':"\\|,.<>?/]/g;
    return !specialCharPattern.test(text);
  };
  const handleAddLineItem = () => {
    if (!formData.venue || !formData.supplier || !formData.amount || !formData.title || !formData.needBy) {
      showToast('Please fill in all required fields including Need By Date', 'warning');
      return;
    }
    const amountValue = parseFloat(formData.amount);
    if (!formData.amount || formData.amount.trim() === '' || isNaN(amountValue) || amountValue <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
    if (formData.autoInvoice) {
      const missingFields = []; if (!formData.invoiceId) missingFields.push('Invoice ID'); if (!formData.invoiceDate) missingFields.push('Invoice Date'); if (invoiceAttachments.length === 0) missingFields.push('Invoice Attachment');
      if (missingFields.length > 0) { showToast(`Please fill in: ${missingFields.join(', ')}`, 'warning'); return; }
      if (ocrProceed) { const existingInvoiceIds = new Set(lineItems.filter(item => item.autoInvoice && item.invoiceId).map(item => item.invoiceId)); const isSingleLineItemUpdate = lineItems.length === 1 && editingId === lineItems[0].id && !lineItems[0].invoiceId; if (!isSingleLineItemUpdate && existingInvoiceIds.size > 0 && !existingInvoiceIds.has(formData.invoiceId)) { showToast("We can't add line items with different Invoice IDs when Header Invoice is checked", 'warning'); return; } }
      const hasOtherOcrProceedTrue = lineItems.some(item => item.id !== editingId && item.ocrProceed === true); if (hasOtherOcrProceedTrue && !ocrProceed) { showToast("Applicable for all line items must be enabled because another line item already has it enabled", 'warning'); return; }
      if (ocrProceed && lineItems.length > 0) { const hasOcrProceedFalse = lineItems.some(item => item.autoInvoice && (item.ocrProceed === false || item.ocrProceed === undefined)); const isSingleLineItemUpdate = lineItems.length === 1 && editingId === lineItems[0].id; if (hasOcrProceedFalse && !isSingleLineItemUpdate) { showToast("Cannot enable Header Invoice because other line items have it disabled", 'warning'); return; } }
    }
    if (editingId !== null) {
      setLineItems(prev => prev.map(item => item.id === editingId ? { ...formData, id: editingId, invoiceAttachments: [...invoiceAttachments], ocrProceed } : item));
      setEditingId(null); showToast('Line item updated successfully!', 'success');
    } else {
      const newItem: LineItem = {
        id: nextId, title: formData.title || lineItems[0]?.title || '', venue: formData.venue, supplier: formData.supplier,
        description: formData.description, amount: formData.amount,
        contract: formData.contract, glAccount: formData.glAccount,
        uom: formData.uom, quantity: formData.quantity,
        purchaseOrg: formData.purchaseOrg, costCenter: formData.costCenter,
        needBy: formData.needBy, currency: formData.currency,
        autoGRN: formData.autoGRN, autoInvoice: formData.autoInvoice,
        materialcode: formData.materialcode, unitPrice: formData.amount,
        purchaseGroup: formData.purchaseGroup, deliveryTo: formData.deliveryTo,
        taxCode: formData.taxCode, companyCode: formData.companyCode,
        shipToPlant: formData.shipToPlant, billTo: formData.billTo,
        deliveryDate: formData.needBy, comments: formData.comments,
        invoiceId: formData.invoiceId, invoiceDate: formData.invoiceDate,
        invoiceComments: formData.invoiceComments, vendorId: formData.vendorId,
        taxInclude: formData.taxInclude, invoiceAttachments: [...invoiceAttachments],
        ocrProceed,
      };
      setLineItems(prev => [...prev, newItem]); setNextId(prev => prev + 1); showToast('Line item added successfully!', 'success'); setOcrProceed(false);
      setFormData(prev => ({
        ...getResetFormState(prev),
      }));
      setInvoiceAttachments([]);
      if (isCopyMode) { setIsCopyMode(false); setOriginalCopyData(null); setOcrProceed(false); setFormData(prev => ({ ...getResetFormState(prev) })); setInvoiceAttachments([]); showToast('Form reset - ready for next line item', 'info', 2000); }
    }
  };

  const handleDelete = (id: number) => { setLineItems(prev => prev.filter(item => item.id !== id)); };
  const handleCancelEdit = () => { setEditingId(null); setOcrProceed(false); setFormData(prev => ({ ...getResetFormState(prev) })); setInvoiceAttachments([]); };
  const handleValidate = async () => { setShowValidationModal(true); setEditingValidationIds([]); setLineItemsSnapshot((lineItems || []).map(item => ({ ...item, invoiceAttachments: item.invoiceAttachments ? [...item.invoiceAttachments] : [] }))); };
  const handleValidationItemChange = (id: number, field: string, value: string) => { if (field === 'needBy' && value) { const selectedDate = new Date(value); if (selectedDate.getFullYear() < 2000) { showToast('Date cannot be before year 2000', 'error'); return; } } setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const handleSaveValidation = async () => {
    if (lineItems.length === 0) { showToast('No line items to submit.', 'warning'); return; }
    if (formData.autoInvoice) { const missingFields = []; if (!formData.invoiceId) missingFields.push('Invoice ID'); if (!formData.invoiceDate) missingFields.push('Invoice Date'); if (invoiceAttachments.length === 0) missingFields.push('Invoice Attachment'); if (missingFields.length > 0) { showToast(`Please fill in: ${missingFields.join(', ')}`, 'warning'); return; } }
    if (lineItems.length > 0) {
      const firstItem = lineItems[0];
      setFormData(prev => ({
        ...prev,
        venue: firstItem.venue,
        supplier: firstItem.supplier,
        description: firstItem.description,
        amount: firstItem.amount,
        quantity: firstItem.quantity || prev.quantity,
        uom: firstItem.uom || prev.uom,
        contract: firstItem.contract || prev.contract,
        glAccount: firstItem.glAccount || prev.glAccount,
        costCenter: firstItem.costCenter || prev.costCenter,
        purchaseOrg: firstItem.purchaseOrg || prev.purchaseOrg,
        purchaseGroup: firstItem.purchaseGroup || prev.purchaseGroup,
        companyCode: firstItem.companyCode || prev.companyCode,
        shipToPlant: firstItem.shipToPlant || prev.shipToPlant,
        billTo: firstItem.billTo || prev.billTo,
        currency: firstItem.currency || prev.currency,
        deliveryTo: firstItem.deliveryTo || prev.deliveryTo,
        materialcode: firstItem.materialcode || prev.materialcode,
        taxCode: firstItem.taxCode || prev.taxCode,
        needBy: firstItem.needBy || prev.needBy,
        taxInclude: firstItem.taxInclude ?? prev.taxInclude,
      }));
    }
    setEditingValidationIds([]); setShowValidationModal(false);
  };
  const handleNavigateToPr = (prNumber: string) => { setTargetPrNumber(prNumber); navigate('summary'); };
  const handleCancelValidationEdit = () => { setLineItems(lineItemsSnapshot); setEditingValidationIds([]); setShowValidationModal(false); };
  const toggleValidationEdit = (id: number) => { setEditingValidationIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]); };
  const handleCheckboxChange = (id: number) => { setSelectedLineItemIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]); };

  const handleSubmitRequisition = async () => {
    if (selectedLineItemIds.length === 0) { showToast('Please select at least one line item before submitting', 'warning'); return; }
    const selectedLineItems = lineItems.filter(item => item.id !== undefined && selectedLineItemIds.includes(item.id));
    if (ocrProceed && formData.autoInvoice) { const autoInvoiceLineItems = lineItems.filter(item => item.autoInvoice); const invoiceIds = new Set(autoInvoiceLineItems.map(item => item.invoiceId)); if (invoiceIds.size > 1) { showToast("Can't submit with different Invoice IDs when OCR Proceed is checked", 'warning'); return; } }
    for (const item of selectedLineItems) {
      if (!item.venue) { showToast('Please select a venue', 'error'); return; }
      if (!item.supplier) { showToast('Please select a supplier', 'error'); return; }
      if (!item.description) { showToast('Please enter a description', 'error'); return; }
      if (!item.amount) { showToast('Please enter an amount', 'error'); return; }
      if (!item.needBy) { showToast('Please select a need by date', 'error'); return; }
      if (!item.quantity) { showToast('Please enter a quantity', 'error'); return; }
    }
    const lineItemsDto: LineItemDto[] = await Promise.all(selectedLineItems.map(async (item, index) => {
      let invoiceAssets: AssetDto[] = [];
      if (item.autoInvoice) {
        const lineItemNumber = item.lineItemNumber || (index + 1);
        const mappedInvoicePdfs = invoicePdfMapping[lineItemNumber];
        if (mappedInvoicePdfs && mappedInvoicePdfs.length > 0) {
          invoiceAssets = await Promise.all(mappedInvoicePdfs.map(async (file) => {
            const base64 = await convertFileToBase64(file);
            return { fileName: file.name, contentType: file.type, fileBytes: base64, isSingletonAsset: true, entityType: 'INVOICE_TYPE_PRATTACHMENT', assetType: 'INVOICE_TYPE_PRATTACHMENT' };
          }));
        } else if (item.invoiceAttachments && item.invoiceAttachments.length > 0) {
          invoiceAssets = await Promise.all(item.invoiceAttachments.map(async (att: any) => {
            const actualFile: File = att instanceof File ? att : att.file;
            const base64 = await convertFileToBase64(actualFile);
            return { fileName: actualFile.name, contentType: actualFile.type, fileBytes: base64, isSingletonAsset: true, entityType: 'INVOICE_TYPE_PRATTACHMENT', assetType: 'INVOICE_TYPE_PRATTACHMENT' };
          }));
        }
      }
      return {
        NumberInCollection: index + 1,
        Venue: item.venue,
        Description: item.description,
        Quantity: parseInt(item.quantity || '0') || 0,
        UOM: item.uom,
        amount: parseFloat(item.amount) || 0,
        Currency: item.currency || 'AED',
        Vendor: await (async () => {
          const sup = item.supplier || '';
          if (sup.includes(' - ')) return extractVendorCode(sup);
          const cleanSup = sup.trim().toLowerCase();
          const matched = vendorsList.find(v => v.supplierName.trim().toLowerCase() === cleanSup || String(v.supplierId) === cleanSup);
          if (matched) return matched.supplierId;
          try {
            const res = await fetchSuppliers({ search: sup, page_size: 10 });
            if (res && res.suppliers) {
              const exactMatch = res.suppliers.find((s: any) => s.supplierName.trim().toLowerCase() === cleanSup);
              if (exactMatch) return exactMatch.supplierId;
            }
          } catch (e) { }
          if (item.vendorId && item.vendorId !== sup) return item.vendorId;
          return extractVendorCode(sup);
        })(),
        Contract: extractCode(item.contract) || null,
        PurchaseOrg: item.purchaseOrg || '',
        GLAccount: item.glAccount || '',
        CostCenter: extractCode(item.costCenter),
        MaterialCode: item.materialcode || '',
        NeedBy: item.needBy,
        TaxCode: item.taxCode || '',
        AutoGRN: item.autoGRN,
        TaxInclude: item.taxInclude,
        VendorName: extractVendorCodes(item.supplier),
        AutoInvoices: item.autoInvoice,
        InvoiceID: item.autoInvoice ? item.invoiceId : null,
        InvoiceDate: item.autoInvoice ? item.invoiceDate : null,
        InvoiceComment: item.autoInvoice ? item.invoiceComments : null,
        InvoiceAttachment: item.autoInvoice && invoiceAssets.length > 0 ? invoiceAssets : null,
      };
    }));

    const assetsDto: AssetDto[] = await Promise.all(attachments.map(async (file) => {
      const base64 = await convertFileToBase64(file);
      return { fileName: file.name, contentType: file.type, fileBytes: base64, isSingletonAsset: true, entityType: 'MATERIAL_PR_UPLOAD', assetType: 'MATERIAL_PR_UPLOAD' };
    }));

    setSubmitReqDisable(true);
    try {
      let response;
      const payload: CreateMaterialPRPayload = {
        PRRequests: [{ name: selectedLineItems[0]?.title || formData.title || '', headerComment: formData.comments, needBy: formData.needBy || new Date().toISOString(), lineItems: lineItemsDto, isHeader: ocrProceed }],
        asset: assetsDto
      };
      response = await createLegalPR(payload);
      if (response && (response.statusCode === 200 || response.statusCode === 201)) {
        setIsCopyMode(false); setOriginalCopyData(null);
        let message: React.ReactNode = `${lineItemsDto.length} line item(s) submitted successfully!`;
        if ('data' in response && response.data && Array.isArray(response.data)) { message = (<div><div className="toast-submit-header">{lineItemsDto.length} line item(s) submitted successfully!</div>{response.data.map((item: any, index: number) => (<div key={index} className="toast-submit-row"><span onClick={() => handleNavigateToPr(item.prNumber)} className="pr-number-link">{item.prNumber}</span>{' - '}{item.status}</div>))}</div>); }
        showToast(message, 'success', 5000);
        setFormData(prev => ({ ...getResetFormState(prev) }));
        setSelectedLineItemIds([]);
        setLineItems([]);
        setAttachments([]);
        setInvoiceAttachments([]);
        setInvoicePdfMapping({});
        setOcrProceed(false);
        setSelectAllChecked(false);
      } else {
        showToast('PR creation failed: ' + (response?.message || 'Unknown error'), 'error');
        saveDraft(); // fallback to draft
      }
    } catch (error) {
      showToast('An error occurred while submitting the requisition. Fallback to draft saving.', 'error');
      saveDraft(); // fallback to draft
    }
    finally { setSubmitReqDisable(false); setSelectedLineItemId(null); setIsDraft(false); setEditingId(null); setIsCopyMode(false); setOriginalCopyData(null); setOcrProceed(false); setFormData(prev => ({ ...getResetFormState(prev) })); }
  };

  const handleSaveAsDraft = () => { setIsDraft(true); };

  const saveDraft = useCallback(async (errorComment?: string) => {
    try {
      const hasFormData = formData.venue || formData.supplier || formData.amount || formData.autoInvoice;
      if (lineItems.length === 0 && !hasFormData) { if (onResetExitFlag) onResetExitFlag(); return; }
      let itemsToSave: LineItem[] = [];
      if (lineItems.length > 0) {
        itemsToSave = [...lineItems];
        if (hasFormData && !isCopyMode && editingId === null) { const isFormDataNew = !lineItems.some(item => item.venue === formData.venue && item.supplier === formData.supplier && item.description === formData.description && item.amount === formData.amount); if (isFormDataNew) { const formAsLineItem: any = { id: nextId, venue: formData.venue, supplier: formData.supplier, description: formData.description, amount: formData.amount, contract: formData.contract, glAccount: formData.glAccount, uom: formData.uom, quantity: formData.quantity, purchaseOrg: formData.purchaseOrg, costCenter: formData.costCenter, needBy: formData.needBy, currency: formData.currency, autoGRN: formData.autoGRN, autoInvoice: formData.autoInvoice, materialcode: formData.materialcode, purchaseGroup: formData.purchaseGroup, deliveryTo: formData.deliveryTo, taxCode: formData.taxCode, companyCode: formData.companyCode, shipToPlant: formData.shipToPlant, billTo: formData.billTo, taxInclude: formData.taxInclude, invoiceComments: formData.invoiceComments || null, invoiceId: formData.invoiceId || null, invoiceDate: formData.invoiceDate || null, vendorId: formData.vendorId || null, invoiceAttachments: [...invoiceAttachments] }; itemsToSave.push(formAsLineItem); } }
      } else if (hasFormData) { itemsToSave = [{ ...formData, id: 1, invoiceAttachments: [...invoiceAttachments] }]; }
      if (itemsToSave.length === 0) { if (onResetExitFlag) onResetExitFlag(); return; }
      const lineItemsDto: any[] = await Promise.all(itemsToSave.map(async (item, index) => { let invoiceAssets: AssetDto[] = []; if (item.autoInvoice && item.invoiceAttachments && item.invoiceAttachments.length > 0) { invoiceAssets = await Promise.all(item.invoiceAttachments.map(async (file) => { const base64 = await convertFileToBase64(file); return { fileName: file.name, contentType: file.type, fileBytes: base64, isSingletonAsset: true, entityType: 'INVOICE_TYPE_PRATTACHMENT', assetType: 'INVOICE_TYPE_PRATTACHMENT' }; })); } return { numberInCollection: index + 1, title: item.title || '', venue: item.venue, description: item.description, quantity: parseInt(item.quantity || '0') || 0, uom: item.uom, amount: parseFloat(item.amount) || 0, currency: item.currency || 'AED', vendor: item.vendorId || extractVendorCode(item.supplier), contract: extractCode(item.contract) || null, purchaseOrg: item.purchaseOrg, glAccount: item.glAccount, costCenter: extractCode(item.costCenter), materialCode: item.materialcode, needBy: item.needBy, taxCode: item.taxCode, autoGRN: item.autoGRN, taxInclude: item.taxInclude || false, vendorName: extractVendorCodes(item.supplier), autoInvoices: item.autoInvoice, invoiceID: item.invoiceId || null, invoiceDate: item.autoInvoice ? item.invoiceDate || null : null, invoiceComment: item.autoInvoice ? item.invoiceComments || null : null, invoiceAttachment: item.autoInvoice ? invoiceAssets : null, errorComment: errorComment || null }; }));
      const assetsDto: any[] = await Promise.all([...attachments].map(async (file) => { const base64 = await convertFileToBase64(file); return { fileName: file.name, contentType: file.type, fileBytes: base64, isSingletonAsset: true, entityType: 'MATERIAL_PR_UPLOAD', assetType: 'MATERIAL_PR_UPLOAD' }; }));
      const payload: any = { prRequests: [{ name: itemsToSave[0]?.title || formData.title || '', headerComment: formData.comments, needBy: formData.needBy || new Date().toISOString(), lineItems: lineItemsDto }], asset: assetsDto };
      const response = await createMaterialPRDraft(payload);
      if (response && (response.statusCode === 200 || response.statusCode === 201)) { showToast(`Draft saved with ${lineItemsDto.length} line item(s)`, 'success', 2000); setIsCopyMode(false); setIsDraftCopyMode(false); setOriginalCopyData(null); } else { showToast('Failed to save draft: ' + (response?.message || 'Unknown error'), 'error'); }
    } catch (error) { showToast('An error occurred while saving the draft.', 'error'); }
    finally { setIsDraft(false); if (onResetExitFlag) onResetExitFlag(); }
  }, [lineItems, formData, invoiceAttachments, attachments, nextId, onResetExitFlag, isCopyMode, editingId]);
  useEffect(() => {
    window.savePRDraft = saveDraft;
    return () => {
      window.savePRDraft = undefined;
    };
  }, [saveDraft]);

  const fetchVendorsData = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
    setVendorLoading(true);
    try {
      const response = await fetchSuppliers({ page: index, page_size: 10, ...(search && { search }) });
      if (response && response.suppliers) { if (response.suppliers.length === 0) { setHasMoreVendors(false); return; } if (index === 0) { if (search === '') { setVendorsList(prev => { const newIds = new Set(response.suppliers.map((s: any) => s.supplierId)); const preserved = prev.filter(p => !newIds.has(p.supplierId)); return [...response.suppliers, ...preserved]; }); } else { setVendorsList(response.suppliers); } } else { setVendorsList(prev => { const existingIds = new Set(prev.map(v => v.supplierId)); const newSuppliers = response.suppliers.filter((v: any) => !existingIds.has(v.supplierId)); return [...prev, ...newSuppliers]; }); } setHasMoreVendors(true); } else { setHasMoreVendors(false); }
    } catch (error: any) { if (error?.status === 401) return; if (index === 0) setVendorsList([]); setHasMoreVendors(false); }
    finally { setVendorLoading(false); }
  }, []);

  const handleVendorSearch = useCallback((search: string) => { setVendorSearch(search); setCurrentVendorIndex(0); setHasMoreVendors(true); fetchVendorsData(0, search); }, [fetchVendorsData]);
  const handleLoadMoreVendors = useCallback(() => { if (hasMoreVendors && !vendorLoading) { const nextIndex = currentVendorIndex + 10; setCurrentVendorIndex(nextIndex); fetchVendorsData(nextIndex, vendorSearch); } }, [currentVendorIndex, hasMoreVendors, vendorSearch, fetchVendorsData, vendorLoading]);

  useEffect(() => { fetchVendorsData(0, ''); }, [fetchVendorsData]);
  useEffect(() => {
    const fetchCurrencies = async () => {
      const result = await getCurrencies();
      if (Array.isArray(result)) {
        setCurrenciesList(result);
      }
    };
    fetchCurrencies();
  }, []);
  useEffect(() => { const currentSupplier = formData.supplier; if (currentSupplier && !currentSupplier.includes(' - ')) { const matched = vendorsList.find(v => v.supplierId === currentSupplier); if (matched) { setFormData(prev => ({ ...prev, supplier: `${matched.supplierId} - ${matched.supplierName}` })); lastSearchedSupplierRef.current = null; } else { if (lastSearchedSupplierRef.current !== currentSupplier) { lastSearchedSupplierRef.current = currentSupplier; fetchVendorsData(0, currentSupplier); } } } }, [formData.supplier, vendorsList, fetchVendorsData]);

  const fetchVenueData = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
    setVenueLoading(true);
    try {
      const response = await getLegalVenue({ page: index, page_size: 10, ...(search && { search }) });
      if (response && response.suppliers) { if (response.suppliers.length === 0) { setHasMoreVenues(false); return; } if (index === 0) { setVenuesList(response.suppliers); } else { setVenuesList(prev => [...prev, ...response.suppliers]); } setHasMoreVenues(true); } else { setHasMoreVenues(false); }
    } catch (error: any) { if (error?.status === 401) return; if (index === 0) setVenuesList([]); setHasMoreVenues(false); }
    finally { setVenueLoading(false); }
  }, []);

  const handleVenueSearch = useCallback((search: string) => { setVenueSearch(search); setCurrentVenueIndex(0); setHasMoreVenues(true); fetchVenueData(0, search); }, [fetchVenueData]);
  const handleLoadMoreVenues = useCallback(() => { if (hasMoreVenues && !venueLoading) { const nextIndex = currentVenueIndex + 10; setCurrentVenueIndex(nextIndex); fetchVenueData(nextIndex, venueSearch); } }, [currentVenueIndex, hasMoreVenues, venueSearch, fetchVenueData, venueLoading]);
  useEffect(() => { fetchVenueData(0, ''); }, [fetchVenueData]);

  const fetchMaterialsData = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
    setMaterialLoading(true);
    try {
      const response = await legalMaterialData({ page: index, page_size: 10, ...(search && { search }) });
      if (response && response.materials) {
        if (response.materials.length === 0) {
          setHasMoreMaterials(false);
          return;
        }
        if (index === 0) {
          setMaterialsList(response.materials);
        } else {
          setMaterialsList(prev => {
            const existingCodes = new Set(prev.map(m => m.materialCode));
            const newMaterials = response.materials.filter((m: any) => !existingCodes.has(m.materialCode));
            return [...prev, ...newMaterials];
          });
        }
        setHasMoreMaterials(true);
      } else {
        setHasMoreMaterials(false);
      }
    } catch (error: any) {
      if (error?.status === 401) return;
      if (index === 0) setMaterialsList([]);
      setHasMoreMaterials(false);
    } finally {
      setMaterialLoading(false);
    }
  }, []);

  const handleMaterialSearch = useCallback((search: string) => {
    setMaterialSearch(search);
    setCurrentMaterialIndex(0);
    setHasMoreMaterials(true);
    fetchMaterialsData(0, search);
  }, [fetchMaterialsData]);

  const handleLoadMoreMaterials = useCallback(() => {
    if (hasMoreMaterials && !materialLoading) {
      const nextIndex = currentMaterialIndex + 10;
      setCurrentMaterialIndex(nextIndex);
      fetchMaterialsData(nextIndex, materialSearch);
    }
  }, [currentMaterialIndex, hasMoreMaterials, materialSearch, fetchMaterialsData, materialLoading]);

  useEffect(() => { fetchMaterialsData(0, ''); }, [fetchMaterialsData]);

  const mapPrDataToState = async (data: any) => {
    const rawLines = data.lineItems || data.LineItems || [];
    const firstLine = rawLines.length > 0 ? rawLines[0] : {};
    const newForm = {
      venue: firstLine.venue || firstLine.Venue || data.venue || data.Venue || '',
      supplierRes: await (async () => {
        const val = firstLine.vendor || firstLine.Vendor || firstLine.supplier || data.Vendor || data.vendor || data.supplier || '';
        const name = firstLine.vendorName || firstLine.VendorName || data.VendorName || data.vendorName || '';
        if (val && val.includes(' - ')) return val;
        const matched = vendorsList.find(v => v.supplierId === val);
        if (matched) return `${matched.supplierId} - ${matched.supplierName}`;
        if (val && name && val !== name) return `${val} - ${name}`;
        return val || '';
      })(),
      title: data.title || data.name || '',
      description: firstLine.description || firstLine.Description || data.description || data.Description || '',
      amount: String(firstLine.amount || firstLine.Amount || firstLine.price || firstLine.Price || data.Amount || data.amount || data.Price || data.TotalCost || ''),
      companyCode: firstLine.companyCode || firstLine.CompanyCode || data.CompanyCode || data.companyCode || '',
      shipToPlant: firstLine.shipToPlant || firstLine.ShipToPlant || data.ShipToPlant || data.shipToPlant || '',
      billTo: firstLine.billTo || firstLine.BillTo || data.BillTo || data.billTo || '',
      purchaseOrg: firstLine.purchaseOrg || firstLine.PurchaseOrg || data.PurchaseOrg || data.purchaseOrg || '',
      purchaseGroup: firstLine.purchaseGroup || firstLine.PurchaseGroup || data.PurchaseGroup || data.purchaseGroup || '',
      currency: firstLine.currency || firstLine.Currency || data.Currency || data.currency || '',
      deliveryTo: firstLine.deliverTo || firstLine.DeliverTo || firstLine.deliveryTo || data.DeliverTo || data.deliverTo || data.deliveryTo || '',
      taxCode: firstLine.taxCode || firstLine.TaxCode || data.TaxCode || data.taxCode || '',
      costCenter: firstLine.costCenter || firstLine.CostCenter || data.CostCenter || data.costCenter || '',
      materialcode: firstLine.materialCode || firstLine.MaterialCode || data.MaterialCode || data.materialCode,
      contract: firstLine.contract || firstLine.Contract || data.Contract || data.contract || null,
      glAccount: firstLine.glAccount || firstLine.GLAccount || data.GLAccount || data.glAccount || '',
      uom: firstLine.uom || firstLine.UOM || data.UOM || data.uom,
      autoInvoice: firstLine.autoInvoices !== undefined ? firstLine.autoInvoices : (data.autoInvoices !== undefined ? data.autoInvoices : false),
      needBy: formatDateForInput(firstLine.needBy || firstLine.NeedBy || data.NeedBy || data.needBy) || formatDateForInput(date),
      quantity: String(firstLine.quantity || firstLine.Quantity || data.Quantity || data.quantity || '1'),
      autoGRN: firstLine.autoGRN !== undefined ? firstLine.autoGRN : (data.AutoGRN !== undefined ? data.AutoGRN : true),
      comments: data.headerComment || data.HeaderComment || data.comments || '',
      invoiceId: firstLine.invoiceID || firstLine.invoiceId || data.invoiceID || data.invoiceId || '',
      invoiceDate: formatDateForInput(firstLine.invoiceDate || firstLine.InvoiceDate || data.invoiceDate || data.InvoiceDate) || '',
      invoiceComments: firstLine.invoiceComment || firstLine.invoiceComments || data.invoiceComment || data.invoiceComments || '',
      vendorId: (firstLine.vendor || firstLine.Vendor || data.Vendor || data.vendor || '').includes(' - ') ? extractVendorCode(firstLine.vendor || firstLine.Vendor || data.Vendor || data.vendor || '') : (firstLine.vendor || firstLine.Vendor || data.Vendor || data.vendor || ''),
      taxInclude: firstLine.taxInclude !== undefined ? firstLine.taxInclude : (data.taxInclude !== undefined ? data.taxInclude : false),
    };
    setFormData({ ...newForm, supplier: newForm.supplierRes });
    let lines: LineItem[] = [];
    if (rawLines.length > 0) {
      lines = await Promise.all(rawLines.map(async (line: any, index: number) => {
        const lineSupplierRes = await (async () => {
          const val = line.vendor || line.Vendor || line.supplier || '';
          const name = line.vendorName || line.VendorName || '';
          if (!val) return newForm.supplierRes;
          if (val && val.includes(' - ')) return val;
          const matched = vendorsList.find(v => v.supplierId === val);
          if (matched) return `${matched.supplierId} - ${matched.supplierName}`;
          if (val && name && val !== name) return `${val} - ${name}`;
          return val || '';
        })();
        return {
          id: index + 1,
          title: newForm.title || '',
          venue: line.venue || line.Venue || '',
          supplier: lineSupplierRes,
          description: line.description || line.Description || '',
          amount: String(line.price || line.Price || line.amount || line.Amount || ''),
          contract: line.contract || line.Contract || null,
          glAccount: line.glAccount || line.GLAccount || '',
          uom: line.uom || line.UOM,
          quantity: String(line.quantity || line.Quantity || '1'),
          purchaseOrg: line.purchaseOrg || line.PurchaseOrg || '',
          purchaseGroup: line.purchaseGroup || line.PurchaseGroup || '',
          companyCode: line.companyCode || line.CompanyCode || '',
          shipToPlant: line.shipToPlant || line.ShipToPlant || '',
          billTo: line.billTo || line.BillTo || '',
          deliveryTo: line.deliverTo || line.DeliverTo || line.deliveryTo || '',
          costCenter: line.costCenter || line.CostCenter || '',
          needBy: formatDateForInput(line.needBy || line.NeedBy) || '',
          currency: line.currency || line.Currency || 'AED',
          autoGRN: line.autoGRN !== undefined ? line.autoGRN : true,
          vendorId: (lineSupplierRes && lineSupplierRes.includes(' - ')) ? extractVendorCode(lineSupplierRes) : (line.vendor || line.Vendor || line.vendorId || ''),
          autoInvoice: line.autoInvoices !== undefined ? line.autoInvoices : false,
          materialcode: line.materialCode || line.materialcode || line.MaterialCode,
          taxCode: line.taxCode || line.TaxCode || '',
          taxInclude: line.taxInclude !== undefined ? line.taxInclude : false,
          invoiceComments: line.invoiceComment || line.invoiceComments || '',
          invoiceId: line.invoiceID || line.invoiceId || '',
          invoiceDate: formatDateForInput(line.invoiceDate || line.InvoiceDate) || '',
          invoiceAttachments: line.invoiceAttachments || [],
        };
      }));
    } else {
      lines = [{ ...newForm, id: 1, supplier: newForm.supplierRes, taxInclude: newForm.taxInclude, invoiceComments: newForm.invoiceComments, invoiceAttachments: [] }];
    }
    setLineItems(lines);
    setNextId(lines.length + 1);
    return { ...newForm, supplier: newForm.supplierRes, lineItems: lines };
  };

  const mapDraftDataToState = async (data: any) => {
    const rawLines = data.lineItems || data.LineItems || (data.PRRequests && data.PRRequests[0]?.lineItems) || (data.prRequests && data.prRequests[0]?.lineItems) || [];
    const firstLine = rawLines.length > 0 ? rawLines[0] : {};
    const getVal = (keys: string[]) => {
      const headerSource = (data.PRRequests && data.PRRequests[0]) || (data.prRequests && data.prRequests[0]);
      if (headerSource) { for (const key of keys) { if (headerSource[key] !== undefined && headerSource[key] !== null) return headerSource[key]; } }
      for (const key of keys) { if (data[key] !== undefined && data[key] !== null) return data[key]; }
      for (const key of keys) { if (firstLine[key] !== undefined && firstLine[key] !== null) return firstLine[key]; }
      return undefined;
    };
    const newForm = {
      venue: getVal(['Venue', 'venue']) || '',
      supplierRes: await (async () => {
        const val = getVal(['Vendor', 'vendor', 'supplier', 'vendorId', 'VendorId']) || '';
        const name = getVal(['VendorName', 'vendorName', 'supplierName']) || '';
        if (val && val.includes(' - ')) return val;
        const matched = vendorsList.find(v => v.supplierId === val || v.supplierName.toLocaleLowerCase() === val.toLocaleLowerCase());
        if (matched) return `${matched.supplierId} - ${matched.supplierName}`;
        if (val && name && val !== name) return `${val} - ${name}`;
        try {
          const res = await fetchSuppliers({ page: 0, page_size: 10, search: val });
          if (res && res.suppliers) {
            const normVal = String(val).trim().toLowerCase();
            const match = res.suppliers.find((s: any) => String(s.supplierId).trim() == String(val).trim() || (s.supplierName && String(s.supplierName).trim().toLowerCase() === normVal));
            if (match) {
              setVendorsList(prev => { if (!prev.find(p => p.supplierId === match.supplierId)) return [...prev, match]; return prev; });
              return `${match.supplierId} - ${match.supplierName}`;
            }
          }
        } catch (e) { }
        return val || name || '';
      })(),
      description: getVal(['Description', 'description']) || '',
      amount: String(getVal(['Amount', 'amount', 'Price', 'TotalCost']) || ''),
      companyCode: getVal(['CompanyCode', 'companyCode']),
      shipToPlant: getVal(['ShipToPlant', 'shipToPlant']),
      billTo: getVal(['BillTo', 'billTo']),
      title: getVal(['Title', 'title', 'Name', 'name']) || '',
      purchaseOrg: getVal(['PurchaseOrg', 'purchaseOrg']),
      purchaseGroup: getVal(['PurchaseGroup', 'purchaseGroup']),
      currency: getVal(['Currency', 'currency']),
      deliveryTo: getVal(['DeliverTo', 'deliverTo', 'deliveryTo']),
      taxCode: getVal(['TaxCode', 'taxCode']),
      costCenter: getVal(['CostCenter', 'costCenter']),
      materialcode: getVal(['MaterialCode', 'materialCode', 'materialcode']),
      contract: getVal(['Contract', 'contract']),
      glAccount: getVal(['GLAccount', 'glAccount']),
      uom: getVal(['UOM', 'uom']),
      autoInvoice: getVal(['AutoInvoices', 'autoInvoices', 'AutoInvoice', 'autoInvoice']),
      needBy: formatDateForInput(getVal(['NeedBy', 'needBy'])) || formatDateForInput(date),
      quantity: String(getVal(['Quantity', 'quantity']) || ''),
      autoGRN: getVal(['AutoGRN', 'autoGRN']) !== undefined ? getVal(['AutoGRN', 'autoGRN']) : true,
      comments: getVal(['HeaderComment', 'headerComment']) || '',
      invoiceId: getVal(['invoiceId', 'InvoiceId', 'invoiceID', 'InvoiceID']) || '',
      invoiceDate: formatDateForInput(getVal(['invoiceDate', 'InvoiceDate'])) || '',
      invoiceComments: getVal(['invoiceComments', 'InvoiceComments']) || '',
      vendorId: (getVal(['Vendor', 'vendor', 'vendorId']) || '').includes(' - ') ? extractVendorCode(getVal(['Vendor', 'vendor', 'vendorId']) || '') : (getVal(['Vendor', 'vendor', 'vendorId']) || ''),
      taxInclude: getVal(['taxInclude', 'TaxInclude']) !== undefined ? getVal(['taxInclude', 'TaxInclude']) : false,
    };
    setFormData({ ...newForm, supplier: newForm.supplierRes });
    let lines: LineItem[] = [];
    if (rawLines.length > 0) {
      lines = await Promise.all(rawLines.map(async (line: any, index: number) => {
        const lineSupplierRes = await (async () => {
          const val = line.Vendor || line.vendor || line.supplier || line.vendorId || '';
          const name = line.VendorName || line.vendorName || line.supplierName || '';
          if (!val && !name) return newForm.supplierRes;
          if (val && val.includes(' - ')) return val;
          const matched = vendorsList.find(v => v.supplierId === val);
          if (matched) return `${matched.supplierId} - ${matched.supplierName}`;
          if (val && name && val !== name) return `${val} - ${name}`;
          try {
            const res = await fetchSuppliers({ search: val, page_size: 10 });
            if (res && res.suppliers) {
              const normVal = String(val).trim().toLowerCase();
              const match = res.suppliers.find((s: any) => String(s.supplierId).trim() == String(val).trim() || (s.supplierName && String(s.supplierName).trim().toLowerCase() === normVal));
              if (match) {
                setVendorsList(prev => { if (!prev.find(p => p.supplierId === match.supplierId)) return [...prev, match]; return prev; });
                return `${match.supplierId} - ${match.supplierName}`;
              }
            }
          } catch (e) { }
          return val || name || '';
        })();
        return {
          id: index + 1,
          title: newForm.title || line.Title || line.title || '',
          venue: line.Venue || line.venue || newForm.venue,
          supplier: lineSupplierRes,
          description: line.Description || line.description || newForm.description,
          amount: String(line.Price || line.Amount || line.amount || newForm.amount),
          contract: line.Contract || line.contract || newForm.contract,
          glAccount: line.GLAccount || line.glAccount || newForm.glAccount,
          uom: line.UOM || line.uom || newForm.uom,
          quantity: String(line.Quantity || line.quantity || newForm.quantity),
          purchaseOrg: line.PurchaseOrg || line.purchaseOrg || newForm.purchaseOrg,
          purchaseGroup: line.PurchaseGroup || line.purchaseGroup || newForm.purchaseGroup,
          companyCode: line.CompanyCode || line.companyCode || newForm.companyCode,
          shipToPlant: line.ShipToPlant || line.shipToPlant || newForm.shipToPlant,
          billTo: line.BillTo || line.billTo || newForm.billTo,
          deliveryTo: line.DeliverTo || line.deliverTo || line.deliveryTo || newForm.deliveryTo,
          costCenter: line.CostCenter || line.costCenter || newForm.costCenter,
          needBy: formatDateForInput(line.NeedBy || line.needBy) || newForm.needBy,
          currency: line.Currency || line.currency || newForm.currency,
          autoGRN: line.AutoGRN !== undefined ? line.AutoGRN : (line.autoGRN !== undefined ? line.autoGRN : newForm.autoGRN),
          autoInvoice: line.AutoInvoices !== undefined ? line.AutoInvoices : (line.autoInvoices !== undefined ? line.autoInvoices : newForm.autoInvoice),
          materialcode: line.MaterialCode || line.materialcode || line.materialCode || newForm.materialcode,
          taxCode: line.TaxCode || line.taxCode || newForm.taxCode,
          taxInclude: line.taxInclude !== undefined ? line.taxInclude : false,
          invoiceComments: line.invoiceComments || line.InvoiceComments || '',
          invoiceId: line.invoiceId || line.InvoiceId || line.invoiceID || line.InvoiceID || (newForm.autoInvoice ? newForm.invoiceId : ''),
          invoiceDate: formatDateForInput(line.invoiceDate || line.InvoiceDate) || (newForm.autoInvoice ? newForm.invoiceDate : ''),
          vendorId: (lineSupplierRes && lineSupplierRes.includes(' - ')) ? extractVendorCode(lineSupplierRes) : (line.vendor || line.Vendor || line.vendorId || ''),
          invoiceAttachments: line.invoiceAttachments || line.invoiceAttachment || [],
        };
      }));
    } else {
      lines = [{ ...newForm, id: 1, supplier: newForm.supplierRes, taxInclude: false, invoiceComments: '', invoiceAttachments: [] }];
    }
    setLineItems(lines);
    setNextId(lines.length + 1);
    return { ...newForm, supplier: newForm.supplierRes, lineItems: lines };
  };

  const handleEditPrFromSummary = (data: any) => { navigate('../edit', { state: { prData: data }, relative: 'path' }); };
  const handleCopyPrFromSummary = async (data: any) => {
    const isDraftItem = data.draftID !== undefined || data.DraftID !== undefined;
    let newForm = isDraftItem ? await mapDraftDataToState(data) : await mapPrDataToState(data);
    if (isDraftItem) {
      try {
        const smartDefaults = await getPRSmartDefaults();
        let venueDetails: any = null;
        if (newForm.venue) {
          try {
            const venueResp = await getLegalVenueDetails({ search: newForm.venue });
            if (venueResp && venueResp.suppliers) venueDetails = venueResp.suppliers;
          } catch (vErr) { }
        }
        newForm = {
          ...newForm,
          currency: newForm.currency || "AED",
          title: newForm.title || "",
          deliveryTo: newForm.deliveryTo || smartDefaults.deliverTo || "",
          companyCode: newForm.companyCode || venueDetails?.companyCode || smartDefaults.companyCode || "",
          purchaseOrg: newForm.purchaseOrg || venueDetails?.purchaseOrg || smartDefaults.purchaseOrg || "",
          purchaseGroup: newForm.purchaseGroup || venueDetails?.purchaseGroup || smartDefaults.purchaseGroup || "",
          shipToPlant: newForm.shipToPlant || venueDetails?.shipToPlant || smartDefaults.shipToPlant || "",
          materialcode: newForm.materialcode || (venueDetails && venueDetails.materialCode),
          billTo: newForm.billTo || venueDetails?.billTo || smartDefaults.billTo || "",
          costCenter: newForm.costCenter || venueDetails?.costCenter || smartDefaults.costCenter || "",
          glAccount: newForm.glAccount || venueDetails?.glAccount || smartDefaults.glAccount || "",
          contract: newForm.contract || smartDefaults.contract || null,
          uom: newForm.uom || smartDefaults.uom,
          taxCode: newForm.taxCode || smartDefaults.taxCode || ""
        };
      } catch (error) { }
    }
    // ensure header description is cleared for copy mode
    newForm.description = '';
    setOriginalCopyData(newForm);
    setFormData(newForm);
    navigate('../', { relative: 'path' });
    setIsCopyMode(true);
    setIsDraftCopyMode(isDraftItem);
    if (data.headerAttachmentFiles && data.headerAttachmentFiles.length > 0) setAttachments(data.headerAttachmentFiles);
    if (data.invoiceMapping) setInvoicePdfMapping(data.invoiceMapping);
    if (newForm.autoInvoice) {
      const firstLineItemData = data.lineItems?.[0];
      const lineItemNumber = firstLineItemData?.lineItemNumber || 1;
      const formInvoicePdfs = (firstLineItemData?.invoiceAttachmentFiles && firstLineItemData.invoiceAttachmentFiles.length > 0) ? firstLineItemData.invoiceAttachmentFiles : (data.invoiceMapping?.[lineItemNumber] || []);
      if (formInvoicePdfs.length > 0) setInvoiceAttachments(formInvoicePdfs);
    }
    setLineItems(() => {
      const rawLines = data.lineItems || data.LineItems || (data.PRRequests && data.PRRequests[0]?.lineItems) || [];
      if (rawLines.length > 0) {
        return rawLines.map((line: any, index: number) => {
          const currentLineMapped = newForm.lineItems?.[index];
          const parts = [];
          const venue = line.Venue || line.venue || newForm.venue;
          const supplier = currentLineMapped?.supplier || newForm.supplier;
          const needBy = formatDateForInput(line.NeedBy || line.needBy) || newForm.needBy;
          if (venue) parts.push(venue);
          if (supplier) parts.push(extractVendorCodes(supplier));
          if (needBy) parts.push(needBy);
          if (!isDraftItem) parts.push('(Copy)');
          const lineItemData = data.lineItems?.[index];
          const lineItemNumber = lineItemData?.lineItemNumber || (index + 1);
          const invoicePdfs = (lineItemData?.invoiceAttachmentFiles && lineItemData.invoiceAttachmentFiles.length > 0) ? lineItemData.invoiceAttachmentFiles : (data.invoiceMapping?.[lineItemNumber] || []);
          return {
            id: index + 1,
            venue,
            supplier,
            vendorId: (supplier && supplier.includes(' - ')) ? extractVendorCode(supplier) : (currentLineMapped?.vendorId || newForm.vendorId || ''),
            // Clear description for copy so form opens with empty Description
            description: '',
            amount: String(line.Price || line.Amount || line.amount || line.price || newForm.amount),
            contract: line.Contract || line.contract || newForm.contract,
            glAccount: line.GLAccount || line.glAccount || newForm.glAccount,
            uom: line.UOM || line.uom || newForm.uom,
            quantity: String(line.Quantity || line.quantity || newForm.quantity),
            purchaseOrg: line.PurchaseOrg || line.purchaseOrg || newForm.purchaseOrg,
            purchaseGroup: line.PurchaseGroup || line.purchaseGroup || newForm.purchaseGroup,
            companyCode: line.CompanyCode || line.companyCode || newForm.companyCode,
            shipToPlant: line.ShipToPlant || line.shipToPlant || newForm.shipToPlant,
            billTo: line.BillTo || line.billTo || newForm.billTo,
            deliveryTo: line.DeliverTo || line.deliverTo || line.deliveryTo || newForm.deliveryTo,
            costCenter: line.CostCenter || line.costCenter || newForm.costCenter,
            needBy,
            currency: line.Currency || line.currency || newForm.currency,
            autoGRN: line.AutoGRN !== undefined ? line.AutoGRN : (line.autoGRN !== undefined ? line.autoGRN : newForm.autoGRN),
            autoInvoice: line.AutoInvoices !== undefined ? line.AutoInvoices : (line.autoInvoices !== undefined ? line.autoInvoices : newForm.autoInvoice),
            materialcode: line.MaterialCode || line.materialcode || line.materialCode || newForm.materialcode,
            taxCode: line.TaxCode || line.taxCode || newForm.taxCode,
            taxInclude: line.taxInclude !== undefined ? line.taxInclude : (line.TaxInclude !== undefined ? line.TaxInclude : newForm.taxInclude),
            invoiceComments: line.invoiceComments || line.InvoiceComments || '',
            invoiceId: line.invoiceId || line.InvoiceId || line.invoiceID || line.InvoiceID || (newForm.autoInvoice ? newForm.invoiceId : ''),
            invoiceDate: formatDateForInput(line.invoiceDate || line.InvoiceDate) || (newForm.autoInvoice ? newForm.invoiceId : ''),
            invoiceAttachments: invoicePdfs,
            lineItemNumber,
          };
        });
      } else {
        return [{ ...newForm, id: 1, supplier: newForm.supplier, taxInclude: newForm.taxInclude, invoiceComments: newForm.invoiceComments || '', invoiceAttachments: [], vendorId: newForm.vendorId || '' }];
      }
    });
    setFormData(prev => ({ ...prev, comments: (newForm.comments || ''), description: newForm?.description?.trim() }));
  };

  useEffect(() => {
    // do not auto-generate description when in copy mode
    if (isCopyMode) return;
    if (originalCopyData) {
      // only auto-generate a description if the current description is empty
      if (formData.description && String(formData.description).trim() !== '') return;
      const parts = [];
      if (formData.venue) parts.push(formData.venue);
      if (formData.supplier) parts.push(extractVendorCodes(formData.supplier));
      if (formData.needBy) parts.push(formData.needBy);
      if (!isDraftCopyMode) parts.push('(Copy)');
      if (parts.length > 0) {
        const newDesc = parts.join('-');
        if (formData.description !== newDesc) setFormData(prev => ({ ...prev, description: newDesc }));
      }
    }
  }, [isDraftCopyMode, originalCopyData, editingId, formData.description, isCopyMode]);

  const validationFields = useMemo(() => {
    return [
      { key: 'venue', label: 'Venue' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'currency', label: 'Currency' },
      { key: 'needBy', label: 'Need By Date' },
      { key: 'costCenter', label: 'Cost Center' },
      { key: 'glAccount', label: 'GL Account' },
      { key: 'taxInclude', label: 'Includes Tax' },
      { key: 'companyCode', label: 'Company Code' },
      { key: 'shipToPlant', label: 'Ship-to Plant' },
      { key: 'billTo', label: 'Bill-to' },
      { key: 'deliveryTo', label: 'Delivery To' },
      { key: 'materialcode', label: 'Material Code' },
      { key: 'taxCode', label: 'Tax Code' },
      { key: 'uom', label: 'Uom' }
    ];
  }, []);

  useEffect(() => { if (userId) { if (vendorsList.length === 0) fetchVendorsData(0, ''); if (venuesList.length === 0) fetchVenueData(0, ''); } }, [userId, vendorsList.length, venuesList.length, fetchVendorsData, fetchVenueData]);
  useEffect(() => { const fetchUserInfo = async () => { try { const responce = await getPRSmartDefaults(); if ('companyCode' in responce) setFormData(prev => ({ ...prev, currency: "AED", deliveryTo: prev.deliveryTo || responce.deliverTo || '' })); } catch (error: any) { if (error?.status === '401') return; } }; fetchUserInfo(); }, [userId]);
  useEffect(() => { if (exitConfirmed || isDraft) saveDraft(); }, [exitConfirmed, isDraft, saveDraft]);
  useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (!submitReqDisable) handleSaveAsDraft(); } }; document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }, [submitReqDisable]);
  useEffect(() => { if (onViewModeChange) onViewModeChange(currentViewMode as any); }, [currentViewMode, onViewModeChange]);
  const handleBack = () => { navigate('..', { relative: 'path' }); setTargetPrNumber(null); };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        saveDraft();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, saveDraft]);

  const handleNavigateBack = () => {
    if (isDraftEnabled) {
      setShowExitModal(true);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <Routes>
      <Route path="summary" element={<PrSummary onBack={handleBack} onEdit={handleEditPrFromSummary} onCopy={handleCopyPrFromSummary} filterPrNumber={targetPrNumber} onFetchData={getAllPRMaterialPR} summaryType="material" />} />
      <Route path="edit" element={<PrEditWrapper onBack={() => navigate('../summary', { relative: 'path' })} onUpdateSuccess={() => navigate('../summary', { relative: 'path' })} onUpdate={createLegalPR} />} />
      <Route path="draft" element={<PrDraft onBack={handleBack} onEdit={handleEditPrFromSummary} onCopy={handleCopyPrFromSummary} filterPrNumber={targetPrNumber} onFetchData={getAllDraftMaterialPR} />} />
      <Route path="/" element={
        <>
          {/* VALIDATION MODAL */}
          {showValidationModal && (
            <div className="modal-overlay summary-font-family" onClick={() => setShowValidationModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Validation Details</h3>
                </div>
                <div className="modal-body">
                  <h4>Line Items ({(lineItems || []).length})</h4>
                  {(lineItems || []).length === 0 ? <div className="no-items-message">No line items to validate.</div> : (
                    <div className="validation-list">
                      {lineItems.map((item, index) => (
                        <div key={item.id} className="validation-item-container">
                          <div className="validation-item-header-row">
                            <h4 className="validation-item-header">Line Item #{index + 1}</h4>
                            {item.id !== undefined && (<button className="btn-icon btn-edit-sm" onClick={() => item.id && toggleValidationEdit(item.id)} title={editingValidationIds.includes(item.id) ? "Stop Editing" : "Edit"}><FaEdit color='#0064D2' /></button>)}
                          </div>
                          <div className="table-container">
                            <table className="table-line-items validation-table">
                              <thead><tr><th className='line-items-title'>FIELD</th><th className='line-items-title'>VALUE</th></tr></thead>
                              <tbody>
                                {validationFields.map((field: { key: string; label: string }) => (
                                  <tr key={`${item.id}-${field.key}`}>
                                    <td className="validation-field-label" title={field.label}>{field.label}</td>
                                    <td title={String(item[field.key as keyof LineItem] || '')}>
                                      {item.id !== undefined && editingValidationIds.includes(item.id) ? (
                                        field.key === 'taxInclude' ? <input type="checkbox" checked={!!item.taxInclude} onChange={(e) => item.id !== undefined && handleValidationItemChange(item.id, field.key, String(e.target.checked))} /> : <input type={field.key.includes('Date') ? 'date' : 'text'} value={String(item[field.key as keyof LineItem] || '')} onChange={(e) => item.id !== undefined && handleValidationItemChange(item.id, field.key, e.target.value)} className="validation-input" {...(field.key.includes('Date') && { min: '2000-01-01' })} />
                                      ) : <span>{field.key === 'taxInclude' ? (item.taxInclude ? 'Yes' : 'No') : String(item[field.key as keyof LineItem] || '')}</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-cancel" onClick={handleCancelValidationEdit}>Cancel</button>
                  <button className="btn btn-submit" onClick={handleSaveValidation}>Save</button>
                </div>
              </div>
            </div>
          )}

          {/* SWITCH CONFIRM MODAL */}
          {showSwitchConfirm && (
            <div className="modal-overlay" onClick={() => setShowSwitchConfirm(false)}>
              <div className="modal-content-sm switch-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h3>Confirm Switch</h3></div>
                <div className="modal-body">
                  <p>You are editing Line Item #{lineItems.findIndex(i => i.id === editingId) + 1}.<br />Switching to Line Item #{lineItems.findIndex(i => i.id === pendingSwitchId) + 1} will discard unsaved changes.<br /><br />Do you want to continue?</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-cancel" onClick={() => { setShowSwitchConfirm(false); setPendingSwitchId(null); }}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => { setEditingId(null); setSelectedLineItemId(pendingSwitchId); setShowSwitchConfirm(false); setPendingSwitchId(null); }}>Switch &amp; Discard</button>
                </div>
              </div>
            </div>
          )}

          {/* EXIT DRAFT MODAL */}
          {showExitModal && (
            <div className="modal-overlay" onClick={() => setShowExitModal(false)}>
              <div className="modal-content-sm switch-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h3>Unsaved Changes</h3></div>
                <div className="modal-body">
                  <p>You have unsaved changes in your draft.<br /><br />Do you want to save these changes before leaving?</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-cancel" onClick={() => setShowExitModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => handleManualProceed()}>Discard</button>
                  <button className="btn btn-submit" onClick={async () => { await saveDraft(); handleManualProceed(); }}>Save as Draft</button>
                </div>
              </div>
            </div>
          )}

          {/* ── MAIN PAGE ── */}
          <div className="pr-entertainment-container summary-font-family">

            {/* Header: title + tabs */}
            <div className="pr-header">
              <div className="pr-header-title-row">
                {currentViewMode === 'form' && onBack && <div className="pr-header-back"><BackButton onClick={handleNavigateBack} /></div>}
                <h1>Legal</h1>
              </div>
              <div className="pr-nav-tabs-wrapper">
                <div className="pr-nav-tabs">
                  <button className="nav-tab active">Create PR</button>
                  <button className="nav-tab" onClick={() => handleManualNavigate('draft')}>Drafts</button>
                  <button className="nav-tab" onClick={() => handleManualNavigate('summary')}>Summary</button>
                </div>
                {currentViewMode === 'form' && (
                  <div className="pr-header-actions">
                    <button
                      type="button"
                      onClick={handleSaveAsDraft}
                      className="pr-save-draft-icon-btn"
                      disabled={!isDraftEnabled}
                      title="Save as Draft"
                    >
                      <FaSave />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Two-column content */}
            <div className="pr-content-wrapper">

              {/* LEFT: line items list */}
              <div className="pr-left-panel" onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('line-items-list') || (e.target as HTMLElement).classList.contains('empty-state')) {
                  setEditingId(null);
                  setSelectedLineItemId(null);
                  setFormData(prev => ({
                    ...getResetFormState(prev),
                  }));
                  setInvoiceAttachments([]);
                }
              }}>
                <div className="line-items-header" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectAllChecked} onChange={handleSelectAll} className="line-items-select-all" />
                  <h3 className="panel-title">Line Items</h3>
                  <button className="btn-add-line-item"
                    title={selectedLineItemIds.length > 0 ? "Duplicate selected line items" : "Add new line item"}
                    onClick={handleAddOrDuplicateLineItems}>
                    +
                  </button>
                </div>

                {lineItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📄</div>
                    <p>No Line Items to show</p>
                    <span className="empty-hint">Add items using (+) or upload via Bulk Upload</span>
                  </div>
                ) : (
                  <div className="line-items-list">
                    {lineItems.map((item, index) => (
                      <div key={item.id}
                        className={`line-item-card ${selectedLineItemId === item.id ? 'selected' : ''} ${editingId === item.id ? 'editing' : ''}`}
                        onClick={() => { if (editingId !== null && editingId !== item.id) { setPendingSwitchId(item.id || null); setShowSwitchConfirm(true); } else { setSelectedLineItemId(item.id || null); setEditingId(null); } }}>
                        <div className="line-item-check">
                          <input type="checkbox" checked={item.id !== undefined && selectedLineItemIds.includes(item.id)} onChange={(e) => { e.stopPropagation(); item.id !== undefined && handleCheckboxChange(item.id); }} />
                        </div>
                        <div className="line-item-content">
                          <div className="line-item-title">Line No. #{index + 1}</div>
                          <div className="line-item-details">
                            <span className="detail-label">{item.venue}</span>
                            <span className="detail-value">{item.supplier}</span>
                          </div>
                        </div>
                        <div className="line-item-actions">
                          <button
                            className="btn-edit-sm"
                            title="Edit line item"
                            onClick={(e) => {
                              e.stopPropagation();

                              if (editingId !== null && editingId !== item.id) {
                                setPendingSwitchId(item.id || null);
                                setShowSwitchConfirm(true);
                                return;
                              }
                              const itemToEdit = lineItems.find(l => l.id === item.id);
                              if (!itemToEdit) return;

                              setFormData({
                                venue: itemToEdit.venue || '',
                                supplier: itemToEdit.supplier || '',
                                description: itemToEdit.description || '',
                                amount: itemToEdit.amount || '',
                                costCenter: itemToEdit.costCenter || '',
                                companyCode: itemToEdit.companyCode || '',
                                shipToPlant: itemToEdit.shipToPlant || '',
                                billTo: itemToEdit.billTo || '',
                                purchaseOrg: itemToEdit.purchaseOrg || '',
                                purchaseGroup: itemToEdit.purchaseGroup || '',
                                currency: itemToEdit.currency || 'AED',
                                deliveryTo: itemToEdit.deliveryTo || '',
                                materialcode: itemToEdit.materialcode || '',
                                taxCode: itemToEdit.taxCode || '',
                                needBy: itemToEdit.needBy || getTodayDate(),
                                contract: itemToEdit.contract || null,
                                glAccount: itemToEdit.glAccount || '',
                                uom: itemToEdit.uom || '',
                                autoInvoice: itemToEdit.autoInvoice ?? false,
                                quantity: itemToEdit.quantity || '',
                                autoGRN: itemToEdit.autoGRN ?? true,
                                comments: itemToEdit.comments || '',
                                invoiceId: itemToEdit.invoiceId || '',
                                invoiceDate: itemToEdit.invoiceDate || '',
                                invoiceComments: itemToEdit.invoiceComments || '',
                                vendorId: itemToEdit.vendorId || '',
                                taxInclude: itemToEdit.taxInclude ?? false,
                                title: itemToEdit.title || '',
                              });

                              setInvoiceAttachments(itemToEdit.invoiceAttachments ? [...itemToEdit.invoiceAttachments] : []);

                              setEditingId(item.id || null);
                              setSelectedLineItemId(item.id || null);

                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button className="btn-delete-sm" title="Delete" onClick={(e) => { e.stopPropagation(); item.id !== undefined && handleDelete(item.id); }}><FaTrash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bulk-upload-section">
                  <input type="file" ref={excelInputRef} accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} className="excel-file-input" />
                  <button type="button" className="btn btn-bulk-upload-sm" onClick={() => excelInputRef.current?.click()} disabled={isUploadingExcel}>
                    <FaUpload /> {isUploadingExcel ? 'Uploading...' : 'Bulk Upload'}
                  </button>
                </div>
              </div>

              {/* RIGHT: form */}
              <div className="pr-right-panel">
                <div className="form-scroll-container">

                  {/* Main fields grid */}
                  <div className="form-grid">
                    <SearchableSelect id="venue" name="venue" value={formData.venue} onChange={(value) => handleSelectChange('venue', value)} options={venuesList} placeholder="Select Venue" label="Venue" loading={venueLoading} onSearch={handleVenueSearch} onLoadMore={handleLoadMoreVenues} hasMore={hasMoreVenues} />
                    <SearchableSelect id="supplier" name="supplier" value={formData.supplier} onChange={(value) => { const selectedVendor = vendorsList.find(v => `${v.supplierId} - ${v.supplierName}` === value); setFormData(prev => ({ ...prev, supplier: value, vendorId: selectedVendor ? selectedVendor.supplierId : '' })); }} options={vendorsList.map(v => `${v.supplierId} - ${v.supplierName}`)} placeholder="Select Supplier" label="Supplier" loading={vendorLoading} onSearch={handleVendorSearch} onLoadMore={handleLoadMoreVendors} hasMore={hasMoreVendors} />
                    <SearchableSelect
                      id="materialcode"
                      name="materialcode"
                      value={formData.materialcode ? (materialsList.find(m => m.materialCode === formData.materialcode) ? `${formData.materialcode} - ${materialsList.find(m => m.materialCode === formData.materialcode)?.description}` : formData.materialcode) : ''}
                      onChange={async (value) => {
                        const code = value.split(' - ')[0];
                        setFormData(prev => ({ ...prev, materialcode: code }));
                        try {
                          const res = await getLegalMaterialDetails(code);
                          if (res && res.glAccount) {
                            setFormData(prev => ({ ...prev, glAccount: res.glAccount }));
                          }
                        } catch (error) {
                        }
                      }}
                      options={materialsList.map(m => `${m.materialCode} - ${m.description}`)}
                      placeholder="Select Material Code"
                      label="Material Code"
                      loading={materialLoading}
                      onSearch={handleMaterialSearch}
                      onLoadMore={handleLoadMoreMaterials}
                      hasMore={hasMoreMaterials}
                    />
                    {/* Row 4: Quantity */}
                    <div className="form-group">
                      <label htmlFor="quantity">Quantity *</label>
                      <input type="text" id="quantity" name="quantity" value={formData.quantity} onChange={handleInputChange} onKeyPress={(e) => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); }} placeholder="Enter quantity" className="form-input form-input-consistent-border-font" inputMode="decimal" />
                    </div>

                    {/* Row 5: Amount & Automation Settings */}
                    <div className="form-group">
                      <div className="amount-label-wrapper">
                        <label htmlFor="amount" className="amount-label">Amount *</label>
                        <span className="amount-tax-toggle">
                          <input type="checkbox" id="taxInclude" checked={formData.taxInclude} onChange={handleAddTaxToggle} className="tax-checkbox" />
                          <label htmlFor="taxInclude" className="tax-label">Inc. Tax</label>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          id="amount"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          onKeyPress={(e) => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); }}
                          placeholder="Enter amount"
                          className="form-input form-input-consistent-border-font"
                          inputMode="decimal"
                        />
                        <div style={{ width: '120px', flexShrink: 0 }}>
                          <SearchableSelect
                            id="currency"
                            name="currency"
                            value={formData.currency || 'AED'}
                            onChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                            options={currenciesList}
                            placeholder="Currency"
                            label=""
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="needBy">Need by Date *</label>
                      <input
                        type="date"
                        id="needBy"
                        name="needBy"
                        value={formData.needBy}
                        onChange={handleInputChange}
                        className="form-input form-input-consistent-border-font"
                        min={getTodayDate()}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="title">Title *</label>
                      <div style={{ position: 'relative' }}>
                        <textarea
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Enter title"
                          className="form-input form-textarea"
                          maxLength={128}
                          rows={2}
                          readOnly={lineItems.length > 0 && (editingId === null || editingId !== lineItems[0]?.id)}
                          style={{
                            backgroundColor: (lineItems.length > 0 && (editingId === null || editingId !== lineItems[0]?.id)) ? '#f5f5f5' : 'white',
                            cursor: (lineItems.length > 0 && (editingId === null || editingId !== lineItems[0]?.id)) ? 'not-allowed' : 'text'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#888', position: 'absolute', right: '10px', bottom: '-15px' }}>
                          {formData.title.length}/128
                        </span>
                      </div>
                    </div>
                    {/* Row: Need By & Comments side-by-side */}
                    <div className="form-group">
                      <label htmlFor="description">Description *</label>
                      <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Enter description" className="form-input form-textarea" rows={3} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="comments">Comments</label>
                      <textarea
                        id="comments"
                        name="comments"
                        value={formData.comments}
                        onChange={handleCommentChange}
                        placeholder="Enter comment (no special characters allowed)"
                        className="form-input form-textarea"
                        rows={3}
                      />
                      {formData.comments && !validateComment(formData.comments) && (
                        <span style={{ fontSize: '11px', color: '#dc2626', display: 'block', marginTop: '4px' }}>
                          ⚠ Special characters are not allowed
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Auto GRN</label>
                      <div className="toggle-container">
                        <button
                          type="button"
                          onClick={handleAutoGRNToggle}
                          className={`toggle-button ${formData.autoGRN ? 'active' : ''}`}
                        >
                          <span className="toggle-slider"></span>
                        </button>
                        <span className="toggle-label">{formData.autoGRN ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Auto Invoice</label>
                      <div className="toggle-container">
                        <button
                          type="button"
                          onClick={handleAutoInvoiceToggle}
                          className={`toggle-button ${formData.autoInvoice ? 'active' : ''} ${!formData.autoGRN ? 'toggle-disabled' : ''}`}
                          disabled={!formData.autoGRN}
                        >
                          <span className="toggle-slider"></span>
                        </button>
                        <span className="toggle-label">{formData.autoInvoice ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>


                    {formData.autoInvoice && (
                      <div className="form-group full-width">
                        <label className="ocr-proceed-label">
                          <input type="checkbox" checked={ocrProceed} onChange={(e) => setOcrProceed(e.target.checked)} className="ocr-checkbox" />
                          <span>Applicable for all lineitems</span>
                        </label>
                      </div>
                    )}
                  </div>


                  {/* Invoice details — only shown when autoInvoice is on */}
                  {formData.autoInvoice && (
                    <div className="invoice-details-section">
                      <h3>Invoice Details</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="invoiceId">Invoice ID *</label>
                          <input
                            type="text"
                            id="invoiceId"
                            name="invoiceId"
                            value={formData.invoiceId}
                            onChange={handleInputChange}
                            maxLength={16}
                            placeholder="Enter invoice ID"
                            className="form-input form-input-consistent-border-font"
                            aria-invalid={invoiceIdError ? 'true' : 'false'}
                          />
                          {invoiceIdError && (
                            <div className='Invoice-error'>{invoiceIdError}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="invoiceDate">Invoice Date *</label>
                          <input type="date" id="invoiceDate" name="invoiceDate" value={formData.invoiceDate} onChange={handleInputChange} className="form-input form-input-consistent-border-font" min="2000-01-01" />
                        </div>
                        <div className="form-group invoice-comments-full">
                          <label htmlFor="invoiceComments">Invoice Comments</label>
                          <textarea
                            id="invoiceComments"
                            name="invoiceComments"
                            value={formData.invoiceComments}
                            onChange={handleInvoiceCommentChange}
                            placeholder="Enter invoice comments (no special characters allowed)"
                            className="form-input form-textarea"
                            rows={2}
                          />
                          {formData.invoiceComments && !validateComment(formData.invoiceComments) && (
                            <span style={{ fontSize: '11px', color: '#dc2626', display: 'block', marginTop: '4px' }}>
                              ⚠ Special characters are not allowed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {formData.autoInvoice ? (
                    <div className="attachments-grid compact-attachments">
                      {/* PR Attachment */}
                      <div className="attachments-section compact-attachment">
                        <div className="attachment-header-row">
                          <div className="label-and-icon">
                            <label className="attachment-section-label">PR Attachment</label>
                            <label
                              htmlFor="file-upload"
                              className="attachment-icon-only"
                              title="Click to add PR attachment(s)"
                            >
                              <FaPaperclip />
                              <input
                                type="file"
                                id="file-upload"
                                name="attachments"
                                multiple
                                onChange={handleFileChange}
                                className="file-input-hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {attachments.length > 0 && (
                          <div className="attached-files-chips">
                            {attachments.map((file, index) => (
                              <div key={index} className="file-chip">
                                <span
                                  className="file-chip-name"
                                  title={file.name}
                                  onClick={() => handleViewFile(file)}
                                >
                                  {truncateFileName(file.name, 24)}
                                </span>
                                <button
                                  type="button"
                                  className="chip-remove-btn"
                                  onClick={() => removeAttachment(index)}
                                  title="Remove file"
                                >
                                  <FaTimes size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Invoice Attachment */}
                      <div className="invoice-attachments-section compact-attachment">
                        <div className="attachment-header-row">
                          <div className="label-and-icon">
                            <label className="attachment-section-label">Invoice Attachment</label>
                            <label
                              htmlFor="invoice-file-upload"
                              className="attachment-icon-only"
                              title="Click to add invoice attachment(s)"
                            >
                              <FaPaperclip />
                              <input
                                type="file"
                                id="invoice-file-upload"
                                name="invoiceAttachments"
                                accept=".pdf,.png,.jpg,.jpeg,.jpe,.jfif,.gif,.tiff"
                                multiple
                                onChange={handleInvoiceFileChange}
                                className="file-input-hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {invoiceAttachments.length > 0 && (
                          <div className="attached-files-chips">
                            {invoiceAttachments.map((file, index) => (
                              <div key={index} className="file-chip">
                                <span
                                  className="file-chip-name"
                                  title={file.name}
                                  onClick={() => handleViewFile(file)}
                                >
                                  {truncateFileName(file.name, 24)}
                                </span>
                                <button
                                  type="button"
                                  className="chip-remove-btn"
                                  onClick={() => removeInvoiceAttachment(index)}
                                  title="Remove file"
                                >
                                  <FaTimes size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Non-autoInvoice case — only PR Attachment
                    <div className="attachments-section compact-attachment">
                      <div className="attachment-header-row">
                        <div className="label-and-icon">
                          <label className="attachment-section-label">PR Attachment</label>
                          <label
                            htmlFor="file-upload-pr"
                            className="attachment-icon-only"
                            title="Click to add PR attachment(s)"
                          >
                            <FaPaperclip />
                            <input
                              type="file"
                              id="file-upload-pr"
                              name="attachments"
                              multiple
                              onChange={handleFileChange}
                              className="file-input-hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {attachments.length > 0 && (
                        <div className="attached-files-chips">
                          {attachments.map((file, index) => (
                            <div key={index} className="file-chip">
                              <span
                                className="file-chip-name"
                                title={file.name}
                                onClick={() => handleViewFile(file)}
                              >
                                {truncateFileName(file.name, 24)}
                              </span>
                              <button
                                type="button"
                                className="chip-remove-btn"
                                onClick={() => removeAttachment(index)}
                                title="Remove file"
                              >
                                <FaTimes size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add / Update / Cancel actions */}
                  <div className="form-bottom-actions">
                    {editingId === null ? (
                      <button type="button" onClick={handleAddLineItem} className="btn btn-add-lineitem">+ Add Line Item</button>
                    ) : (
                      <>
                        <button type="button" onClick={handleCancelEdit} className="btn btn-cancel-edit">Cancel</button>
                        <button type="button" onClick={handleAddLineItem} className="btn btn-update-lineitem">✓ Update Line Item</button>
                      </>
                    )}
                  </div>

                </div>{/* /form-scroll-container */}
              </div>{/* /pr-right-panel */}

            </div>{/* /pr-content-wrapper */}
          </div>{/* /pr-entertainment-container */}

          {/* Footer bar */}
          <div className="pr-footer-buttons summary-font-family">
            <button type="button" onClick={handleValidate} className="btn btn-validate" disabled={(lineItems || []).length === 0}>Validate</button>
            <button type="button" onClick={handleSaveAsDraft} className="btn btn-savedraft" disabled={!isDraftEnabled}>Save as Draft</button>
            <button onClick={handleSubmitRequisition} className={`btn ${lineItems.length === 0 || submitReqDisable ? 'btn-submit-requisition-disabled' : 'btn-submit-requisition'}`} disabled={lineItems.length === 0 || submitReqDisable}>Submit PR</button>
          </div>
        </>
      } />
    </Routes>
  );
};

export default Legal;