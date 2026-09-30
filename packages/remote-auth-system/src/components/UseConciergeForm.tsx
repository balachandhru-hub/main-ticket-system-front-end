import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useManualBlocker } from '../hooks/useManualBlocker';
import { toast, type TypeOptions } from 'react-toastify';
import type {
    PRMode,
    PRApiConfig,
    Supplier,
    AnyFormData,
    AnyLineItem,
    ServiceLineItem,
} from '../Dto/ConciergeTpesDto';
import {
    extractCode,
    extractVendorCode,
    extractVendorCodes,
    convertFileToBase64,
    getResetFormState,
    formatDateForInput,
} from './ConciergeUtil';
import { fetchSuppliers, getPRSmartDefaults } from '../api/prEntertainmentApi';
import type { ConciergeAssetDto, CreateConciergePRPayload } from '../api/ConciergeprApi';

type ToastType = TypeOptions;
declare global {
    interface Window {
        hasUnsavedChanges?: boolean;
        savePRDraft?: () => Promise<void>;
    }
}

interface UseConciergeFormOptions {
    mode: PRMode;
    apiConfig: PRApiConfig;
    userId?: string;
    exitConfirmed?: boolean;
    onResetExitFlag?: () => void;
    onBack?: () => void;
    onModeChange?: (mode: PRMode) => void;
}

export const useConciergeForm = ({
    mode,
    apiConfig,
    userId,
    exitConfirmed,
    onResetExitFlag,
    onBack,
    onModeChange,
}: UseConciergeFormOptions) => {
    // ── Toast ──────────────────────────────────────────────────────────────
    const showToast = (message: React.ReactNode, type: ToastType, duration = 3000) => {
        toast(message, { type, autoClose: duration });
    };

    // ── Navigation ─────────────────────────────────────────────────────────
    const navigate = useNavigate();
    const location = useLocation();

    const currentViewMode = (() => {
        const path = location.pathname;
        if (path.endsWith('/summary')) return 'summary';
        if (path.endsWith('/edit')) return 'edit';
        if (path.endsWith('/draft')) return 'draft';
        return 'form';
    })();

    // ── Form State ─────────────────────────────────────────────────────────
    const initialForm = getResetFormState(mode);
    const [formData, setFormData] = useState<AnyFormData>(initialForm);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [invoiceAttachments, setInvoiceAttachments] = useState<File[]>([]);
    const [invoiceIdError, setInvoiceIdError] = useState<string>('');
    const [lineItems, setLineItems] = useState<AnyLineItem[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedLineItemId, setSelectedLineItemId] = useState<number | null>(null);
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [selectedLineItemIds, setSelectedLineItemIds] = useState<number[]>([]);
    const [nextId, setNextId] = useState(1);
    const [ocrProceed, setOcrProceed] = useState(false);
    const [submitReqDisable, setSubmitReqDisable] = useState(false);
    const [targetPrNumber, setTargetPrNumber] = useState<string | null>(null);
    const [isDraft, setIsDraft] = useState(false);
    const [isCopyMode, setIsCopyMode] = useState(false);
    const [isDraftCopyMode, setIsDraftCopyMode] = useState(false);
    const [originalCopyData, setOriginalCopyData] = useState<any>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [editingValidationIds, setEditingValidationIds] = useState<number[]>([]);
    const [lineItemsSnapshot, setLineItemsSnapshot] = useState<AnyLineItem[]>([]);
    const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
    const [pendingSwitchId, setPendingSwitchId] = useState<number | null>(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [invoicePdfMapping, setInvoicePdfMapping] = useState<{ [lineItemNumber: number]: File[] }>({});
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'path' | 'mode', value: string } | null>(null);
    const [isProceeding, setIsProceeding] = useState(false);

    // ── Vendor / Venue state ───────────────────────────────────────────────
    const [vendorLoading, setVendorLoading] = useState(false);
    const [vendorsList, setVendorsList] = useState<Supplier[]>([]);
    const [hasMoreVendors, setHasMoreVendors] = useState(true);
    const [currentVendorIndex, setCurrentVendorIndex] = useState(0);
    const [vendorSearch, setVendorSearch] = useState('');

    const [venueLoading, setVenueLoading] = useState(false);
    const [venuesList, setVenuesList] = useState<string[]>([]);
    const [hasMoreVenues, setHasMoreVenues] = useState(true);
    const [currentVenueIndex, setCurrentVenueIndex] = useState(0);
    const [venueSearch, setVenueSearch] = useState('');

    const excelInputRef = useRef<HTMLInputElement | null>(null);
    const lastSearchedSupplierRef = useRef<string | null>(null);
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
    // Consider the form dirty only when fields differ from the reset/default state
    const resetBase = getResetFormState(mode) as AnyFormData;
    const hasNonDefaultField = ['venue', 'supplier', 'amount', 'description'].some(key => {
        const curr = (formData as any)[key];
        const def = (resetBase as any)[key];
        return (curr ?? '') !== (def ?? '');
    });
    const isDraftEnabled = lineItems.length > 0 || hasNonDefaultField;

    const isDirty = !isProceeding && (lineItems.length > 0 || isDraftEnabled);
    useEffect(() => {
        window.hasUnsavedChanges = isDirty;
        return () => {
            window.hasUnsavedChanges = false;
        };
    }, [isDirty]);

    useManualBlocker({
        when: isDirty,
        onBlock: (target) => {
            if (target) setPendingAction({ type: 'path', value: target });
            setShowExitModal(true);
        }
    });

    const handleManualProceed = useCallback(() => {
        setIsProceeding(true);
        setShowExitModal(false);

        // Use a timeout to ensure state update propagates before action
        setTimeout(() => {
            if (pendingAction) {
                if (pendingAction.type === 'path') {
                    navigate(pendingAction.value, { replace: true });
                } else if (pendingAction.type === 'mode' && onModeChange) {
                    onModeChange(pendingAction.value as PRMode);
                }
                setPendingAction(null);
            } else if (onBack) {
                onBack();
            } else {
                navigate(-1);
            }
        }, 0);
    }, [pendingAction, navigate, onBack, onModeChange]);

    const handleManualNavigate = useCallback((to: string) => {
        if (isDirty) {
            setPendingAction({ type: 'path', value: to });
            setShowExitModal(true);
        } else {
            navigate(to, { replace: true });
        }
    }, [isDirty, navigate]);

    const handleManualModeChange = useCallback((newMode: PRMode) => {
        if (isDirty) {
            setPendingAction({ type: 'mode', value: newMode });
            setShowExitModal(true);
        } else {
            onModeChange?.(newMode);
        }
    }, [isDirty, onModeChange]);

    // ── Vendors ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (selectedLineItemId !== null && editingId === null) {
            const item = lineItems.find(i => i.id === selectedLineItemId);
            if (item) {
                setFormData({
                    ...getResetFormState(mode),
                    ...item,
                } as AnyFormData);
                if (item.invoiceAttachments) setInvoiceAttachments(item.invoiceAttachments);
            }
        }
    }, [selectedLineItemId, editingId, lineItems, mode]);

    // ── Vendors ────────────────────────────────────────────────────────────
    const fetchVendorsData = useCallback(async (index = 0, search = '') => {
        setVendorLoading(true);
        try {
            const response = await fetchSuppliers({ page: index, page_size: 10, ...(search && { search }) });
            if (response?.suppliers) {
                if (response.suppliers.length === 0) { setHasMoreVendors(false); return; }
                if (index === 0) {
                    setVendorsList(search === ''
                        ? prev => { const ids = new Set(response.suppliers.map((s: any) => s.supplierId)); return [...response.suppliers, ...prev.filter(p => !ids.has(p.supplierId))]; }
                        : response.suppliers
                    );
                } else {
                    setVendorsList(prev => { const ids = new Set(prev.map(v => v.supplierId)); return [...prev, ...response.suppliers.filter((v: any) => !ids.has(v.supplierId))]; });
                }
                setHasMoreVendors(true);
            } else {
                setHasMoreVendors(false);
            }
        } catch (err: any) {
            if (err?.status === 401) return;
            if (index === 0) setVendorsList([]);
            setHasMoreVendors(false);
        } finally {
            setVendorLoading(false);
        }
    }, []);

    const handleVendorSearch = useCallback((search: string) => {
        setVendorSearch(search);
        setCurrentVendorIndex(0);
        setHasMoreVendors(true);
        fetchVendorsData(0, search);
    }, [fetchVendorsData]);

    const handleLoadMoreVendors = useCallback(() => {
        if (hasMoreVendors && !vendorLoading) {
            const next = currentVendorIndex + 10;
            setCurrentVendorIndex(next);
            fetchVendorsData(next, vendorSearch);
        }
    }, [currentVendorIndex, hasMoreVendors, vendorSearch, fetchVendorsData, vendorLoading]);

    useEffect(() => { fetchVendorsData(0, ''); }, [fetchVendorsData]);

    useEffect(() => {
        const sup = formData.supplier;
        if (sup && !sup.includes(' - ')) {
            const matched = vendorsList.find(v => v.supplierId === sup);
            if (matched) {
                setFormData(prev => ({ ...prev, supplier: `${matched.supplierId} - ${matched.supplierName}` }));
                lastSearchedSupplierRef.current = null;
            } else if (lastSearchedSupplierRef.current !== sup) {
                lastSearchedSupplierRef.current = sup;
                fetchVendorsData(0, sup);
            }
        }
    }, [formData.supplier, vendorsList, fetchVendorsData]);

    // ── Venues ─────────────────────────────────────────────────────────────
    const fetchVenueData = useCallback(async (index = 0, search = '') => {
        setVenueLoading(true);
        try {
            const response = await apiConfig.fetchVenueName({ page: index, page_size: 10, ...(search && { search }) });
            if (response?.suppliers) {
                if (response.suppliers.length === 0) { setHasMoreVenues(false); return; }
                if (index === 0) setVenuesList(response.suppliers);
                else setVenuesList(prev => [...prev, ...response.suppliers]);
                setHasMoreVenues(true);
            } else {
                setHasMoreVenues(false);
            }
        } catch (err: any) {
            if (err?.status === 401) return;
            if (index === 0) setVenuesList([]);
            setHasMoreVenues(false);
        } finally {
            setVenueLoading(false);
        }
    }, [apiConfig]);

    const handleVenueSearch = useCallback((search: string) => {
        setVenueSearch(search);
        setCurrentVenueIndex(0);
        setHasMoreVenues(true);
        fetchVenueData(0, search);
    }, [fetchVenueData]);

    const handleLoadMoreVenues = useCallback(() => {
        if (hasMoreVenues && !venueLoading) {
            const next = currentVenueIndex + 10;
            setCurrentVenueIndex(next);
            fetchVenueData(next, venueSearch);
        }
    }, [currentVenueIndex, hasMoreVenues, venueSearch, fetchVenueData, venueLoading]);

    useEffect(() => { fetchVenueData(0, ''); }, [fetchVenueData]);

    // ── Smart defaults ─────────────────────────────────────────────────────
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const res = await getPRSmartDefaults();
                if ('companyCode' in res) {
                    setFormData(prev => ({ ...prev, currency: 'AED', deliveryTo: res.deliverTo }));
                }
            } catch (err: any) {
                if (err?.status === 401) return;
            }
        };
        fetchUserInfo();
    }, [userId]);

    // ── Venue details auto-fill ────────────────────────────────────────────
    const handleSelectChange = async (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'venue') {
            try {
                const response = await apiConfig.getVenueDetails({ search: value });
                if (response?.suppliers) {
                    const d = response.suppliers;
                    setFormData(prev => ({
                        ...prev,
                        purchaseOrg: d.purchaseOrg || prev.purchaseOrg,
                        purchaseGroup: d.purchaseGroup || prev.purchaseGroup,
                        glAccount: d.glAccount || prev.glAccount,
                        costCenter: d.costCenter || prev.costCenter,
                        companyCode: d.companyCode || prev.companyCode,
                        shipToPlant: d.shipToPlant || prev.shipToPlant,
                        billTo: d.billTo || prev.billTo,
                        materialcode: d.materialCode || prev.materialcode,
                    }));
                }
            } catch (err: any) {
                if (err?.status === 401) return;
            }
        }
    };

    // ── Input handlers ─────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Invoice ID validation: trim pasted/typed values over 16, show message at limit
        if (name === 'invoiceId') {
            if (value && value.length > 16) {
                const trimmed = value.slice(0, 16);
                setFormData(prev => ({ ...prev, [name]: trimmed }));
                setInvoiceIdError('Invoice ID must be at most 16 characters');
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
                if (value && value.length === 16) setInvoiceIdError('Maximum length reached (16 characters)');
                else setInvoiceIdError('');
            }
            return;
        }

        if ((name === 'needBy' || name === 'invoiceDate' || name === 'serviceStartDate' || name === 'serviceEndDate') && value) {
            if (new Date(value).getFullYear() < 2000) {
                showToast('Date cannot be before year 2000', 'error');
                return;
            }
        }

        if (mode === 'service') {
            const sf = formData as any;
            if (name === 'serviceStartDate' && sf.serviceEndDate && value > sf.serviceEndDate) {
                showToast('Service Start Date cannot be after End Date', 'warning');
            }
            if (name === 'serviceEndDate' && sf.serviceStartDate && value < sf.serviceStartDate) {
                showToast('Service End Date cannot be before Start Date', 'warning');
            }
        }

        if (name === 'amount') {
            const numeric = value.replace(/[^0-9.]/g, '');
            const parts = numeric.split('.');
            const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numeric;
            if (sanitized && !isNaN(parseFloat(sanitized)) && parseFloat(sanitized) < 0) {
                showToast('Amount cannot be negative', 'error');
                return;
            }
            setFormData(prev => ({ ...prev, [name]: sanitized }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ── Toggle handlers ────────────────────────────────────────────────────
    const handleAutoInvoiceToggle = () => {
        setFormData(prev => {
            if (!prev.autoInvoice && !prev.autoGRN) {
                showToast('Auto GRN must be active to enable Auto Invoice', 'warning');
                return prev;
            }
            return { ...prev, autoInvoice: !prev.autoInvoice };
        });
    };

    const handleAutoGRNToggle = () => {
        setFormData(prev => {
            const newAutoGRN = !prev.autoGRN;
            if (!newAutoGRN && prev.autoInvoice) {
                showToast('Auto Invoice has been disabled because Auto GRN was deactivated', 'info');
                return { ...prev, autoGRN: newAutoGRN, autoInvoice: false };
            }
            return { ...prev, autoGRN: newAutoGRN };
        });
    };

    const handleAddTaxToggle = () => setFormData(prev => ({ ...prev, taxInclude: !prev.taxInclude }));

    // Service-only toggle
    const handleAutoSESToggle = () => {
        setFormData(prev => ({ ...prev, autoSES: !(prev as any).autoSES }));
    };

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
                    'Only PDF, PNG, JPG, and JPEG files are allowed for invoice attachments.',
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

    const handleViewFile = (file: File) => {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
    };

    const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));
    const removeInvoiceAttachment = (index: number) => setInvoiceAttachments(prev => prev.filter((_, i) => i !== index));

    

    // ── Checkboxes ─────────────────────────────────────────────────────────
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectAllChecked(e.target.checked);
        if (e.target.checked) setSelectedLineItemIds((lineItems || []).map(item => item.id ?? 0));
        else setSelectedLineItemIds([]);
    };

    const handleCheckboxChange = (id: number) => {
        setSelectedLineItemIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // ── Add / Edit line item ───────────────────────────────────────────────
    const handleAddLineItem = () => {
        if (!formData.venue || !formData.supplier || !formData.amount) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        if (mode === 'material' && !formData.needBy) {
            showToast('Please select a Need By Date', 'warning');
            return;
        }
        const amt = parseFloat(formData.amount);
        if (!formData.amount || isNaN(amt) || amt <= 0) {
            showToast('Amount must be greater than 0', 'error');
            return;
        }

        // Service date validation
        if (mode === 'service') {
            const sf = formData as any;
            if (!sf.serviceStartDate) { showToast('Please enter a Service Start Date', 'warning'); return; }
            if (!sf.serviceEndDate) { showToast('Please enter a Service End Date', 'warning'); return; }
            if (sf.serviceStartDate && sf.serviceEndDate && sf.serviceStartDate > sf.serviceEndDate) {
                showToast('Service End Date must be after Start Date', 'error');
                return;
            }
        }

        if (formData.autoInvoice) {
            if (!formData.invoiceId || !formData.invoiceDate) {
                showToast('Please fill Invoice ID and Invoice Date', 'warning');
                return;
            }
        }
        if (editingId !== null) {
            setLineItems(prev => prev.map(item =>
                item.id === editingId
                    ? { ...formData, id: editingId, invoiceAttachments: [...invoiceAttachments], ocrProceed }
                    : item
            ));
            setEditingId(null);
            showToast('Line item updated successfully!', 'success');
        } else {
            const newItem: AnyLineItem = {
                ...formData,
                id: nextId,
                unitPrice: formData.amount,
                deliveryDate: formData.needBy,
                invoiceAttachments: [...invoiceAttachments],
                ocrProceed,
            };
            setLineItems(prev => [...prev, newItem]);
            setNextId(prev => prev + 1);
            showToast('Line item added successfully!', 'success');
            setOcrProceed(false);
            setFormData(getResetFormState(mode, formData) as AnyFormData);
            setInvoiceAttachments([]);
        }
    };

    const handleDelete = (id: number) => setLineItems(prev => prev.filter(item => item.id !== id));

    const handleCancelEdit = () => {
        setEditingId(null);
        setOcrProceed(false);
        setFormData(getResetFormState(mode, formData) as AnyFormData);
        setInvoiceAttachments([]);
    };

    // ── Validation modal ───────────────────────────────────────────────────
    const handleValidate = () => {
        setShowValidationModal(true);
        setEditingValidationIds([]);
        setLineItemsSnapshot(lineItems.map(item => ({
            ...item,
            invoiceAttachments: item.invoiceAttachments ? [...item.invoiceAttachments] : []
        })));
    };

    const handleValidationItemChange = (id: number, field: string, value: string) => {
        if (field.includes('Date') && value && new Date(value).getFullYear() < 2000) {
            showToast('Date cannot be before year 2000', 'error');
            return;
        }
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSaveValidation = () => {
        if (lineItems.length === 0) { showToast('No line items to submit.', 'warning'); return; }
        if (lineItems.length > 0) {
            const first = lineItems[0];
            setFormData(prev => ({ ...prev, ...first }));
        }
        setEditingValidationIds([]);
        setShowValidationModal(false);
    };

    const handleCancelValidationEdit = () => {
        setLineItems(lineItemsSnapshot);
        setEditingValidationIds([]);
        setShowValidationModal(false);
    };

    const toggleValidationEdit = (id: number) =>
        setEditingValidationIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmitRequisition = async () => {
        if (selectedLineItemIds.length === 0) {
            showToast('Please select at least one line item before submitting', 'warning');
            return;
        }

        const selectedItems = lineItems.filter(item => item.id !== undefined && selectedLineItemIds.includes(item.id!));

        for (const item of selectedItems) {
            if (!item.venue) { showToast('Please select a venue', 'error'); return; }
            if (!item.supplier) { showToast('Please select a supplier', 'error'); return; }
            if (!item.description) { showToast('Please enter a description', 'error'); return; }
            if (!item.amount) { showToast('Please enter an amount', 'error'); return; }
            if (mode === 'material' && !item.needBy) { showToast('Please select a need by date', 'error'); return; }
            if (!item.quantity) { showToast('Please enter a quantity', 'error'); return; }
            // Service-specific validation
            if (mode === 'service') {
                const si = item as ServiceLineItem;
                if (!si.serviceStartDate) { showToast('Service Start Date is required', 'error'); return; }
                if (!si.serviceEndDate) { showToast('Service End Date is required', 'error'); return; }
            }
        }

        const lineItemsDto = await Promise.all(selectedItems.map(async (item, index) => {
            let invoiceAssets: ConciergeAssetDto[] = [];
            if (item.autoInvoice && item.invoiceAttachments?.length) {
                invoiceAssets = await Promise.all(item.invoiceAttachments.map(async (f) => {
                    const base64 = await convertFileToBase64(f);
                    return { fileName: f.name, contentType: f.type, fileBytes: base64, isSingletonAsset: true, entityType: mode === 'service' ? 'INVOICE_PR_SERVICE_ATTACHMENT' : 'INVOICE_TYPE_PRATTACHMENT', assetType: mode === 'service' ? 'INVOICE_PR_SERVICE_ATTACHMENT' : 'INVOICE_TYPE_PRATTACHMENT' };
                }));
            }

            const vendorCode = await (async () => {
                const sup = item.supplier || '';
                if (sup.includes(' - ')) return extractVendorCode(sup);
                const matched = vendorsList.find(v => v.supplierName.toLowerCase() === sup.toLowerCase() || v.supplierId === sup);
                if (matched) return matched.supplierId;
                try {
                    const res = await fetchSuppliers({ search: sup, page_size: 10 });
                    const exact = res?.suppliers?.find((s: any) => s.supplierName.toLowerCase() === sup.toLowerCase());
                    if (exact) return exact.supplierId;
                } catch (e) { }
                return extractVendorCode(sup);
            })();

            const base: any = {
                NumberInCollection: index + 1,
                Venue: item.venue,
                Description: item.description,
                Quantity: parseInt(item.quantity || '0') || 0,
                UOM: item.uom || '',
                amount: parseFloat(item.amount) || 0,
                Currency: item.currency || '',
                Vendor: vendorCode,
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

            // Service-only fields
            if (mode === 'service') {
                const si = item as ServiceLineItem;
                (base as any).ServiceStartDate = si.serviceStartDate || null;
                (base as any).ServiceEndDate = si.serviceEndDate || null;
                (base as any).AutoSES = si.autoSES ?? false;
                delete base.AutoGRN;
            }

            return base;
        }));

        const assetsDto = await Promise.all(attachments.map(async (file) => {
            const base64 = await convertFileToBase64(file);
            return {
                fileName: file.name,
                contentType: file.type,
                fileBytes: base64,
                isSingletonAsset: true,
                entityType: mode === 'service' ? 'SERVICE_PR_UPLOAD' : 'MATERIAL_PR_UPLOAD',
                assetType: mode === 'service' ? 'SERVICE_PR_UPLOAD' : 'MATERIAL_PR_UPLOAD',
            };
        }));


        const payload: CreateConciergePRPayload = {
            PRRequests: [{
                HeaderComment: formData.comments,
                NeedBy: formData.needBy || new Date().toISOString(),
                isHeader: ocrProceed,
                lineItems: lineItemsDto,
            }],
            asset: assetsDto,
        };
        setSubmitReqDisable(true);
        try {
            const response = await apiConfig.createPR(payload);
            if (response?.statusCode === 200 || response?.statusCode === 201) {
                let message: React.ReactNode = `${lineItemsDto.length} line item(s) submitted successfully!`;
                if ('data' in response && Array.isArray(response.data)) {
                    message = (
                        <div>
                            <div>{lineItemsDto.length} line item(s) submitted successfully!</div>
                            {response.data.map((item: any, i: number) => (
                                <div key={i}>
                                    <span onClick={() => handleNavigateToPr(item.prNumber)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{item.prNumber}</span>
                                    {' - '}{item.status}
                                </div>
                            ))}
                        </div>
                    );
                }
                showToast(message, 'success', 60000);
                setFormData(getResetFormState(mode) as AnyFormData);
                setSelectedLineItemIds([]);
                setLineItems([]);
                setAttachments([]);
                setInvoiceAttachments([]);
                setInvoicePdfMapping({});
                setSelectAllChecked(false);
            } else {
                showToast('PR creation failed: ' + (response?.message || 'Unknown error'), 'error');
                saveDraft(); // fallback to draft
            }
        } catch (error) {
            showToast('An error occurred while submitting the requisition. Fallback to draft saving.', 'error');
            saveDraft(); // fallback to draft
        } finally {
            setSubmitReqDisable(false);
            setSelectedLineItemId(null);
            setIsDraft(false);
            setEditingId(null);
            setIsCopyMode(false);
            setOriginalCopyData(null);
            setOcrProceed(false);
            setSelectAllChecked(false);
            setFormData(getResetFormState(mode) as AnyFormData);
        }
    };

    // ── Save as Draft ──────────────────────────────────────────────────────
    const handleSaveAsDraft = () => setIsDraft(true);

    const saveDraft = useCallback(async () => {
        try {
            const hasFormData = formData.venue || formData.supplier || formData.amount;
            if (lineItems.length === 0 && !hasFormData) { if (onResetExitFlag) onResetExitFlag(); return; }

            let itemsToSave: AnyLineItem[] = lineItems.length > 0 ? [...lineItems] : [{ ...formData, id: 1, invoiceAttachments: [...invoiceAttachments] }];

            const lineItemsDto = await Promise.all(itemsToSave.map(async (item, index) => {
                let invoiceAssets: any[] = [];
                if (item.autoInvoice && item.invoiceAttachments?.length) {
                    invoiceAssets = await Promise.all(item.invoiceAttachments.map(async (f) => {
                        const base64 = await convertFileToBase64(f);
                        return { fileName: f.name, contentType: f.type, fileBytes: base64, isSingletonAsset: true, entityType: mode === 'service' ? 'INVOICE_PR_SERVICE_ATTACHMENT' : 'INVOICE_TYPE_PRATTACHMENT', assetType: mode === 'service' ? 'INVOICE_PR_SERVICE_ATTACHMENT' : 'INVOICE_TYPE_PRATTACHMENT' };
                    }));
                }

                const base: any = {
                    NumberInCollection: index + 1,
                    Venue: item.venue,
                    Description: item.description,
                    Quantity: parseInt(item.quantity || '0') || 0,
                    UOM: item.uom || 'EA',
                    amount: parseFloat(item.amount) || 0,
                    Currency: item.currency || 'AED',
                    Vendor: item.vendorId || extractVendorCode(item.supplier),
                    Contract: extractCode(item.contract) || null,
                    PurchaseOrg: item.purchaseOrg,
                    GLAccount: item.glAccount,
                    CostCenter: extractCode(item.costCenter),
                    MaterialCode: item.materialcode,
                    NeedBy: item.needBy,
                    TaxCode: item.taxCode,
                    AutoGRN: item.autoGRN,
                    TaxInclude: item.taxInclude || false,
                    VendorName: extractVendorCodes(item.supplier),
                    AutoInvoices: item.autoInvoice,
                    InvoiceID: item.invoiceId || null,
                    InvoiceDate: item.autoInvoice ? item.invoiceDate || null : null,
                    InvoiceComment: item.autoInvoice ? item.invoiceComments || null : null,
                    InvoiceAttachment: item.autoInvoice ? invoiceAssets : null,
                };
                return base;
            }));

            const assetsDto = await Promise.all(attachments.map(async (f) => {
                const base64 = await convertFileToBase64(f);
                return { fileName: f.name, contentType: f.type, fileBytes: base64, isSingletonAsset: true, entityType: mode === 'service' ? 'SERVICE_PR_UPLOAD' : 'MATERIAL_PR_UPLOAD', assetType: mode === 'service' ? 'SERVICE_PR_UPLOAD' : 'MATERIAL_PR_UPLOAD' };
            }));

            const payload: CreateConciergePRPayload = {
                PRRequests: [{
                    HeaderComment: formData.comments,
                    NeedBy: formData.needBy || new Date().toISOString(),
                    isHeader: ocrProceed,
                    lineItems: lineItemsDto
                }],
                asset: assetsDto
            };
            const response = await apiConfig.createDraft(payload);

            if (response?.statusCode === 200 || response?.statusCode === 201) {
                showToast(`Draft saved with ${lineItemsDto.length} line item(s)`, 'success', 2000);
                setIsCopyMode(false);
                setIsDraftCopyMode(false);
                setOriginalCopyData(null);
            } else {
                showToast('Failed to save draft: ' + (response?.message || 'Unknown error'), 'error');
            }
        } catch {
            showToast('An error occurred while saving the draft.', 'error');
        } finally {
            setIsDraft(false);
            if (onResetExitFlag) onResetExitFlag();
        }
    }, [lineItems, formData, invoiceAttachments, attachments, nextId, onResetExitFlag, isCopyMode, editingId, mode, apiConfig]);
    useEffect(() => {
        window.savePRDraft = saveDraft;
        return () => {
            window.savePRDraft = undefined;
        };
    }, [saveDraft]);

    // ── Excel upload ───────────────────────────────────────────────────────
    const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingExcel(true);
        try {
            const response = await apiConfig.uploadExcelDraft(file) as any;
            if (response?.statusCode && response.statusCode !== 200 && response.statusCode !== 201) {
                showToast('Failed to upload Excel: ' + (response.message || 'Unknown error'), 'error');
                if (excelInputRef.current) excelInputRef.current.value = '';
                return;
            }
            const successCount = response?.successfulUploads ?? 0;
            const failedCount = response?.failedUploads ?? 0;
            const totalRows = response?.totalRows ?? (successCount + failedCount);
            if (successCount > 0) {
                showToast(`Excel uploaded: ${successCount} successful, ${failedCount} failed (total ${totalRows}).`, 'success', 4000);
                navigate('draft', { replace: true });
            } else {
                showToast('Upload finished with no successful rows: ' + (response?.message || 'Unknown error'), 'error', 6000);
            }
        } catch {
            showToast('An error occurred while uploading the Excel file.', 'error');
        } finally {
            setIsUploadingExcel(false);
            if (excelInputRef.current) excelInputRef.current.value = '';
        }
    };

    // ── Navigate ───────────────────────────────────────────────────────────
    const handleNavigateToPr = (prNumber: string) => {
        setTargetPrNumber(prNumber);
        navigate('summary', { replace: true });
    };

    const handleNavigateBack = () => {
        if (isDirty) setShowExitModal(true);
        else if (onBack) onBack();
        else navigate(-1);
    };

    const handleBack = () => {
        navigate('..', { relative: 'path', replace: true });
        setTargetPrNumber(null);
    };

    // ── Auto-description ───────────────────────────────────────────────────
    useEffect(() => {
        if (isCopyMode && originalCopyData) {
            const parts = [formData.venue, extractVendorCodes(formData.supplier), formData.needBy].filter(Boolean);
            if (!isDraftCopyMode) parts.push('(Copy)');
            const newDesc = parts.join('-');
            if (formData.description !== newDesc) setFormData(prev => ({ ...prev, description: newDesc }));
        } else if (!isCopyMode) {
            const parts = [formData.venue, extractVendorCodes(formData.supplier), formData.needBy].filter(Boolean);
            const newDesc = parts.join(' - ');
            if (newDesc && formData.description !== newDesc && (formData.venue || formData.supplier)) {
                setFormData(prev => ({ ...prev, description: newDesc }));
            }
        }
    }, [formData.venue, formData.supplier, formData.needBy, isCopyMode, isDraftCopyMode, originalCopyData, editingId]);

    // ── Draft / exit triggers ──────────────────────────────────────────────
    useEffect(() => { if (exitConfirmed || isDraft) saveDraft(); }, [exitConfirmed, isDraft, saveDraft]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (!submitReqDisable) handleSaveAsDraft(); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [submitReqDisable]);

    // ── Copy from Summary ──────────────────────────────────────────────────
    const handleCopyFromSummary = useCallback((data: any) => {
        const apiLineItems: any[] = data.lineItems || data.LineItems || [];
        const resetBase = getResetFormState(mode);

        const mapped: AnyLineItem[] = apiLineItems.map((li: any, idx: number) => ({
            ...resetBase,
            id: idx + 1,
            venue: li.venue || li.Venue || '',
            supplier: li.vendorName
                ? `${li.vendor || li.Vendor || ''} - ${li.vendorName}`
                : li.vendor || li.Vendor || '',
            vendorId: li.vendor || li.Vendor || '',
            description: li.description || li.Description || '',
            amount: String(li.amount || li.Price || li.price || ''),
            quantity: String(li.quantity || li.Quantity || '1'),
            uom: li.uom || li.UOM || 'EA',
            needBy: formatDateForInput(li.needBy || li.NeedBy || resetBase.needBy),
            currency: li.currency || li.Currency || 'AED',
            purchaseOrg: li.purchaseOrg || li.PurchaseOrg || '',
            purchaseGroup: li.purchaseGroup || li.PurchaseGroup || '',
            glAccount: li.glAccount || li.GLAccount || '',
            costCenter: li.costCenter || li.CostCenter || '',
            companyCode: li.companyCode || li.CompanyCode || '',
            shipToPlant: li.shipToPlant || li.ShipToPlant || '',
            billTo: li.billTo || li.BillTo || '',
            materialcode: li.materialCode || li.MaterialCode || li.materialcode || '',
            contract: li.contract || li.Contract || null,
            taxCode: li.taxCode || li.TaxCode || '',
            taxInclude: li.taxInclude ?? li.TaxInclude ?? false,
            autoGRN: li.autoGRN ?? li.AutoGRN ?? true,
            autoInvoice: li.autoInvoices ?? li.AutoInvoices ?? false,
            invoiceId: '',
            invoiceDate: '',
            invoiceComments: '',
            invoiceAttachments: [],
            comments: data.headerComment || data.HeaderComment || '',
            deliveryTo: li.deliveryTo || li.DeliveryTo || '',
            // Service-specific
            ...(mode === 'service' && {
                serviceStartDate: formatDateForInput(li.serviceStartDate || li.ServiceStartDate || ''),
                serviceEndDate: formatDateForInput(li.serviceEndDate || li.ServiceEndDate || ''),
                autoSES: li.autoSES ?? li.AutoSES ?? true,
            }),
        }));

        if (mapped.length === 0) return;

        setLineItems(mapped);
        setNextId(mapped.length + 1);
        setFormData({ ...mapped[0] } as any);
        setSelectedLineItemId(mapped[0].id || null);
        setEditingId(null);
        setIsCopyMode(true);
        setIsDraftCopyMode(false);
        setOriginalCopyData(data);
        setAttachments([]);
        setInvoiceAttachments([]);
        navigate('..', { relative: 'path' });   // back to the form root
    }, [mode, navigate]);

    // ── Copy from Draft ────────────────────────────────────────────────────
    const handleCopyFromDraft = useCallback((data: any) => {
        const apiLineItems: any[] = data.lineItems || [];
        const resetBase = getResetFormState(mode);

        const mapped: AnyLineItem[] = apiLineItems.map((li: any, idx: number) => ({
            ...resetBase,
            id: idx + 1,
            venue: li.venue || '',
            supplier: li.vendorName
                ? `${li.vendor || ''} - ${li.vendorName}`
                : li.vendor || '',
            vendorId: li.vendor || '',
            description: li.description || '',
            amount: String(li.amount || ''),
            quantity: String(li.quantity || '1'),
            uom: li.uom || 'EA',
            needBy: formatDateForInput(li.needBy || resetBase.needBy),
            currency: li.currency || 'AED',
            purchaseOrg: li.purchaseOrg || '',
            purchaseGroup: li.purchaseGroup || '',
            glAccount: li.glAccount || '',
            costCenter: li.costCenter || '',
            companyCode: li.companyCode || '',
            shipToPlant: li.shipToPlant || '',
            billTo: li.billTo || '',
            materialcode: li.materialCode || li.materialcode || '',
            contract: li.contract || null,
            taxCode: li.taxCode || '',
            taxInclude: li.taxInclude ?? false,
            autoGRN: li.autoGRN ?? true,
            autoInvoice: li.autoInvoices ?? false,
            invoiceId: '',
            invoiceDate: '',
            invoiceComments: '',
            invoiceAttachments: li.invoiceAttachmentFiles || [],
            comments: data.headerComment || '',
            deliveryTo: li.deliveryTo || '',
            ...(mode === 'service' && {
                serviceStartDate: formatDateForInput(li.serviceStartDate || ''),
                serviceEndDate: formatDateForInput(li.serviceEndDate || ''),
                autoSES: li.autoSES ?? false,
            }),
        }));

        if (mapped.length === 0) return;

        const headerFiles: File[] = data.headerAttachmentFiles || [];
        setLineItems(mapped);
        setNextId(mapped.length + 1);
        setFormData({ ...mapped[0] } as any);
        setSelectedLineItemId(mapped[0].id || null);
        setEditingId(null);
        setIsCopyMode(true);
        setIsDraftCopyMode(true);
        setOriginalCopyData(data);
        setAttachments(headerFiles);
        setInvoiceAttachments(mapped[0].invoiceAttachments || []);
        navigate('..', { relative: 'path' });
    }, [mode, navigate]);

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

    return {
        // state
        formData, setFormData,
        attachments, invoiceAttachments,
        invoiceIdError, setInvoiceIdError,
        lineItems, setLineItems,
        editingId, setEditingId,
        selectedLineItemId, setSelectedLineItemId,
        selectedLineItemIds, setSelectedLineItemIds,
        selectAllChecked,
        nextId, setNextId,
        ocrProceed, setOcrProceed,
        submitReqDisable,
        targetPrNumber,
        isDraft,
        isCopyMode, setIsCopyMode,
        isDraftCopyMode, setIsDraftCopyMode,
        originalCopyData, setOriginalCopyData,
        showValidationModal,
        editingValidationIds,
        showSwitchConfirm, setShowSwitchConfirm,
        pendingSwitchId, setPendingSwitchId,
        showExitModal, setShowExitModal,
        invoicePdfMapping, setInvoicePdfMapping,
        isUploadingExcel,
        excelInputRef,
        isDraftEnabled,
        vendorLoading, vendorsList,
        hasMoreVendors,
        venueLoading, venuesList,
        hasMoreVenues,
        currentViewMode,
        // handlers
        showToast,
        handleInputChange,
        handleSelectChange,
        handleAutoInvoiceToggle,
        handleAutoGRNToggle,
        handleAddTaxToggle,
        handleAutoSESToggle,
        handleFileChange,
        handleInvoiceFileChange,
        handleViewFile,
        removeAttachment,
        removeInvoiceAttachment,
        handleSelectAll,
        handleCheckboxChange,
        handleAddLineItem,
        handleDelete,
        handleCancelEdit,
        handleValidate,
        handleValidationItemChange,
        handleSaveValidation,
        handleCancelValidationEdit,
        toggleValidationEdit,
        handleSubmitRequisition,
        handleSaveAsDraft,
        saveDraft,
        handleExcelFileChange,
        handleNavigateToPr,
        handleNavigateBack,
        handleBack,
        handleVendorSearch,
        handleLoadMoreVendors,
        handleVenueSearch,
        handleLoadMoreVenues,
        handleCopyFromSummary,
        handleCopyFromDraft,
        handleManualProceed,
        handleManualNavigate,
        handleManualModeChange,
    };
};
