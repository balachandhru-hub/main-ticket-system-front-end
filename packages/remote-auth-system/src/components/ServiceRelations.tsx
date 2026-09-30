import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { getTodayDate, getResetFormState } from '../common/common';
import { FaEdit, FaTrash, FaChevronDown, FaTimes, FaUpload, FaPaperclip, FaSave } from 'react-icons/fa';
import ServiceRelationsSummary from './ServiceRelationsSummary';
import ServiceRelationsDraft from './ServiceRelationsDraft';
import ServiceRelationsEdit from './ServiceRelationsEdit';
import { useManualBlocker } from '../hooks/useManualBlocker';
import './PrEntertainment.css';
import { toast, type TypeOptions } from 'react-toastify';
type ToastType = TypeOptions;
import BackButton from './BackButton';
import { createServicePR } from '../api/serviceRelationsApi';
import { fetchSuppliers, vendorPublicRelationData, getDetails, getPRSmartDefaults, createMaterialPRDraft, fetchCategoriesData, fetchCrossDetailByName, fetchCrossChargeProperties, getPublicDetails } from '../api/prEntertainmentApi';
import type { LineItemDto, CreateMaterialPRPayload, AssetDto } from '../api/prEntertainmentApi';
import { uploadExcelDraftServicePR } from '../api/ConciergeprApi';

interface PrEditWrapperProps {
    onBack: () => void;
    onUpdateSuccess: () => void;
}
declare global {
    interface Window {
        hasUnsavedChanges?: boolean;
        savePRDraft?: () => Promise<void>;
    }
}

interface PrEntertainmentProps {
    onBack?: () => void;
    onClose?: () => void;
    userId?: string;
    exitConfirmed?: boolean;
    onResetExitFlag?: () => void;
    onViewModeChange?: (viewMode: 'form' | 'summary' | 'edit' | 'draft') => void;
    currentType?: 'Material' | 'Service';
    onTypeChange?: (type: 'Material' | 'Service') => void;
    saveDraftRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

const extractCode = (value: string | undefined | null) => {
    if (!value) return '';
    return value.split(' ')[0] || value;
};

const extractVendorCode = (value: string | undefined | null) => {
    if (!value) return '';

    const parts = value.split(' - ');
    if (parts.length >= 3) {
        return parts[2].trim();
    }
    if (parts.length === 2) {
        return parts[0].trim();
    }
    return value;
};

const extractVendorCodes = (value: string | undefined | null) => {
    if (!value) return '';

    const parts = value.split(' - ');
    if (parts.length >= 3) {
        return parts[2].trim();
    }
    if (parts.length === 2) {
        return parts[1].trim();
    }
    return value;
};

const convertFileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof Blob)) {
            resolve('');
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};
const crossDetails = async (venueName?: string, companyCode?: string) => {
    try {
        const response = await fetchCrossDetailByName({ venueName, companyCode });
        if (response && response.statusCode && response.statusCode >= 400) {
            return response.message;
        }
        return response;
    } catch (error) {
        console.error('Failed to fetch cross details', error);
        return null;
    }
};

const truncateFileName = (name: string | undefined, maxLength: number = 24) => {
    if (!name) return 'File';
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));

    const truncatedName = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0));
    return `${truncatedName}...${extension}`;
};

const formatDateForInput = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
};

const getMonthEndDate = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];   // returns YYYY-MM-DD
};

interface Supplier {
    supplierId: string;
    supplierName: string;
}

interface LineItem {
    id?: number;
    venue: string;
    supplier: string;
    description: string;
    categoryName?: string;
    amount: string;
    contract?: string | null;
    glAccount?: string;
    uom?: string;
    quantity?: string;
    purchaseOrg?: string;
    costCenter?: string;
    percentage?: string;
    needBy?: string;
    serviceStartDate: string;
    serviceEndDate: string;
    currency?: string;
    autoSES?: boolean;
    autoInvoice?: boolean;
    materialcode?: string;
    unitPrice?: string;
    purchaseGroup?: string;
    deliveryTo?: string;
    taxCode?: string;
    companyCode?: string;
    shipToPlant?: string;
    billTo?: string;
    deliveryDate?: string;
    comments?: string;
    invoiceId?: string;
    invoiceDate?: string;
    invoiceComments?: string;
    vendorId?: string;
    taxInclude?: boolean;
    invoiceAttachments?: File[];
    lineItemNumber?: number;
    ParentLineItemNumber?: number;
    ocrProceed?: boolean;
    crossCharge?: boolean;
    crossChargeItems?: { subProperty: string; percentage: string; costCenter?: string }[];
}

interface SearchableSelectProps {
    id: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    label: string;
    loading?: boolean;
    onSearch?: (search: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    id,
    value,
    onChange,
    options,
    placeholder,
    label,
    loading = false,
    onSearch,
    onLoadMore,
    hasMore = false,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    const filteredOptions = onSearch
        ? options
        : options.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (onSearch) {
            const debounce = setTimeout(() => {
                onSearch(searchTerm);
            }, 300);
            return () => clearTimeout(debounce);
        }
    }, [searchTerm, onSearch]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        if (distanceFromBottom <= 100) {
            if (hasMore && !loading && onLoadMore) {
                onLoadMore();
            }
        }
    };

    const handleSelect = (option: string) => {
        if (disabled) return;
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className="form-group">
            {label && <label htmlFor={id}>{label} *</label>}
            <div className="searchable-select" ref={dropdownRef}>
                <div
                    className={`select-display ${disabled ? 'select-disabled' : ''} ${isOpen ? 'open' : ''}`}
                    onClick={toggleDropdown}
                >
                    <span className={value ? 'select-value' : 'select-placeholder'}>
                        {value || placeholder}
                    </span>
                    <FaChevronDown className={`select-arrow ${isOpen ? 'open' : ''}`} />
                </div>

                {isOpen && (
                    <div className="select-dropdown">
                        <div className="select-search">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="select-options" ref={optionsRef} onScroll={handleScroll}>
                            {loading && filteredOptions.length === 0 ? (
                                <div className="select-option no-results">Loading...</div>
                            ) : filteredOptions.length > 0 ? (
                                <>
                                    {filteredOptions.map((option, index) => (
                                        <div
                                            key={`${option}-${index}`}
                                            className={`select-option ${value === option ? 'selected' : ''}`}
                                            onClick={() => handleSelect(option)}
                                        >
                                            {option}
                                        </div>
                                    ))}
                                    {loading && <div className="select-option no-results">Loading more...</div>}
                                </>
                            ) : (
                                <div className="select-option no-results">No results found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
const PrEditWrapper = ({
    onBack,
    onUpdateSuccess,
}: PrEditWrapperProps) => {
    const location = useLocation();
    const prData = location.state?.prData ?? null;

    return (
        <ServiceRelationsEdit
            data={prData}
            onBack={onBack}
            onUpdateSuccess={onUpdateSuccess}
        />
    );
}
const ServiceRelations: React.FC<PrEntertainmentProps> = ({
    userId,
    onBack,
    exitConfirmed = false,
    onResetExitFlag,
    onViewModeChange,
    currentType,
    onTypeChange
}) => {
    const date = new Date();
    date.setDate(date.getDate() + 7);

    const showToast = (message: React.ReactNode, type: ToastType, duration: number = 3000) => {
        toast(message, { type, autoClose: duration });
    };

    const [formData, setFormData] = useState<LineItem & { category: string }>({
        venue: '',
        supplier: '',
        description: '',
        category: '',
        amount: '',
        serviceStartDate: getTodayDate(),
        serviceEndDate: getMonthEndDate(),
        costCenter: '',
        companyCode: '',
        shipToPlant: '',
        billTo: '',
        purchaseOrg: '',
        purchaseGroup: '',
        currency: '',
        deliveryTo: '',
        taxCode: '',
        needBy: getTodayDate(),
        contract: null as string | null,
        glAccount: '',
        uom: 'EA',
        autoInvoice: false,
        quantity: '1',
        autoSES: true,
        comments: '',
        invoiceId: '',
        invoiceDate: '',
        invoiceComments: '',
        vendorId: '',
        taxInclude: false,
        crossCharge: false,
        crossChargeItems: [] as { subProperty: string; percentage: string; costCenter?: string }[],
        ParentLineItemNumber: undefined,
    });

    const [attachments, setAttachments] = useState<File[]>([]);
    const [invoiceAttachments, setInvoiceAttachments] = useState<File[]>([]);
    const [invoiceIdError, setInvoiceIdError] = useState<string>('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const isDraftEnabled = lineItems.length > 0 || Object.values({ venue: formData.venue, supplier: formData.supplier, amount: formData.amount, description: formData.description }).some(v => v !== "" && v !== null && v !== undefined);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedLineItemId, setSelectedLineItemId] = useState<number | null>(null);
    const [selectAllChecked, setSelectAllChecked] = useState<boolean>(false);
    const [nextId, setNextId] = useState(1);
    const [ocrProceed, setOcrProceed] = useState<boolean>(false);
    const [vendorLoading, setVendorLoading] = useState<boolean>(false);
    const [vendorsList, setVendorsList] = useState<Supplier[]>([]);
    const [subPropertiesList, setSubPropertiesList] = useState<any[]>([]);
    const [hasMoreVendors, setHasMoreVendors] = useState<boolean>(true);
    const [categoriesList, setCategoriesList] = useState<string[]>([]);
    const [hasMoreCategories, setHasMoreCategories] = useState<boolean>(true);
    const [categoryLoading, setCategoryLoading] = useState<boolean>(false);
    const [categorySearch, setCategorySearch] = useState<string>('');
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0);
    const [tempPercentage, setTempPercentage] = useState<string>('');
    const [subPropertySearch, setSubPropertySearch] = useState<string>('');
    const [currentSubPropertyIndex, setCurrentSubPropertyIndex] = useState<number>(0);
    const [showExitModal, setShowExitModal] = useState<boolean>(false);
    const [pendingSwitchId, setPendingSwitchId] = useState<number | null>(null);
    const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
    const [venueLoading, setVenueLoading] = useState<boolean>(false);
    const [venuesList, setVenuesList] = useState<string[]>([]);
    const [hasMoreVenues, setHasMoreVenues] = useState<boolean>(true);
    const navigate = useNavigate();
    const location = useLocation();

    const currentViewMode = (() => {
        const path = location.pathname;
        if (path.endsWith('/summary')) return 'summary';
        if (path.endsWith('/edit')) return 'edit';
        if (path.endsWith('/draft')) return 'draft';
        return 'form';
    })();

    const [currentVendorIndex, setCurrentVendorIndex] = useState<number>(0);
    const [vendorSearch, setVendorSearch] = useState<string>('');
    const [currentVenueIndex, setCurrentVenueIndex] = useState<number>(0);
    const [venueSearch, setVenueSearch] = useState<string>('');
    const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
    const [editingValidationIds, setEditingValidationIds] = useState<number[]>([]);
    const [selectedLineItemIds, setSelectedLineItemIds] = useState<number[]>([]);
    const [lineItemsSnapshot, setLineItemsSnapshot] = useState<LineItem[]>([]);
    const [targetPrNumber, setTargetPrNumber] = useState<string | null>(null);
    const [tempSubProperty, setTempSubProperty] = useState<string>('');
    const [subPropertyLoading, setSubPropertyLoading] = useState<boolean>(false);

    const [invoicePdfMapping, setInvoicePdfMapping] = useState<{ [lineItemNumber: number]: File[] }>({});
    const [submitReqDisable, setSubmitReqDisable] = useState<boolean>(false);
    const [hasMoreSubProperties, setHasMoreSubProperties] = useState<boolean>(true);
    const [headerPdfFiles, setHeaderPdfFiles] = useState<File[]>([]);



    const [isCopyMode, setIsCopyMode] = useState<boolean>(false);
    const [originalCopyData, setOriginalCopyData] = useState<any>(null);
    const [isDraft, setIsDraft] = useState<boolean>(false);
    const [isDraftCopyMode, setIsDraftCopyMode] = useState<boolean>(false);
    const lastSearchedSupplierRef = useRef<string | null>(null);

    const excelInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState<boolean>(false);
    const [isProceeding, setIsProceeding] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'path' | 'mode', value: string } | null>(null);

    const isEditingSubProperty = editingId !== null && lineItems.find(item => item.id === editingId)?.ParentLineItemNumber !== undefined;
    const isInvoiceReadOnlyForSubProp = !isEditingSubProperty && editingId !== null && ocrProceed;

    const hasFormData = Object.values({
        venue: formData.venue,
        supplier: formData.supplier,
        amount: formData.amount,
        description: formData.description,
        category: formData.category,
        needBy: formData.needBy && formData.needBy !== getTodayDate(),
        quantity: formData.quantity && formData.quantity !== '1',
        comments: formData.comments,
        invoiceId: formData.invoiceId,
        invoiceDate: formData.invoiceDate,
        crossCharge: formData.crossCharge,
    }).some(value => value !== "" && value !== null && value !== undefined && value !== false);

    const hasAttachments = attachments.length > 0 || invoiceAttachments.length > 0;
    const isDirty = !isProceeding && (lineItems.length > 0 || hasFormData || hasAttachments);
    useEffect(() => {
        window.hasUnsavedChanges = isDirty;
        return () => {
            window.hasUnsavedChanges = false;
        };
    }, [isDirty]);
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

    React.useEffect(() => {
        if (selectedLineItemId !== null && editingId === null) {
            const selectedItem = lineItems.find(item => item.id === selectedLineItemId);
            if (selectedItem) {
                setFormData({
                    venue: selectedItem.venue || '',
                    category: selectedItem.categoryName || '',
                    supplier: selectedItem.supplier || '',
                    description: selectedItem.description || '',
                    amount: selectedItem.amount || '',
                    contract: selectedItem.contract || null,
                    glAccount: selectedItem.glAccount || '',
                    uom: selectedItem.uom || 'EA',
                    quantity: selectedItem.quantity || '1',
                    purchaseOrg: selectedItem.purchaseOrg || '',
                    costCenter: selectedItem.costCenter || '',
                    needBy: selectedItem.needBy || getTodayDate(),
                    serviceStartDate: getTodayDate(),
                    serviceEndDate: getMonthEndDate(),
                    currency: selectedItem.currency || '',
                    autoSES: selectedItem.autoSES !== undefined ? selectedItem.autoSES : true,
                    autoInvoice: selectedItem.autoInvoice !== undefined ? selectedItem.autoInvoice : false,
                    materialcode: selectedItem.materialcode,
                    purchaseGroup: selectedItem.purchaseGroup || '',
                    deliveryTo: selectedItem.deliveryTo || '',
                    taxCode: selectedItem.taxCode || '',
                    companyCode: selectedItem.companyCode || '',
                    shipToPlant: selectedItem.shipToPlant || '',
                    billTo: selectedItem.billTo || '',
                    comments: selectedItem.comments || '',
                    invoiceId: selectedItem.invoiceId || '',
                    invoiceDate: selectedItem.invoiceDate || '',
                    invoiceComments: selectedItem.invoiceComments || '',
                    vendorId: selectedItem.vendorId || '',
                    taxInclude: selectedItem.taxInclude || false,
                    crossCharge: selectedItem.crossCharge || false,
                    crossChargeItems: selectedItem.crossChargeItems || [],
                });
                if (selectedItem.invoiceAttachments) {
                    setInvoiceAttachments(selectedItem.invoiceAttachments);
                }
            }
        }
    }, [selectedLineItemId, editingId, lineItems]);

    const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingExcel(true);
        try {
            const response = await uploadExcelDraftServicePR(file);

            if (response && (response as any).statusCode && (response as any).statusCode !== 200 && (response as any).statusCode !== 201) {
                showToast('Failed to upload Excel: ' + ((response as any).message || 'Unknown error'), 'error');
                if (excelInputRef.current) excelInputRef.current.value = '';
                return;
            }

            const res = response as any;
            const successCount = res.successfulUploads ?? 0;
            const failedCount = res.failedUploads ?? 0;
            const totalRows = res.totalRows ?? (successCount + failedCount);

            if (successCount > 0) {
                showToast(`Excel uploaded: ${successCount} successful, ${failedCount} failed (total ${totalRows}).`, 'success', 4000);
                navigate('draft');
            } else {
                const message = res?.message || (res?.errorResponses && res.errorResponses.length ? res.errorResponses.map((r: any) => r.message).join('; ') : 'No successful uploads');
                showToast('Upload finished with no successful rows: ' + message, 'error', 6000);

            }
        } catch (err) {
            showToast('An error occurred while uploading the Excel file.', 'error');
        } finally {
            setIsUploadingExcel(false);
            if (excelInputRef.current) excelInputRef.current.value = '';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if ((name === 'needBy' || name === 'invoiceDate') && value) {
            const selectedDate = new Date(value);
            const year = selectedDate.getFullYear();

            if (year < 2000) {
                showToast('Date cannot be before year 2000', 'error');
                return;
            }
        }

        if (name === 'serviceStartDate' || name === 'serviceEndDate') {
            const startDate = name === 'serviceStartDate' ? value : formData.serviceStartDate;
            const endDate = name === 'serviceEndDate' ? value : formData.serviceEndDate;

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (start > end) {
                    showToast('Service Start Date cannot be after Service End Date', 'warning');
                }
            }
        }

        // Invoice ID validation: trim >16, show message at limit
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

        if (name === 'amount') {
            const numericValue = value.replace(/[^0-9.]/g, '');
            const parts = numericValue.split('.');
            const sanitizedValue = parts.length > 2
                ? parts[0] + '.' + parts.slice(1).join('')
                : numericValue;

            const amountValue = parseFloat(sanitizedValue);
            if (sanitizedValue && !isNaN(amountValue) && amountValue < 0) {
                showToast('Amount cannot be negative', 'error');
                return;
            }

            setFormData(prev => ({
                ...prev,
                [name]: sanitizedValue
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = async (name: string, value: string) => {
        setFormData(prev => {
            const isVenueChange = name === 'venue';
            return {
                ...prev,
                [name]: value,
                ...(isVenueChange ? { crossChargeItems: [] } : {})
            };
        });

        if (name === 'venue') {
            setTempSubProperty('');
            setTempPercentage('');
            try {
                const response = await getPublicDetails({
                    search: value
                });

                if (response && response.suppliers) {
                    const venueDetails = response.suppliers;
                    setFormData(prev => ({
                        ...prev,
                        purchaseOrg: venueDetails.purchaseOrg || prev.purchaseOrg,
                        purchaseGroup: venueDetails.purchaseGroup || prev.purchaseGroup,
                        glAccount: venueDetails.glAccount || prev.glAccount,
                        costCenter: venueDetails.costCenter || prev.costCenter,
                        companyCode: venueDetails.companyCode || prev.companyCode,
                        shipToPlant: venueDetails.shipToPlant || prev.shipToPlant,
                        billTo: venueDetails.billTo || prev.billTo,
                        materialcode: venueDetails.materialCode || prev.materialcode,
                    }));
                }
            } catch (error: any) {
                if (error?.status === 401) {
                    return;
                }
            }
        }
    };
    const fetchSubPropertiesData = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
        if (!formData.companyCode) return;

        setSubPropertyLoading(true);
        try {
            const response = await fetchCrossChargeProperties({
                page: index,
                page_size: 10,
                ...(search && { search }),
                companyCode: formData.companyCode
            });

            if (response && response.suppliers) {
                if (response.suppliers.length === 0) {
                    setHasMoreSubProperties(false);
                    return;
                }

                if (index === 0) {
                    setSubPropertiesList(response.suppliers);
                } else {
                    setSubPropertiesList(prev => {
                        const combined = [...prev, ...response.suppliers];
                        const unique = new Map(combined.map((item: any) => [typeof item === 'string' ? item : item.propertyCrossChargeName, item])).values();
                        return Array.from(unique);
                    });
                }
                setHasMoreSubProperties(true);
            } else {
                setHasMoreSubProperties(false);
            }
        } catch (error: any) {
            if (error?.status === 401) {
                return;
            }
            if (index === 0) setSubPropertiesList([]);
            setHasMoreSubProperties(false);
        } finally {
            setSubPropertyLoading(false);
        }
    }, [formData.companyCode]);

    const handleSubPropertySearch = useCallback((search: string) => {
        setSubPropertySearch(search);
        setCurrentSubPropertyIndex(0);
        setHasMoreSubProperties(true);
        fetchSubPropertiesData(0, search);
    }, [fetchSubPropertiesData]);

    const handleLoadMoreSubProperties = useCallback(() => {
        if (hasMoreSubProperties && !subPropertyLoading) {
            const nextIndex = currentSubPropertyIndex + 10;
            setCurrentSubPropertyIndex(nextIndex);
            fetchSubPropertiesData(nextIndex, subPropertySearch);
        }
    }, [currentSubPropertyIndex, hasMoreSubProperties, subPropertySearch, fetchSubPropertiesData, subPropertyLoading]);

    useManualBlocker({
        when: isDirty,
        onBlock: (target) => {
            if (target) setPendingAction({ type: 'path', value: target });
            setShowExitModal(true);
        }
    });

    useEffect(() => {
        if (isProceeding) {
            setIsProceeding(false);
        }
    }, [location.pathname]);
    useEffect(() => {
        if (formData.companyCode) {
            fetchSubPropertiesData(0, '');
        } else {
            setSubPropertiesList([]);
        }
    }, [fetchSubPropertiesData, formData.companyCode]);
    const handleCrossChargeToggle = () => {
        setFormData(prev => ({
            ...prev,
            crossCharge: !prev.crossCharge
        }));
    };

    const handleAddCrossChargeItem = async () => {
        if (!tempSubProperty || !tempPercentage) {
            showToast('Please select a sub-property and enter a percentage', 'warning');
            return;
        }

        const newPercentage = parseFloat(tempPercentage);
        const currentTotal = (formData.crossChargeItems || []).reduce((sum, item) => sum + parseFloat(item.percentage || '0'), 0);
        if (newPercentage <= 0) {
            showToast('Percentage must be greater than 0', 'warning');
            return;
        }
        if (currentTotal + newPercentage > 99.9) {
            showToast(`Total sub-property percentage cannot exceed 99.9% (current: ${currentTotal}%, adding: ${newPercentage}%)`, 'warning');
            return;
        }
        // ↑ end of new block

        let subPropName = tempSubProperty;
        let selectedCostCenter = '';

        if (tempSubProperty.includes(' - ')) {
            const parts = tempSubProperty.split(' - ');
            subPropName = parts[0];
            selectedCostCenter = parts.length > 1 ? parts[1] : '';
        }

        const isDuplicate = (formData.crossChargeItems ?? []).some(item => item.subProperty === subPropName && item.costCenter === selectedCostCenter);
        if (isDuplicate) {
            showToast('This sub-property with the same cost center was already added.', 'warning');
            return;
        }

        let fetchedCostCenter = selectedCostCenter;
        let fetchedGlAccount = '';

        const matchedOption = subPropertiesList.find((item: any) =>
            item.propertyCrossChargeName === subPropName && item.costCenter === selectedCostCenter
        );

        if (matchedOption && (matchedOption as any).glAccount) {
            fetchedGlAccount = (matchedOption as any).glAccount;
        } else {
            const response = await crossDetails(subPropName, formData.companyCode);
            if (response && typeof response !== 'string') {
                const dataArray = Array.isArray(response) ? response : [response];
                const matchData = dataArray.find((x: any) => x.costCenter === selectedCostCenter) || dataArray[0];
                if (matchData) {
                    fetchedCostCenter = selectedCostCenter || matchData.costCenter || matchData.CostCenter || matchData.cost_center || '';
                    fetchedGlAccount = matchData.glAccount || matchData.GLAccount || matchData.gl_account || '';
                }
            }
        }

        setFormData(prev => ({
            ...prev,
            crossChargeItems: [...(prev.crossChargeItems || []), {
                subProperty: subPropName,
                percentage: tempPercentage,
                costCenter: fetchedCostCenter,
                glAccount: fetchedGlAccount
            }]
        }));
        setTempSubProperty('');
        setTempPercentage('');
    };

    const handleRemoveCrossChargeItem = (property: string, costCenter: string) => {
        setFormData(prev => ({
            ...prev,
            crossChargeItems: (prev.crossChargeItems || []).filter(item => !(item.subProperty === property && item.costCenter === costCenter))
        }));
    };
    const handleAutoInvoiceToggle = () => {
        setFormData(prev => {
            if (!prev.autoInvoice && !prev.autoSES) {
                showToast('Auto SES must be active to enable Auto Invoice', 'warning');
                return prev;
            }
            return { ...prev, autoInvoice: !prev.autoInvoice };
        });
    };

    const handleAutoSESToggle = () => {
        setFormData(prev => {
            const newAutoSES = !prev.autoSES;
            if (!newAutoSES && prev.autoInvoice) {
                showToast('Auto Invoice has been disabled because Auto SES was deactivated', 'info');
                return { ...prev, autoSES: newAutoSES, autoInvoice: false };
            }
            return { ...prev, autoSES: newAutoSES };
        });
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

    const handleViewFile = (file: File) => {
        if (file) {
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const removeInvoiceAttachment = (index: number) => {
        setInvoiceAttachments(prev => prev.filter((_, i) => i !== index));
    };

    

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            comments: e.target.value
        }));
    };

    const handleInvoiceCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            invoiceComments: e.target.value
        }));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setSelectAllChecked(isChecked);
        if (isChecked) {
            setSelectedLineItemIds(lineItems.map(item => item.id || 0));
        } else {
            setSelectedLineItemIds([]);
        }
    };

    const handleEdit = (id: number) => {
        const itemToEdit = lineItems.find(item => item.id === id);
        if (itemToEdit) {
            // Allow editing sub-properties, field restrictions are handled in the form JSX

            let amountToEdit = itemToEdit.amount;
            if (itemToEdit.crossCharge && itemToEdit.crossChargeItems && itemToEdit.crossChargeItems.length > 0 && !itemToEdit.ParentLineItemNumber) {
                const childItems = lineItems.filter(li => li.ParentLineItemNumber === itemToEdit.id);
                const totalAmount = parseFloat(itemToEdit.amount || '0') + childItems.reduce((sum, child) => sum + parseFloat(child.amount || '0'), 0);
                amountToEdit = parseFloat(totalAmount.toFixed(2)).toString();
            }

            setFormData(prev => ({
                ...prev,
                venue: itemToEdit.venue,
                supplier: itemToEdit.supplier || '',
                description: itemToEdit.description,
                amount: amountToEdit,
                needBy: itemToEdit.needBy || getTodayDate(),
                glAccount: itemToEdit.glAccount || '',
                costCenter: itemToEdit.costCenter || '',
                materialcode: itemToEdit.materialcode || '',
                serviceStartDate: itemToEdit.serviceStartDate || getTodayDate(),
                serviceEndDate: itemToEdit.serviceEndDate || getMonthEndDate(),
                autoInvoice: itemToEdit.autoInvoice ?? false,
                quantity: itemToEdit.quantity || '1',
                autoSES: itemToEdit.autoSES ?? true,
                invoiceId: itemToEdit.invoiceId || '',
                invoiceDate: itemToEdit.invoiceDate || '',
                invoiceComments: itemToEdit.invoiceComments || '',
                vendorId: itemToEdit.vendorId || '',
                taxInclude: itemToEdit.taxInclude ?? false,
                crossCharge: itemToEdit.crossCharge ?? false,
                crossChargeItems: itemToEdit.crossChargeItems || [],
                ParentLineItemNumber: itemToEdit.ParentLineItemNumber,
            }));


            setOcrProceed(itemToEdit.ocrProceed ?? false);

            const lineItemIndex = lineItems.findIndex(item => item.id === id);
            if (lineItemIndex !== -1) {
                const lineItemNumber = itemToEdit.lineItemNumber || (lineItemIndex + 1);

                if (itemToEdit.invoiceAttachments && itemToEdit.invoiceAttachments.length > 0) {
                    setInvoiceAttachments(itemToEdit.invoiceAttachments);
                } else {
                    const lineItemInvoicePdfs = invoicePdfMapping[lineItemNumber];

                    if (lineItemInvoicePdfs && lineItemInvoicePdfs.length > 0) {
                        setInvoiceAttachments(lineItemInvoicePdfs);
                    } else {
                        setInvoiceAttachments([]);
                    }
                }
            }

            if (headerPdfFiles.length > 0) {
                setAttachments(headerPdfFiles);
            }

            setEditingId(id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleAddLineItem = () => {
        if (!formData.venue || !formData.supplier || !formData.amount) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const amountValue = parseFloat(formData.amount);
        if (!formData.amount || formData.amount.trim() === '' || isNaN(amountValue) || amountValue <= 0) {
            showToast('Amount must be greater than 0', 'error');
            return;
        }

        if (formData.serviceStartDate && formData.serviceEndDate) {
            const start = new Date(formData.serviceStartDate);
            const end = new Date(formData.serviceEndDate);
            if (start > end) {
                showToast('Service Start Date cannot be after Service End Date', 'error');
                return;
            }
        }

        if (formData.autoInvoice) {
            const missingFields = [];
            if (!formData.invoiceId) missingFields.push('Invoice ID');
            if (!formData.invoiceDate) missingFields.push('Invoice Date');
            if (invoiceAttachments.length === 0) missingFields.push('Invoice Attachment');

            if (missingFields.length > 0) {
                showToast(`Please fill in: ${missingFields.join(', ')}`, 'warning');
                return;
            }

            if (ocrProceed) {
                const existingInvoiceIds = new Set(
                    lineItems
                        .filter(item => item.autoInvoice && item.invoiceId)
                        .map(item => item.invoiceId)
                );

                const isSingleLineItemUpdate =
                    lineItems.length === 1 &&
                    editingId === lineItems[0].id &&
                    !lineItems[0].invoiceId;

                if (isSingleLineItemUpdate) {

                } else if (existingInvoiceIds.size > 0 && !existingInvoiceIds.has(formData.invoiceId)) {
                    showToast(
                        "We can't add line items with different Invoice IDs when Header Invoice is checked",
                        'warning'
                    );
                    return;
                }
            }

            const hasOcrProceedTrue = lineItems.some(item => item.ocrProceed === true);
            const hasOtherOcrProceedTrue = lineItems.some(item =>
                item.id !== editingId && item.ocrProceed === true
            );

            if (hasOtherOcrProceedTrue && !ocrProceed) {
                showToast("Applicable for all line items must be enabled because another line item already has it enabled", 'warning');
                return;
            }

            if (ocrProceed && !hasOcrProceedTrue && lineItems.length > 0) {
                const hasOcrProceedFalse = lineItems.some(item =>
                    item.autoInvoice && (item.ocrProceed === false || item.ocrProceed === undefined)
                );

                const isSingleLineItemUpdate =
                    lineItems.length === 1 &&
                    editingId === lineItems[0].id;

                if (hasOcrProceedFalse && !isSingleLineItemUpdate) {
                    showToast("Cannot enable Header Invoice because other line items have it disabled", 'warning');
                    return;
                }
            }
        }

        if (editingId !== null) {
            const updatedItem = { ...formData, id: editingId, invoiceAttachments: [...invoiceAttachments], ocrProceed: ocrProceed };

            if (updatedItem.crossCharge && !updatedItem.ParentLineItemNumber && updatedItem.crossChargeItems && updatedItem.crossChargeItems.length > 0) {
                const totalAmount = parseFloat(updatedItem.amount || '0');
                const subItemsTotalPercentage = (updatedItem.crossChargeItems || []).reduce((sum, item) => sum + parseFloat(item.percentage || '0'), 0);

                if (subItemsTotalPercentage > 100) {
                    showToast('Total cross charge percentage cannot exceed 100%', 'error');
                    return;
                }

                const remainingPercentage = 100 - subItemsTotalPercentage;
                const remainingAmount = (totalAmount * remainingPercentage) / 100;

                const mainItem = {
                    ...updatedItem,
                    amount: remainingAmount.toFixed(2),
                    unitPrice: remainingAmount.toFixed(2),
                    percentage: String(remainingPercentage)
                };

                const newChildItems: LineItem[] = [];
                let currentId = nextId;

                (updatedItem.crossChargeItems || []).forEach(subItem => {
                    const itemPercentage = parseFloat(subItem.percentage || '0');
                    const itemAmount = (totalAmount * itemPercentage) / 100;
                    const crossChargeItem: LineItem = {
                        ...updatedItem,
                        id: currentId,
                        ParentLineItemNumber: editingId,
                        venue: subItem.subProperty,
                        amount: itemAmount.toFixed(2),
                        unitPrice: itemAmount.toFixed(2),
                        percentage: subItem.percentage,
                        glAccount: (subItem as any).glAccount,
                        costCenter: (subItem as any).costCenter,
                        crossCharge: true,
                        crossChargeItems: [subItem],
                        autoInvoice: false,
                        invoiceId: '',
                        invoiceDate: '',
                        invoiceComments: '',
                        invoiceAttachments: [],
                        ocrProceed: false
                    };
                    newChildItems.push(crossChargeItem);
                    currentId++;
                });

                setLineItems(prev => {
                    const filteredPrev = prev.filter(item => item.ParentLineItemNumber !== editingId);
                    const updatedList = filteredPrev.map(item => item.id === editingId ? mainItem : item);
                    // Insert children immediately after the parent to preserve visual grouping
                    const parentIndex = updatedList.findIndex(item => item.id === editingId);
                    if (parentIndex !== -1) {
                        const beforeParent = updatedList.slice(0, parentIndex + 1);
                        const afterParent = updatedList.slice(parentIndex + 1);
                        return [...beforeParent, ...newChildItems, ...afterParent];
                    }
                    return updatedList.concat(newChildItems);
                });
                setNextId(currentId);
                setEditingId(null);
                showToast('Line item updated successfully!', 'success');
            } else {
                setLineItems(prev => {
                    const filteredPrev = prev.filter(item => item.ParentLineItemNumber !== editingId);
                    return filteredPrev.map(item => item.id === editingId ? updatedItem : item);
                });
                setEditingId(null);
                showToast('Line item updated successfully!', 'success');
            }
        } else {
            if (formData.crossCharge && formData.crossChargeItems) {
                const subItemsTotalPercentage = (formData.crossChargeItems || []).reduce((sum, item) => sum + parseFloat(item.percentage || '0'), 0);

                if (subItemsTotalPercentage > 100) {
                    showToast('Total cross charge percentage cannot exceed 100%', 'error');
                    return;
                }

                const mainItemId = nextId;
                let currentId = nextId + 1;
                const crossChargeLineItems: LineItem[] = [];

                // Calculate amounts based on percentage
                const totalAmount = parseFloat(formData.amount || '0');

                formData.crossChargeItems?.forEach(item => {
                    const itemPercentage = parseFloat(item.percentage || '0');
                    const itemAmount = (totalAmount * itemPercentage) / 100;

                    const crossChargeItem: LineItem = {
                        id: currentId,
                        ParentLineItemNumber: mainItemId,
                        venue: item.subProperty,
                        supplier: formData.supplier,
                        categoryName: formData.category,
                        description: formData.description,
                        amount: itemAmount.toFixed(2), // Calculated amount
                        contract: formData.contract,
                        percentage: item.percentage,
                        glAccount: (item as any).glAccount || formData.glAccount,
                        uom: formData.uom,
                        quantity: formData.quantity,
                        purchaseOrg: formData.purchaseOrg,
                        costCenter: (item as any).costCenter || formData.costCenter,
                        needBy: formData.needBy,
                        serviceStartDate: formData.serviceStartDate,
                        serviceEndDate: formData.serviceEndDate,
                        currency: formData.currency,
                        autoSES: formData.autoSES,
                        autoInvoice: false,
                        materialcode: formData.materialcode,
                        unitPrice: itemAmount.toFixed(2), // Update unit price too
                        purchaseGroup: formData.purchaseGroup,
                        deliveryTo: formData.deliveryTo,
                        taxCode: formData.taxCode,
                        companyCode: formData.companyCode,
                        shipToPlant: formData.shipToPlant,
                        billTo: formData.billTo,
                        deliveryDate: formData.needBy,
                        comments: formData.comments,
                        invoiceId: '',
                        invoiceDate: '',
                        invoiceComments: '',
                        vendorId: formData.vendorId,
                        taxInclude: formData.taxInclude,
                        invoiceAttachments: [],
                        ocrProceed: false,
                        crossCharge: true,
                        crossChargeItems: [item]
                    };
                    crossChargeLineItems.push(crossChargeItem);
                    currentId++;
                });

                const remainingPercentage = 100 - subItemsTotalPercentage;
                const remainingAmount = (totalAmount * remainingPercentage) / 100;

                const mainItem: LineItem = {
                    id: mainItemId,
                    venue: formData.venue,
                    supplier: formData.supplier,
                    description: formData.description,
                    categoryName: formData.category,
                    amount: remainingAmount.toFixed(2), // Calculated remaining amount
                    percentage: String(remainingPercentage),
                    contract: formData.contract,
                    glAccount: formData.glAccount,
                    uom: formData.uom,
                    quantity: formData.quantity,
                    purchaseOrg: formData.purchaseOrg,
                    costCenter: formData.costCenter,
                    needBy: formData.needBy,
                    serviceStartDate: formData.serviceStartDate,
                    serviceEndDate: formData.serviceEndDate,
                    currency: formData.currency,
                    autoSES: formData.autoSES,
                    autoInvoice: formData.autoInvoice,
                    materialcode: formData.materialcode,
                    unitPrice: remainingAmount.toFixed(2), // Update unit price too
                    purchaseGroup: formData.purchaseGroup,
                    deliveryTo: formData.deliveryTo,
                    taxCode: formData.taxCode,
                    companyCode: formData.companyCode,
                    shipToPlant: formData.shipToPlant,
                    billTo: formData.billTo,
                    deliveryDate: formData.needBy,
                    comments: formData.comments,
                    invoiceId: formData.invoiceId,
                    invoiceDate: formData.invoiceDate,
                    invoiceComments: formData.invoiceComments,
                    vendorId: formData.vendorId,
                    taxInclude: formData.taxInclude,
                    invoiceAttachments: [...invoiceAttachments],
                    ocrProceed: ocrProceed,
                    crossCharge: formData.crossCharge,
                    crossChargeItems: formData.crossChargeItems
                };

                setLineItems(prev => [...prev, mainItem, ...crossChargeLineItems]);
                setNextId(currentId);
                showToast(`${crossChargeLineItems.length + 1} line items added successfully (Cross Charge)!`, 'success');

            } else {
                const newItem: LineItem = {
                    id: nextId,
                    venue: formData.venue,
                    supplier: formData.supplier,
                    categoryName: formData.category,
                    description: formData.description,
                    amount: formData.amount,
                    contract: formData.contract,
                    glAccount: formData.glAccount,
                    uom: formData.uom,
                    quantity: formData.quantity,
                    purchaseOrg: formData.purchaseOrg,
                    costCenter: formData.costCenter,
                    needBy: formData.needBy,
                    serviceStartDate: formData.serviceStartDate,
                    serviceEndDate: formData.serviceEndDate,
                    currency: formData.currency,
                    autoSES: formData.autoSES,
                    autoInvoice: formData.autoInvoice,
                    materialcode: formData.materialcode,
                    unitPrice: formData.amount,
                    purchaseGroup: formData.purchaseGroup,
                    deliveryTo: formData.deliveryTo,
                    taxCode: formData.taxCode,
                    companyCode: formData.companyCode,
                    shipToPlant: formData.shipToPlant,
                    billTo: formData.billTo,
                    deliveryDate: formData.needBy,
                    comments: formData.comments,
                    invoiceId: formData.invoiceId,
                    invoiceDate: formData.invoiceDate,
                    invoiceComments: formData.invoiceComments,
                    vendorId: formData.vendorId,
                    taxInclude: formData.taxInclude,
                    invoiceAttachments: [...invoiceAttachments],
                    ocrProceed: ocrProceed,
                    crossCharge: formData.crossCharge,
                    crossChargeItems: formData.crossChargeItems
                };
                setLineItems(prev => [...prev, newItem]);
                setNextId(prev => prev + 1);
                showToast('Line item added successfully!', 'success');
            }
        }

        if (isCopyMode) {
            setIsCopyMode(false);
            setOriginalCopyData(null);
            setOcrProceed(false);
            setFormData(prev => ({
                venue: '',
                supplier: '',
                description: '',
                category: '',
                amount: '',
                costCenter: '',
                companyCode: prev.companyCode,
                shipToPlant: prev.shipToPlant,
                billTo: prev.billTo,
                purchaseOrg: prev.purchaseOrg,
                purchaseGroup: prev.purchaseGroup,
                currency: prev.currency,
                deliveryTo: prev.deliveryTo,
                materialcode: prev.materialcode,
                taxCode: prev.taxCode,
                needBy: getTodayDate(),
                serviceStartDate: getTodayDate(),
                serviceEndDate: getMonthEndDate(),
                contract: null,
                glAccount: '',
                uom: 'EA',
                autoInvoice: false,
                quantity: '1',
                autoSES: true,
                comments: '',
                invoiceId: '',
                invoiceDate: '',
                invoiceComments: '',
                vendorId: '',
                taxInclude: false,
                crossCharge: false,
                crossChargeItems: [],
            }));

            setInvoiceAttachments([]);
            showToast('Form reset - ready for next line item', 'info', 2000);
        } else {
            // Standard reset when NOT in copy mode
            setFormData(prev => ({
                venue: '',
                supplier: '',
                description: '',
                category: '',
                amount: '',
                costCenter: '',
                companyCode: prev.companyCode,
                shipToPlant: prev.shipToPlant,
                billTo: prev.billTo,
                purchaseOrg: prev.purchaseOrg,
                purchaseGroup: prev.purchaseGroup,
                currency: prev.currency,
                deliveryTo: prev.deliveryTo,
                materialcode: prev.materialcode,
                taxCode: prev.taxCode,
                needBy: getTodayDate(),
                serviceStartDate: getTodayDate(),
                serviceEndDate: getMonthEndDate(),
                contract: null,
                glAccount: '',
                uom: 'EA',
                autoInvoice: false,
                quantity: '1',
                autoSES: true,
                comments: '',
                invoiceId: '',
                invoiceDate: '',
                invoiceComments: '',
                vendorId: '',
                taxInclude: false,
                crossCharge: false,
                crossChargeItems: [],
            }));
            setInvoiceAttachments([]);
            // Don't show toast here as it's already shown above
        }
    };

    const handleDelete = (id: number) => {
        const itemToDelete = lineItems.find(item => item.id === id);
        if (itemToDelete?.ParentLineItemNumber !== undefined) {
            // If deleting a child, also update the parent's crossChargeItems list
            setLineItems(prev => {
                const updatedPrev = prev.map(p => {
                    if (p.id === itemToDelete.ParentLineItemNumber) {
                        return {
                            ...p,
                            crossChargeItems: (p.crossChargeItems || []).filter(cc =>
                                cc.subProperty !== itemToDelete.venue || cc.costCenter !== itemToDelete.costCenter
                            )
                        };
                    }
                    return p;
                });
                return updatedPrev.filter(item => item.id !== id);
            });
        } else {
            // If deleting a parent, delete all its children too
            setLineItems(prev => prev.filter(item => item.id !== id && item.ParentLineItemNumber !== id));
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setOcrProceed(false);
        setFormData(prev => getResetFormState(prev));
        setInvoiceAttachments([]);
    };

    const fetchCategoriesList = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
        setCategoryLoading(true);
        try {
            const response = await fetchCategoriesData({
                page: index,
                page_size: 10,
                ...(search && { search }),
                companyCode: formData.companyCode
            });

            if (response && response.categories) {
                if (response.categories.length === 0) {
                    setHasMoreCategories(false);
                    return;
                }
                if (index === 0) {
                    setCategoriesList(response.categories);
                } else {
                    setCategoriesList(prev => Array.from(new Set([...prev, ...response.categories])));
                }
                setHasMoreCategories(true);
            } else {
                setHasMoreCategories(false);
            }
        } catch (error) {
            setHasMoreCategories(false);
        } finally {
            setCategoryLoading(false);
        }
    }, [formData.companyCode]);

    const handleCategorySearch = useCallback((search: string) => {
        setCategorySearch(search);
        setCurrentCategoryIndex(0);
        setHasMoreCategories(true);
        fetchCategoriesList(0, search);
    }, [fetchCategoriesList]);

    const handleLoadMoreCategories = useCallback(() => {
        if (hasMoreCategories && !categoryLoading) {
            const nextIndex = currentCategoryIndex + 10;
            setCurrentCategoryIndex(nextIndex);
            fetchCategoriesList(nextIndex, categorySearch);
        }
    }, [currentCategoryIndex, hasMoreCategories, categorySearch, fetchCategoriesList, categoryLoading]);

    useEffect(() => {
        fetchCategoriesList(0, '');
    }, [fetchCategoriesList, formData.companyCode]);

    const handleValidate = async () => {
        setShowValidationModal(true);
        setEditingValidationIds([]);
        setLineItemsSnapshot(JSON.parse(JSON.stringify(lineItems)));
    };

    const handleValidationItemChange = (id: number, field: string, value: string) => {
        if (field === 'needBy' && value) {
            const selectedDate = new Date(value);
            const year = selectedDate.getFullYear();

            if (year < 2000) {
                showToast('Date cannot be before year 2000', 'error');
                return;
            }
        }

        setLineItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleSaveValidation = async () => {
        if (lineItems.length === 0) {
            showToast('No line items to submit.', 'warning');
            return;
        }

        if (formData.autoInvoice) {
            const missingFields = [];
            if (!formData.invoiceId) missingFields.push('Invoice ID');
            if (!formData.invoiceDate) missingFields.push('Invoice Date');
            if (invoiceAttachments.length === 0) missingFields.push('Invoice Attachment');

            if (missingFields.length > 0) {
                showToast(`Please fill in: ${missingFields.join(', ')}`, 'warning');
                return;
            }
        }

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
                serviceStartDate: firstItem.serviceStartDate || prev.serviceStartDate,
                serviceEndDate: firstItem.serviceEndDate || prev.serviceEndDate,
                taxInclude: firstItem.taxInclude ?? prev.taxInclude,
            }));
        }

        setEditingValidationIds([]);
        setShowValidationModal(false);
    };

    const handleNavigateToPr = (prNumber: string) => {
        setTargetPrNumber(prNumber);
        navigate('summary');
    };

    const handleCancelValidationEdit = () => {
        setLineItems(lineItemsSnapshot || []);
        setEditingValidationIds([]);
        setShowValidationModal(false);
    };

    const toggleValidationEdit = (id: number) => {
        setEditingValidationIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const handleCheckboxChange = (id: number) => {
        setSelectedLineItemIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(itemId => itemId !== id);
            } else {
                return [...prev, id];
            }
        });
    };


    const handleAddOrDuplicateLineItems = () => {
        if (selectedLineItemIds.length > 0) {
            // Duplicate selected items
            const itemsToDuplicate = lineItems.filter(item =>
                item.id !== undefined && selectedLineItemIds.includes(item.id)
            );

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
            setFormData({
                venue: '',
                supplier: '',
                description: '',
                category: '',
                amount: '',
                costCenter: '',
                companyCode: '',
                shipToPlant: '',
                billTo: '',
                purchaseOrg: '',
                purchaseGroup: '',
                currency: 'AED',
                deliveryTo: '',
                materialcode: '',
                contract: null,
                glAccount: '',
                uom: 'EA',
                autoInvoice: false,
                needBy: getTodayDate(),
                serviceStartDate: getTodayDate(),
                serviceEndDate: getMonthEndDate(),
                quantity: '1',
                autoSES: true,
                comments: '',
                invoiceId: '',
                invoiceDate: '',
                invoiceComments: '',
                vendorId: '',
                taxCode: '',
                taxInclude: false,
                crossCharge: false,
                crossChargeItems: [],
            });
            setInvoiceAttachments([]);
        }
    };

    const handleSubmitRequisition = async () => {
        if (selectedLineItemIds.length === 0) {
            showToast('Please select at least one line item before submitting', 'warning');
            return;
        }

        const selectedLineItems = lineItems.filter(item => item.id !== undefined && selectedLineItemIds.includes(item.id));
        const idToNumberInCollection: Record<number, number> = {};
        selectedLineItems.forEach((item, index) => {
            if (item.id !== undefined) {
                idToNumberInCollection[item.id] = index + 1;
            }
        });

        if (ocrProceed && formData.autoInvoice) {
            const autoInvoiceLineItems = lineItems.filter(item => item.autoInvoice);
            const invoiceIds = new Set(autoInvoiceLineItems.map(item => item.invoiceId));

            if (invoiceIds.size > 1) {
                showToast("Can't submit with different Invoice IDs. Please ensure all line items have the same Invoice ID when OCR Proceed is checked", 'warning');
                return;
            }
        }


        // Validate selected line items first
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
                // PRIORITY 1: Check invoicePdfMapping (from draft copy)
                const lineItemNumber = item.lineItemNumber || (index + 1);
                const mappedInvoicePdfs = invoicePdfMapping[lineItemNumber];

                if (mappedInvoicePdfs && mappedInvoicePdfs.length > 0) {
                    // Convert File objects to base64
                    invoiceAssets = await Promise.all(mappedInvoicePdfs.map(async (file) => {
                        const base64 = await convertFileToBase64(file);
                        return {
                            fileName: file.name,
                            contentType: file.type,
                            fileBytes: base64,
                            isSingletonAsset: true,
                            entityType: 'INVOICE_TYPE_PRATTACHMENT',
                            assetType: 'INVOICE_TYPE_PRATTACHMENT'
                        };
                    }));
                }
                // PRIORITY 2: Check item.invoiceAttachments (regular line items)
                else if (item.invoiceAttachments && item.invoiceAttachments.length > 0) {
                    invoiceAssets = await Promise.all(
                        item.invoiceAttachments.map(async (att: any) => {
                            // If it's already an API object with fileBytes, use it directly
                            if (att && !att.file && att.fileBytes) {
                                return {
                                    fileName: att.fileName || att.name || 'document',
                                    contentType: att.contentType || att.type || 'application/pdf',
                                    fileBytes: att.fileBytes,
                                    isSingletonAsset: true,
                                    entityType: 'INVOICE_TYPE_PRATTACHMENT',
                                    assetType: 'INVOICE_TYPE_PRATTACHMENT'
                                };
                            }

                            const actualFile: File = att instanceof File ? att : att.file;
                            const base64 = (actualFile instanceof Blob) ? await convertFileToBase64(actualFile) : "";

                            return {
                                fileName: actualFile?.name || att.fileName || 'document',
                                contentType: actualFile?.type || att.contentType || 'application/pdf',
                                fileBytes: base64 || att.fileBytes || "",
                                isSingletonAsset: true,
                                entityType: 'INVOICE_TYPE_PRATTACHMENT',
                                assetType: 'INVOICE_TYPE_PRATTACHMENT'
                            };
                        })
                    );
                }

            }

            return {
                NumberInCollection: index + 1,
                Venue: item.venue,
                categoryName: item.categoryName,
                Description: item.description,
                Quantity: parseInt(item.quantity || '0') || 0,
                UOM: item.uom || 'EA',
                amount: parseFloat(item.amount) || 0,
                Currency: (item as any).currency || 'AED',
                Vendor: await (async () => {
                    const sup = item.supplier || '';
                    // 1. If "ID - Name" format, extract ID
                    if (sup.includes(' - ')) {
                        return extractVendorCode(sup);
                    }

                    const cleanSup = sup.trim().toLowerCase();

                    // 2. Lookup in local vendorsList
                    const matched = vendorsList.find(v =>
                        v.supplierName.trim().toLowerCase() === cleanSup ||
                        String(v.supplierId) === cleanSup
                    );
                    if (matched) return matched.supplierId;

                    // 3. Fallback to API if not found
                    try {
                        const res = await fetchSuppliers({ search: sup, page_size: 10 });
                        if (res && res.suppliers) {
                            // Try exact name match first
                            const exactMatch = res.suppliers.find((s: any) => s.supplierName.trim().toLowerCase() === cleanSup);
                            if (exactMatch) return exactMatch.supplierId;

                            // If only one result and it's a close match? (Optional, skipping to avoid wrong match)
                        }
                    } catch (e) {
                    }

                    // 4. Return vendorId if it looks like an ID (numeric), otherwise return extraction result (which might be name)
                    // We prefer item.vendorId if it is different from the name
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
                AutoSES: item.autoSES,
                TaxInclude: undefined,
                VendorName: extractVendorCodes(item.supplier),
                AutoInvoices: item.autoInvoice,
                InvoiceID: item.autoInvoice ? item.invoiceId : null,
                InvoiceDate: item.autoInvoice ? item.invoiceDate : null,
                InvoiceComment: item.autoInvoice ? item.invoiceComments : null,
                InvoiceAttachment: item.autoInvoice && invoiceAssets.length > 0 ? invoiceAssets : null,
                ocrProceed: ocrProceed,
                crossCharge: item.crossCharge,
                crossChargeItems: item.crossChargeItems,
                ParentLineItemNumber: item.ParentLineItemNumber ? idToNumberInCollection[item.ParentLineItemNumber] : undefined,
                Percentage: item.percentage,
            };
        }));
        const allAttachments = [...attachments];
        const assetsDto: AssetDto[] = await Promise.all(allAttachments.map(async (att: any) => {
            if (att && !att.file && att.fileBytes) {
                return {
                    fileName: att.fileName || att.name || 'attachment',
                    contentType: att.contentType || att.type || 'application/pdf',
                    fileBytes: att.fileBytes,
                    isSingletonAsset: true,
                    entityType: 'MATERIAL_PR_UPLOAD',
                    assetType: 'MATERIAL_PR_UPLOAD'
                };
            }
            const actualFile: File = att instanceof File ? att : att.file;
            const base64 = (actualFile instanceof Blob) ? await convertFileToBase64(actualFile) : "";

            return {
                fileName: actualFile?.name || att.fileName || 'attachment',
                contentType: actualFile?.type || att.contentType || 'application/pdf',
                fileBytes: base64 || att.fileBytes || "",
                isSingletonAsset: true,
                entityType: 'MATERIAL_PR_UPLOAD',
                assetType: 'MATERIAL_PR_UPLOAD'
            };
        }));

        const payload: CreateMaterialPRPayload = {
            PRRequests: [
                {
                    headerComment: formData.comments,
                    needBy: formData.needBy || new Date().toISOString(),
                    lineItems: lineItemsDto,
                    isHeader: ocrProceed
                }
            ],
            asset: assetsDto
        };
        setSubmitReqDisable(true)
        try {
            const response = await createServicePR(payload);
            if (response && (response.statusCode === 200 || response.statusCode === 201)) {
                setIsCopyMode(false);
                setOriginalCopyData(null);

                let message: React.ReactNode = `${lineItemsDto.length} line item(s) submitted successfully!`;
                if ('data' in response && response.data && Array.isArray(response.data)) {
                    message = (
                        <div>
                            <div style={{ marginBottom: '4px' }}>{lineItemsDto.length} line item(s) submitted successfully!</div>
                            {response.data.map((item: any, index: number) => (
                                <div key={index} style={{ fontSize: '0.9em' }}>
                                    <span
                                        onClick={() => handleNavigateToPr(item.prNumber)}
                                        style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        {item.prNumber}
                                    </span>
                                    {' - '}{item.status}
                                </div>
                            ))}
                        </div>
                    );
                }
                showToast(message, 'success', 60000);

                // Reset form
                setFormData(prev => ({
                    ...prev,
                    venue: '',
                    supplier: '',
                    amount: '',
                    companyCode: "",
                    shipToPlant: "",
                    billTo: "",
                    purchaseOrg: "",
                    purchaseGroup: "",
                    currency: "",
                    deliveryTo: "",
                    taxCode: "",
                    costCenter: "",
                    materialcode: '',
                    contract: null,
                    glAccount: '',
                    uom: 'EA',
                    autoInvoice: false,
                    needBy: getTodayDate(),
                    serviceStartDate: getTodayDate(),
                    serviceEndDate: getMonthEndDate(),
                    quantity: '1',
                    autoSES: true,
                    comments: '',
                    description: '',
                    invoiceId: '',
                    invoiceDate: '',
                    invoiceComments: '',
                    vendor: "",
                    vendorId: '',
                    taxInclude: false,
                }));
                setSelectedLineItemIds([]);
                setLineItems([]);
                setNextId(1);
                setAttachments([]);
                setInvoiceAttachments([]);
                setHeaderPdfFiles([]);
                setInvoicePdfMapping({});
                setSelectAllChecked(false);
            } else {
                showToast('PR creation failed: ' + (response?.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            showToast('An error occurred while submitting the requisition.', 'error');
        } finally {
            setSubmitReqDisable(false);
            setSelectedLineItemId(null);
            setIsDraft(false);
            setEditingId(null);
            setIsCopyMode(false);
            setOriginalCopyData(null);
            setOcrProceed(false);
            setFormData(prev => ({
                ...prev,
                venue: '',
                supplier: '',
                amount: '',
                companyCode: "",
                shipToPlant: "",
                billTo: "",
                purchaseOrg: "",
                purchaseGroup: "",
                currency: "",
                deliveryTo: "",
                taxCode: "",
                costCenter: "",
                materialcode: '',
                contract: null,
                glAccount: '',
                uom: 'EA',
                autoInvoice: false,
                needBy: getTodayDate(),
                serviceStartDate: getTodayDate(),
                serviceEndDate: getMonthEndDate(),
                quantity: '1',
                autoSES: true,
                comments: '',
                description: '',
                invoiceId: '',
                invoiceDate: '',
                invoiceComments: '',
                vendorId: "",
                taxInclude: false,
                crossCharge: false,
                subProperties: [],
                crossChargePercentage: '',
            }));
        }
    };

    const handleSaveAsDraft = () => {
        setIsDraft(true);
    };

    const saveDraft = useCallback(async (errorComment?: string) => {
        try {
            const hasFormData =
                formData.venue || formData.supplier || formData.amount || formData.autoInvoice;

            if (lineItems.length === 0 && !hasFormData) {
                if (onResetExitFlag) onResetExitFlag();
                return;
            }

            const expandCrossChargeItems = (item: LineItem, startId: number): LineItem[] => {
                if (!item.crossCharge || !item.crossChargeItems || item.crossChargeItems.length === 0) {
                    return [item];
                }

                const totalAmount = parseFloat(item.amount || '0');

                // Calculate sub-items first to get their total percentage
                let currentId = startId + 1;
                const subItems: LineItem[] = item.crossChargeItems.map(ci => {
                    const percentage = parseFloat(ci.percentage || '0');
                    const subItemAmount = (totalAmount * percentage) / 100;

                    const subItem: LineItem = {
                        ...item,
                        id: currentId++,
                        venue: ci.subProperty,
                        percentage: ci.percentage,
                        amount: subItemAmount.toFixed(2), // Calculated amount
                        ParentLineItemNumber: startId,
                        crossCharge: true,
                        crossChargeItems: [ci],
                    };
                    return subItem;
                });

                const subItemsTotalPercentage = item.crossChargeItems.reduce(
                    (sum, ci) => sum + parseFloat(ci.percentage || '0'), 0
                );
                const remainingPercentage = 100 - subItemsTotalPercentage;
                const remainingAmount = (totalAmount * remainingPercentage) / 100;

                const mainItem: LineItem = {
                    ...item,
                    id: startId,
                    percentage: String(remainingPercentage),
                    amount: remainingAmount.toFixed(2), // Calculated remaining amount
                    ParentLineItemNumber: undefined,
                };

                return [mainItem, ...subItems];
            };

            let itemsToSave: LineItem[] = [];

            if (lineItems.length > 0) {
                itemsToSave = [...lineItems];

                if (hasFormData && !isCopyMode && editingId === null) {
                    const isFormDataNew = !lineItems.some(
                        item =>
                            item.venue === formData.venue &&
                            item.supplier === formData.supplier &&
                            item.description === formData.description &&
                            item.amount === formData.amount
                    );

                    if (isFormDataNew) {
                        const formAsLineItem: LineItem = {
                            id: nextId,
                            venue: formData.venue,
                            categoryName: formData.category,
                            supplier: formData.supplier,
                            description: formData.description,
                            amount: formData.amount,
                            contract: formData.contract,
                            glAccount: formData.glAccount,
                            uom: formData.uom,
                            quantity: formData.quantity,
                            purchaseOrg: formData.purchaseOrg,
                            costCenter: formData.costCenter,
                            needBy: formData.needBy,
                            serviceStartDate: formData.serviceStartDate,
                            serviceEndDate: formData.serviceEndDate,
                            currency: formData.currency,
                            autoSES: formData.autoSES,
                            autoInvoice: formData.autoInvoice,
                            materialcode: formData.materialcode,
                            purchaseGroup: formData.purchaseGroup,
                            deliveryTo: formData.deliveryTo,
                            taxCode: formData.taxCode,
                            companyCode: formData.companyCode,
                            shipToPlant: formData.shipToPlant,
                            billTo: formData.billTo,
                            taxInclude: formData.taxInclude,
                            invoiceComments: formData.invoiceComments || '',
                            invoiceId: formData.invoiceId || '',
                            invoiceDate: formData.invoiceDate || '',
                            vendorId: formData.vendorId || '',
                            invoiceAttachments: [...invoiceAttachments],
                            crossCharge: formData.crossCharge,
                            crossChargeItems: formData.crossChargeItems,
                            ocrProceed: ocrProceed,
                        };

                        const expanded = expandCrossChargeItems(formAsLineItem, nextId);
                        itemsToSave.push(...expanded);
                    }
                }
            } else if (hasFormData) {
                const formAsLineItem: LineItem = {
                    id: 1,
                    venue: formData.venue,
                    categoryName: formData.category,
                    supplier: formData.supplier,
                    description: formData.description,
                    amount: formData.amount,
                    contract: formData.contract,
                    glAccount: formData.glAccount,
                    uom: formData.uom,
                    quantity: formData.quantity,
                    purchaseOrg: formData.purchaseOrg,
                    costCenter: formData.costCenter,
                    needBy: formData.needBy,
                    serviceStartDate: formData.serviceStartDate,
                    serviceEndDate: formData.serviceEndDate,
                    currency: formData.currency,
                    autoSES: formData.autoSES,
                    autoInvoice: formData.autoInvoice,
                    materialcode: formData.materialcode,
                    purchaseGroup: formData.purchaseGroup,
                    deliveryTo: formData.deliveryTo,
                    taxCode: formData.taxCode,
                    companyCode: formData.companyCode,
                    shipToPlant: formData.shipToPlant,
                    billTo: formData.billTo,
                    taxInclude: formData.taxInclude,
                    invoiceComments: formData.invoiceComments || '',
                    invoiceId: formData.invoiceId || '',
                    invoiceDate: formData.invoiceDate || '',
                    vendorId: formData.vendorId || '',
                    invoiceAttachments: [...invoiceAttachments],
                    crossCharge: formData.crossCharge,
                    crossChargeItems: formData.crossChargeItems,
                    ocrProceed: ocrProceed,
                };

                itemsToSave = expandCrossChargeItems(formAsLineItem, 1);
            }

            if (itemsToSave.length === 0) {
                if (onResetExitFlag) onResetExitFlag();
                return;
            }

            const idToNumberInCollection: Record<number, number> = {};
            itemsToSave.forEach((item, index) => {
                if (item.id !== undefined) {
                    idToNumberInCollection[item.id] = index + 1;
                }
            });

            const lineItemsDto = await Promise.all(
                itemsToSave.map(async (item, index) => {

                    let invoiceAssets: any[] = [];

                    if (item.autoInvoice) {
                        const lineItemNumber = item.lineItemNumber || (index + 1);
                        const mappedPdfs = invoicePdfMapping[lineItemNumber];

                        if (mappedPdfs && mappedPdfs.length > 0) {
                            invoiceAssets = await Promise.all(
                                mappedPdfs.map(async (file: File) => {
                                    const base64 = await convertFileToBase64(file);
                                    return {
                                        fileName: file.name,
                                        contentType: file.type,
                                        fileBytes: base64,
                                        isSingletonAsset: true,
                                        entityType: 'INVOICE_TYPE_PRATTACHMENT',
                                        assetType: 'INVOICE_TYPE_PRATTACHMENT',
                                    };
                                })
                            );
                        } else if (item.invoiceAttachments && item.invoiceAttachments.length > 0) {
                            invoiceAssets = await Promise.all(
                                item.invoiceAttachments.map(async (att: any) => {
                                    if (att && !att.file && att.fileBytes) {
                                        return {
                                            fileName: att.fileName || att.name || 'document',
                                            contentType: att.contentType || att.type || 'application/pdf',
                                            fileBytes: att.fileBytes,
                                            isSingletonAsset: true,
                                            entityType: 'INVOICE_TYPE_PRATTACHMENT',
                                            assetType: 'INVOICE_TYPE_PRATTACHMENT'
                                        };
                                    }

                                    const actualFile: File = att instanceof File ? att : att.file;
                                    const base64 = (actualFile instanceof Blob) ? await convertFileToBase64(actualFile) : "";

                                    return {
                                        fileName: actualFile?.name || att.fileName || 'document',
                                        contentType: actualFile?.type || att.contentType || 'application/pdf',
                                        fileBytes: base64 || att.fileBytes || "",
                                        isSingletonAsset: true,
                                        entityType: 'INVOICE_TYPE_PRATTACHMENT',
                                        assetType: 'INVOICE_TYPE_PRATTACHMENT',
                                    };
                                })
                            );
                        }
                    }

                    const resolvedVendor = await (async () => {
                        const sup = item.supplier || '';
                        if (sup.includes(' - ')) return extractVendorCode(sup);

                        const cleanSup = sup.trim().toLowerCase();
                        const matched = vendorsList.find(
                            v =>
                                v.supplierName.trim().toLowerCase() === cleanSup ||
                                String(v.supplierId) === cleanSup
                        );
                        if (matched) return matched.supplierId;

                        try {
                            const res = await fetchSuppliers({ search: sup, page_size: 10 });
                            if (res?.suppliers) {
                                const exactMatch = res.suppliers.find(
                                    (s: any) => s.supplierName.trim().toLowerCase() === cleanSup
                                );
                                if (exactMatch) return exactMatch.supplierId;
                            }
                        } catch (e) { }

                        if (item.vendorId && item.vendorId !== sup) return item.vendorId;
                        return extractVendorCode(sup);
                    })();

                    return {
                        numberInCollection: index + 1,
                        venue: item.venue,
                        categoryName: item.categoryName,
                        description: item.description,
                        quantity: parseInt(item.quantity || '0') || 0,
                        uom: item.uom || 'EA',
                        amount: parseFloat(item.amount) || 0,
                        currency: item.currency || 'AED',
                        vendor: resolvedVendor,
                        contract: extractCode(item.contract) || null,
                        purchaseOrg: item.purchaseOrg || '',
                        glAccount: item.glAccount || '',
                        costCenter: extractCode(item.costCenter),
                        materialCode: item.materialcode || '',
                        needBy: item.needBy,
                        taxCode: item.taxCode || '',
                        AutoSES: item.autoSES,
                        taxInclude: item.taxInclude,
                        vendorName: extractVendorCodes(item.supplier),
                        autoInvoices: item.autoInvoice,
                        invoiceID: item.autoInvoice ? item.invoiceId || null : null,
                        invoiceDate: item.autoInvoice ? item.invoiceDate || null : null,
                        invoiceComment: item.autoInvoice ? item.invoiceComments || null : null,
                        invoiceAttachment: item.autoInvoice && invoiceAssets.length > 0
                            ? invoiceAssets
                            : null,
                        errorComment: errorComment || null,
                        crossCharge: item.crossCharge,
                        parentLineItem: item.ParentLineItemNumber ? idToNumberInCollection[item.ParentLineItemNumber] : null,
                        percentage: item.percentage != null
                            ? parseFloat(String(item.percentage))
                            : null,
                    };
                })
            );

            const assetsDto = await Promise.all(
                attachments.map(async (att: any) => {
                    if (att && !att.file && att.fileBytes) {
                        return {
                            fileName: att.fileName || att.name || 'attachment',
                            contentType: att.contentType || att.type || 'application/pdf',
                            fileBytes: att.fileBytes,
                            isSingletonAsset: true,
                            entityType: 'MATERIAL_PR_UPLOAD',
                            assetType: 'MATERIAL_PR_UPLOAD',
                        };
                    }

                    const actualFile: File = att instanceof File ? att : att.file;
                    const base64 = (actualFile instanceof Blob) ? await convertFileToBase64(actualFile) : "";

                    return {
                        fileName: actualFile?.name || att.fileName || 'attachment',
                        contentType: actualFile?.type || att.contentType || 'application/pdf',
                        fileBytes: base64 || att.fileBytes || "",
                        isSingletonAsset: true,
                        entityType: 'MATERIAL_PR_UPLOAD',
                        assetType: 'MATERIAL_PR_UPLOAD',
                    };
                })
            );

            const payload = {
                prRequests: [
                    {
                        headerComment: formData.comments || '',
                        needBy: formData.needBy || new Date().toISOString(),
                        lineItems: lineItemsDto,
                    },
                ],
                asset: assetsDto,
            };

            const response = await createMaterialPRDraft(payload as any);

            if (response && (response.statusCode === 200 || response.statusCode === 201)) {
                showToast(
                    `Draft saved with ${lineItemsDto.length} line item(s)`,
                    'success',
                    2000
                );
                setIsCopyMode(false);
                setIsDraftCopyMode(false);
                setOriginalCopyData(null);
                setLineItems([]);
                setNextId(1);
                setSelectedLineItemIds([]);
                setAttachments([]);
                setInvoiceAttachments([]);
                setFormData({
                    venue: '',
                    supplier: '',
                    description: '',
                    amount: '',
                    costCenter: '',
                    companyCode: '',
                    shipToPlant: '',
                    billTo: '',
                    purchaseOrg: '',
                    purchaseGroup: '',
                    currency: '',
                    category: '',
                    deliveryTo: '',
                    materialcode: '',
                    contract: null,
                    glAccount: '',
                    uom: 'EA',
                    autoInvoice: false,
                    needBy: getTodayDate(),
                    serviceStartDate: getTodayDate(),
                    serviceEndDate: getMonthEndDate(),
                    quantity: '1',
                    autoSES: true,
                    comments: '',
                    invoiceId: '',
                    invoiceDate: '',
                    invoiceComments: '',
                    vendorId: '',
                    taxCode: '',
                    taxInclude: false,
                    crossCharge: false,
                    crossChargeItems: [],
                });
            } else {
                showToast(
                    'Failed to save draft: ' + (response?.message || 'Unknown error'),
                    'error'
                );
            }
        } catch (error) {
            showToast('An error occurred while saving the draft.', 'error');
        } finally {
            setIsDraft(false);
            if (onResetExitFlag) onResetExitFlag();
        }
    }, [
        lineItems,
        formData,
        invoiceAttachments,
        attachments,
        nextId,
        onResetExitFlag,
        isCopyMode,
        editingId,
        ocrProceed,
        invoicePdfMapping,
        vendorsList,
    ]);
    useEffect(() => {
        window.savePRDraft = saveDraft;
        return () => {
            window.savePRDraft = undefined;
        };
    }, [saveDraft]);
    const fetchVendorsData = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
        setVendorLoading(true);
        try {
            const response = await fetchSuppliers({
                page: index,
                page_size: 10,
                ...(search && { search }),
            });

            if (response && response.suppliers) {
                if (response.suppliers.length === 0) {
                    setHasMoreVendors(false);
                    return;
                }

                if (index === 0) {
                    if (search === '') {
                        setVendorsList(prev => {
                            const newIds = new Set(response.suppliers.map((s: any) => s.supplierId));
                            const preserved = prev.filter(p => !newIds.has(p.supplierId));
                            return [...response.suppliers, ...preserved];
                        });
                    } else {
                        setVendorsList(response.suppliers);
                    }
                } else {
                    setVendorsList(prev => {
                        const existingIds = new Set(prev.map(v => v.supplierId));
                        const newSuppliers = response.suppliers.filter((v: any) => !existingIds.has(v.supplierId));
                        return [...prev, ...newSuppliers];
                    });
                }

                setHasMoreVendors(true);
            } else {
                setHasMoreVendors(false);
            }
        } catch (error: any) {
            if (error?.status === 401) {
                return;
            }
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
            const nextIndex = currentVendorIndex + 10;
            setCurrentVendorIndex(nextIndex);
            fetchVendorsData(nextIndex, vendorSearch);
        }
    }, [currentVendorIndex, hasMoreVendors, vendorSearch, fetchVendorsData, vendorLoading]);

    useEffect(() => {
        fetchVendorsData(0, '');
    }, [fetchVendorsData]);

    useEffect(() => {
        const currentSupplier = formData.supplier;
        if (currentSupplier && !currentSupplier.includes(' - ')) {
            const matched = vendorsList.find(v => v.supplierId === currentSupplier);
            if (matched) {
                setFormData(prev => ({ ...prev, supplier: `${matched.supplierId} - ${matched.supplierName}` }));
                lastSearchedSupplierRef.current = null;
            } else {
                if (lastSearchedSupplierRef.current !== currentSupplier) {
                    lastSearchedSupplierRef.current = currentSupplier;
                    fetchVendorsData(0, currentSupplier);
                }
            }
        }
    }, [formData.supplier, vendorsList, fetchVendorsData]);

    const fetchVenueData = useCallback(async (index: number = 0, search: string = ''): Promise<void> => {
        setVenueLoading(true);
        try {
            const response = await vendorPublicRelationData({
                page: index,
                page_size: 10,
                ...(search && { search }),
            });

            if (response && response.suppliers) {
                if (response.suppliers.length === 0) {
                    setHasMoreVenues(false);
                    return;
                }

                if (index === 0) {
                    setVenuesList(response.suppliers);
                } else {
                    setVenuesList(prev => {
                        const combined = [...prev, ...response.suppliers];
                        return combined;
                    });
                }

                setHasMoreVenues(true);
            } else {
                setHasMoreVenues(false);
            }
        } catch (error: any) {
            if (error?.status === 401) {
                return;
            }
            if (index === 0) setVenuesList([]);
            setHasMoreVenues(false);
        } finally {
            setVenueLoading(false);
        }
    }, []);

    const handleVenueSearch = useCallback((search: string) => {
        setVenueSearch(search);
        setCurrentVenueIndex(0);
        setHasMoreVenues(true);
        fetchVenueData(0, search);
    }, [fetchVenueData]);

    const handleLoadMoreVenues = useCallback(() => {
        if (hasMoreVenues && !venueLoading) {
            const nextIndex = currentVenueIndex + 10;
            setCurrentVenueIndex(nextIndex);
            fetchVenueData(nextIndex, venueSearch);
        }
    }, [currentVenueIndex, hasMoreVenues, venueSearch, fetchVenueData, venueLoading]);

    useEffect(() => {
        fetchVenueData(0, '');
    }, [fetchVenueData]);

    const mapPrDataToState = async (data: any) => {
        const rawLines = data.lineItems || data.LineItems || [];
        const firstLine = rawLines.length > 0 ? rawLines[0] : {};

        const newForm = {
            venue: firstLine.venue || firstLine.Venue || data.venue || data.Venue || '',
            category: firstLine.categoryName || firstLine.CategoryName || data.categoryName || data.CategoryName || '',
            serviceStartDate: formatDateForInput(firstLine.serviceStartDate || data.serviceStartDate),
            serviceEndDate: formatDateForInput(firstLine.serviceEndDate || data.serviceEndDate),

            supplierRes: await (async () => {
                const val = firstLine.vendor || firstLine.Vendor || firstLine.supplier ||
                    data.Vendor || data.vendor || data.supplier || '';
                const name = firstLine.vendorName || firstLine.VendorName ||
                    data.VendorName || data.vendorName || '';
                if (val && val.includes(' - ')) return val;
                const matched = vendorsList.find(v => v.supplierId === val);
                if (matched) return `${matched.supplierId} - ${matched.supplierName}`;
                if (val && name && val !== name) return `${val} - ${name}`;
                return val || '';
            })(),

            description: firstLine.description || firstLine.Description ||
                data.description || data.Description || '',
            amount: String(firstLine.amount || firstLine.Amount || firstLine.price || firstLine.Price ||
                data.Amount || data.amount || data.Price || data.TotalCost || ''),
            companyCode: firstLine.companyCode || firstLine.CompanyCode ||
                data.CompanyCode || data.companyCode || '',
            shipToPlant: firstLine.shipToPlant || firstLine.ShipToPlant ||
                data.ShipToPlant || data.shipToPlant || '',
            billTo: firstLine.billTo || firstLine.BillTo ||
                data.BillTo || data.billTo || '',
            purchaseOrg: firstLine.purchaseOrg || firstLine.PurchaseOrg ||
                data.PurchaseOrg || data.purchaseOrg || '',
            purchaseGroup: firstLine.purchaseGroup || firstLine.PurchaseGroup ||
                data.PurchaseGroup || data.purchaseGroup || '',
            currency: firstLine.currency || firstLine.Currency ||
                data.Currency || data.currency || '',
            deliveryTo: firstLine.deliverTo || firstLine.DeliverTo || firstLine.deliveryTo ||
                data.DeliverTo || data.deliverTo || data.deliveryTo || '',
            taxCode: firstLine.taxCode || firstLine.TaxCode ||
                data.TaxCode || data.taxCode || '',
            costCenter: firstLine.costCenter || firstLine.CostCenter ||
                data.CostCenter || data.costCenter || '',
            materialcode: firstLine.materialCode || firstLine.MaterialCode ||
                data.MaterialCode || data.materialCode,
            contract: firstLine.contract || firstLine.Contract ||
                data.Contract || data.contract || null,
            glAccount: firstLine.glAccount || firstLine.GLAccount ||
                data.GLAccount || data.glAccount || '',
            uom: firstLine.uom || firstLine.UOM ||
                data.UOM || data.uom || 'EA',
            autoInvoice: firstLine.autoInvoices !== undefined ? firstLine.autoInvoices :
                (firstLine.autoInvoice !== undefined ? firstLine.autoInvoice :
                    (firstLine.AutoInvoices !== undefined ? firstLine.AutoInvoices :
                        (firstLine.AutoInvoice !== undefined ? firstLine.AutoInvoice :
                            (data.autoInvoices !== undefined ? data.autoInvoices :
                                (data.autoInvoice !== undefined ? data.autoInvoice :
                                    (data.AutoInvoices !== undefined ? data.AutoInvoices :
                                        (data.AutoInvoice !== undefined ? data.AutoInvoice : false))))))),

            needBy: formatDateForInput(firstLine.needBy || firstLine.NeedBy ||
                data.NeedBy || data.needBy) || formatDateForInput(date),
            quantity: String(firstLine.quantity || firstLine.Quantity ||
                data.Quantity || data.quantity || '1'),
            autoSES: firstLine.autoSES !== undefined ? firstLine.autoSES :
                (firstLine.AutoSES !== undefined ? firstLine.AutoSES :
                    (data.AutoSES !== undefined ? data.AutoSES : true)),
            comments: data.headerComment || data.HeaderComment || data.comments || '',
            invoiceId: firstLine.invoiceID || firstLine.invoiceId || firstLine.InvoiceID || firstLine.InvoiceId ||
                data.invoiceID || data.invoiceId || data.InvoiceID || data.InvoiceId || '',
            invoiceDate: formatDateForInput(firstLine.invoiceDate || firstLine.InvoiceDate ||
                data.invoiceDate || data.InvoiceDate) || '',
            invoiceComments: firstLine.invoiceComment || firstLine.invoiceComments ||
                firstLine.InvoiceComment || firstLine.InvoiceComments ||
                data.invoiceComment || data.invoiceComments ||
                data.InvoiceComment || data.InvoiceComments || '',
            vendorId: (firstLine.vendor || firstLine.Vendor || data.Vendor || data.vendor || '').includes(' - ')
                ? extractVendorCode(firstLine.vendor || firstLine.Vendor || data.Vendor || data.vendor || '')
                : (firstLine.vendor || firstLine.Vendor || data.Vendor || data.vendor || ''),
            taxInclude: firstLine.taxInclude !== undefined ? firstLine.taxInclude :
                (firstLine.TaxInclude !== undefined ? firstLine.TaxInclude :
                    (data.taxInclude !== undefined ? data.taxInclude :
                        (data.TaxInclude !== undefined ? data.TaxInclude : false))),
            crossCharge: firstLine.crossCharge !== undefined ? firstLine.crossCharge :
                (firstLine.CrossCharge !== undefined ? firstLine.CrossCharge :
                    (data.crossCharge !== undefined ? data.crossCharge :
                        (data.CrossCharge !== undefined ? data.CrossCharge : false))),
            crossChargeItems: firstLine.crossChargeItems || firstLine.CrossChargeItems || data.crossChargeItems || data.CrossChargeItems || [],
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
                    venue: line.venue || line.Venue || '',

                    supplier: lineSupplierRes,

                    description: line.description || line.Description || '',
                    amount: String(line.price || line.Price || line.amount || line.Amount || ''),
                    contract: line.contract || line.Contract || null,
                    glAccount: line.glAccount || line.GLAccount || '',
                    uom: line.uom || line.UOM || 'EA',
                    quantity: String(line.quantity || line.Quantity || '1'),
                    purchaseOrg: line.purchaseOrg || line.PurchaseOrg || '',
                    purchaseGroup: line.purchaseGroup || line.PurchaseGroup || '',
                    companyCode: line.companyCode || line.CompanyCode || '',
                    shipToPlant: line.shipToPlant || line.ShipToPlant || '',
                    billTo: line.billTo || line.BillTo || '',
                    deliveryTo: line.deliverTo || line.DeliverTo || line.deliveryTo || '',
                    costCenter: line.costCenter || line.CostCenter || '',
                    needBy: formatDateForInput(line.needBy || line.NeedBy) || '',
                    serviceStartDate: formatDateForInput(line.serviceStartDate || line.ServiceStartDate) || '',
                    serviceEndDate: formatDateForInput(line.serviceEndDate || line.ServiceEndDate) || '',
                    currency: line.currency || line.Currency || 'AED',
                    autoSES: line.autoSES !== undefined ? line.autoSES :
                        (line.AutoSES !== undefined ? line.AutoSES : true),

                    vendorId: (lineSupplierRes && lineSupplierRes.includes(' - ')) ? extractVendorCode(lineSupplierRes) : (line.vendor || line.Vendor || line.vendorId || ''),

                    autoInvoice: line.autoInvoices !== undefined ? line.autoInvoices :
                        (line.autoInvoice !== undefined ? line.autoInvoice :
                            (line.AutoInvoices !== undefined ? line.AutoInvoices :
                                (line.AutoInvoice !== undefined ? line.AutoInvoice : false))),

                    materialcode: line.materialCode || line.materialcode || line.MaterialCode,
                    taxCode: line.taxCode || line.TaxCode || '',
                    taxInclude: line.taxInclude !== undefined ? line.taxInclude :
                        (line.TaxInclude !== undefined ? line.TaxInclude : false),
                    invoiceComments: line.invoiceComment || line.invoiceComments ||
                        line.InvoiceComment || line.InvoiceComments || '',
                    invoiceId: line.invoiceID || line.invoiceId || line.InvoiceID || line.InvoiceId || '',
                    invoiceDate: formatDateForInput(line.invoiceDate || line.InvoiceDate) || '',
                    invoiceAttachments: line.invoiceAttachments || [],
                };
            }));
        } else {
            lines = [{
                ...newForm,
                id: 1,
                supplier: newForm.supplierRes,
                taxInclude: newForm.taxInclude,
                invoiceComments: newForm.invoiceComments,
                invoiceAttachments: [],
            }];
        }

        setLineItems(lines);
        setNextId(lines.length + 1);
        return { ...newForm, supplier: newForm.supplierRes, lineItems: lines };
    };

    const mapDraftDataToState = async (data: any) => {
        const rawLines = data.lineItems || data.LineItems ||
            (data.PRRequests && data.PRRequests[0]?.lineItems) ||
            (data.prRequests && data.prRequests[0]?.lineItems) || [];

        const firstLine = rawLines.length > 0 ? rawLines[0] : {};
        const getVal = (keys: string[]) => {
            const headerSource = (data.PRRequests && data.PRRequests[0]) || (data.prRequests && data.prRequests[0]);
            if (headerSource) {
                for (const key of keys) {
                    if (headerSource[key] !== undefined && headerSource[key] !== null) return headerSource[key];
                }
            }

            for (const key of keys) {
                if (data[key] !== undefined && data[key] !== null) return data[key];
            }
            for (const key of keys) {
                if (firstLine[key] !== undefined && firstLine[key] !== null) return firstLine[key];
            }
            return undefined;
        };

        const newForm = {
            venue: getVal(['Venue', 'venue']) || '',
            category: getVal(['Category', 'category']) || '',
            supplierRes: await (async () => {
                const val = getVal(['Vendor', 'vendor', 'supplier', 'vendorId', 'VendorId']) || '';
                const name = getVal(['VendorName', 'vendorName', 'supplierName']) || '';
                if (val && val.includes(' - ')) return val;

                const matched = vendorsList.find(v => v.supplierId === val || v.supplierName.toLocaleLowerCase() === val.toLocaleLowerCase());
                if (matched) return `${matched.supplierId} - ${matched.supplierName}`;

                if (val && name && val !== name) return `${val} - ${name}`;
                try {
                    const res = await fetchSuppliers({
                        page: 0,
                        page_size: 10, search: val,
                    });
                    if (res && res.suppliers) {
                        const normVal = String(val).trim().toLowerCase();
                        const match = res.suppliers.find((s: any) => {
                            const idMatch = String(s.supplierId).trim() == String(val).trim();
                            const nameMatch = s.supplierName && String(s.supplierName).trim().toLowerCase() === normVal;
                            return idMatch || nameMatch;
                        });
                        if (match) {
                            setVendorsList(prev => {
                                if (!prev.find(p => p.supplierId === match.supplierId)) return [...prev, match];
                                return prev;
                            });
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
            serviceStartDate: formatDateForInput(getVal(['serviceStartDate', 'ServiceStartDate'])),
            serviceEndDate: formatDateForInput(getVal(['serviceEndDate', 'ServiceEndDate'])),
            quantity: String(getVal(['Quantity', 'quantity']) || ''),
            autoSES: getVal(['AutoSES', 'autoSES']) !== undefined ? getVal(['AutoSES', 'autoSES']) : true,
            comments: getVal(['HeaderComment', 'headerComment']) || '',
            invoiceId: getVal(['invoiceId', 'InvoiceId', 'invoiceID', 'InvoiceID']) || '',
            invoiceDate: formatDateForInput(getVal(['invoiceDate', 'InvoiceDate'])) || '',
            invoiceComments: getVal(['invoiceComments', 'InvoiceComments']) || '',
            vendorId: (getVal(['Vendor', 'vendor', 'vendorId']) || '').includes(' - ')
                ? extractVendorCode(getVal(['Vendor', 'vendor', 'vendorId']) || '')
                : (getVal(['Vendor', 'vendor', 'vendorId']) || ''),
            taxInclude: getVal(['taxInclude', 'TaxInclude']) !== undefined ? getVal(['taxInclude', 'TaxInclude']) : false,
            crossCharge: getVal(['crossCharge', 'CrossCharge']) !== undefined ? getVal(['crossCharge', 'CrossCharge']) : false,
            crossChargeItems: getVal(['crossChargeItems', 'CrossChargeItems']) || [],
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
                            const match = res.suppliers.find((s: any) => {
                                const idMatch = String(s.supplierId).trim() == String(val).trim();
                                const nameMatch = s.supplierName && String(s.supplierName).trim().toLowerCase() === normVal;
                                return idMatch || nameMatch;
                            });
                            if (match) {
                                setVendorsList(prev => {
                                    if (!prev.find(p => p.supplierId === match.supplierId)) return [...prev, match];
                                    return prev;
                                });
                                return `${match.supplierId} - ${match.supplierName}`;
                            }
                        }
                    } catch (e) { }

                    return val || name || '';
                })();

                return {
                    id: index + 1,
                    venue: line.Venue || line.venue || newForm.venue,
                    supplier: lineSupplierRes,
                    description: line.Description || line.description || newForm.description,
                    amount: String(line.Price || line.Amount || line.amount || newForm.amount),
                    contract: line.Contract || line.contract || newForm.contract,
                    glAccount: line.GLAccount || line.glAccount || newForm.glAccount,
                    uom: line.UOM || line.uom || newForm.uom || "EA",
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
                    autoSES: line.AutoSES !== undefined ? line.AutoSES : (line.autoSES !== undefined ? line.autoSES : newForm.autoSES),

                    autoInvoice: line.AutoInvoices !== undefined ? line.AutoInvoices :
                        (line.autoInvoices !== undefined ? line.autoInvoices :
                            (line.AutoInvoice !== undefined ? line.AutoInvoice :
                                (line.autoInvoice !== undefined ? line.autoInvoice : newForm.autoInvoice))),

                    materialcode: line.MaterialCode || line.materialcode || line.materialCode || newForm.materialcode,
                    taxCode: line.TaxCode || line.taxCode || newForm.taxCode,
                    taxInclude: line.taxInclude !== undefined ? line.taxInclude : (line.TaxInclude !== undefined ? line.TaxInclude : false),
                    invoiceComments: line.invoiceComments || line.InvoiceComments || '',
                    invoiceId: line.invoiceId || line.InvoiceId || line.invoiceID || line.InvoiceID || (newForm.autoInvoice ? newForm.invoiceId : ''),
                    invoiceDate: formatDateForInput(line.invoiceDate || line.InvoiceDate) || (newForm.autoInvoice ? newForm.invoiceDate : ''),
                    vendorId: (lineSupplierRes && lineSupplierRes.includes(' - ')) ? extractVendorCode(lineSupplierRes) : (line.vendor || line.Vendor || line.vendorId || ''),
                    invoiceAttachments: line.invoiceAttachments || line.invoiceAttachment || [],
                };
            }));
        } else {
            lines = [{
                ...newForm,
                id: 1,
                supplier: newForm.supplierRes,
                taxInclude: false,
                invoiceComments: '',
            }];
        }
        setLineItems(lines);
        setNextId(lines.length + 1);
        return { ...newForm, supplier: newForm.supplierRes, lineItems: lines };
    };

    const handleEditPrFromSummary = (data: any) => {
        navigate('../edit', { state: { prData: data }, relative: 'path' });
    };

    const handleCopyPrFromSummary = async (data: any) => {
        const isDraft = data.draftID !== undefined || data.DraftID !== undefined;
        let newForm = isDraft ? await mapDraftDataToState(data) : await mapPrDataToState(data);


        if (isDraft) {
            try {
                const smartDefaults = await getPRSmartDefaults();

                let venueDetails: any = null;
                if (newForm.venue) {
                    try {
                        const venueResp = await getDetails({ search: newForm.venue });
                        if (venueResp && venueResp.suppliers) {
                            venueDetails = venueResp.suppliers;
                        }
                    } catch (vErr) {
                    }
                }
                newForm = {
                    ...newForm,
                    currency: newForm.currency || "AED",
                    deliveryTo: newForm.deliveryTo || smartDefaults.deliverTo || "",
                    companyCode: newForm.companyCode || venueDetails?.companyCode || smartDefaults.companyCode || "",
                    purchaseOrg: newForm.purchaseOrg || venueDetails?.purchaseOrg || smartDefaults.purchaseOrg || "",
                    purchaseGroup: newForm.purchaseGroup || venueDetails?.purchaseGroup || smartDefaults.purchaseGroup || "",
                    shipToPlant: newForm.shipToPlant || venueDetails?.shipToPlant || smartDefaults.shipToPlant || "",
                    billTo: newForm.billTo || venueDetails?.billTo || smartDefaults.billTo || "",
                    costCenter: newForm.costCenter || venueDetails?.costCenter || smartDefaults.costCenter || "",
                    glAccount: newForm.glAccount || venueDetails?.glAccount || smartDefaults.glAccount || "",

                    contract: newForm.contract || smartDefaults.contract || null,
                    uom: newForm.uom || smartDefaults.uom || "EA",
                    materialcode: newForm.materialcode || smartDefaults.materialCode,
                    taxCode: newForm.taxCode || smartDefaults.taxCode || "",
                };
            } catch (error) {
            }
        }

        setOriginalCopyData(newForm);
        setFormData(newForm);
        navigate('../', { relative: 'path' });
        setIsCopyMode(true);
        setIsDraftCopyMode(isDraft);

        if (data.headerAttachmentFiles && data.headerAttachmentFiles.length > 0) {
            setAttachments(data.headerAttachmentFiles);
        }

        if (data.invoiceMapping) {
            setInvoicePdfMapping(data.invoiceMapping);
        }

        if (newForm.autoInvoice) {
            const firstLineItemData = data.lineItems?.[0];
            const lineItemNumber = firstLineItemData?.lineItemNumber || 1;

            const formInvoicePdfs = (firstLineItemData?.invoiceAttachmentFiles && firstLineItemData.invoiceAttachmentFiles.length > 0)
                ? firstLineItemData.invoiceAttachmentFiles
                : (data.invoiceMapping?.[lineItemNumber] || []);

            if (formInvoicePdfs.length > 0) {
                setInvoiceAttachments(formInvoicePdfs);
            }
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
                    if (!isDraft) {
                        parts.push('(Copy)');
                    }

                    const lineItemData = data.lineItems?.[index];
                    const lineItemNumber = lineItemData?.lineItemNumber || (index + 1);

                    const invoicePdfs = (lineItemData?.invoiceAttachmentFiles && lineItemData.invoiceAttachmentFiles.length > 0)
                        ? lineItemData.invoiceAttachmentFiles
                        : (data.invoiceMapping?.[lineItemNumber] || []);

                    return {
                        id: index + 1,
                        venue: venue,
                        supplier: supplier,
                        vendorId: (supplier && supplier.includes(' - ')) ? extractVendorCode(supplier) : (currentLineMapped?.vendorId || newForm.vendorId || ''),
                        description: isDraft ? (line.Description || line.description || newForm.description) : (parts.length > 1 ? parts.join('-') : (line.Description || line.description || newForm.description) + '-(Copy)'),
                        amount: String(line.Price || line.Amount || line.amount || line.price || newForm.amount),
                        contract: line.Contract || line.contract || newForm.contract,
                        glAccount: line.GLAccount || line.glAccount || newForm.glAccount,
                        uom: line.UOM || line.uom || newForm.uom || "EA",
                        quantity: String(line.Quantity || line.quantity || newForm.quantity),
                        purchaseOrg: line.PurchaseOrg || line.purchaseOrg || newForm.purchaseOrg,
                        purchaseGroup: line.PurchaseGroup || line.purchaseGroup || newForm.purchaseGroup,
                        companyCode: line.CompanyCode || line.companyCode || newForm.companyCode,
                        shipToPlant: line.ShipToPlant || line.shipToPlant || newForm.shipToPlant,
                        billTo: line.BillTo || line.billTo || newForm.billTo,
                        deliveryTo: line.DeliverTo || line.deliverTo || line.deliveryTo || newForm.deliveryTo,
                        costCenter: line.CostCenter || line.costCenter || newForm.costCenter,
                        needBy: needBy,
                        currency: line.Currency || line.currency || newForm.currency,
                        autoSES: line.AutoSES !== undefined ? line.AutoSES : (line.autoSES !== undefined ? line.autoSES : newForm.autoSES),
                        autoInvoice: line.AutoInvoices !== undefined ? line.AutoInvoices :
                            (line.autoInvoices !== undefined ? line.autoInvoices :
                                (line.AutoInvoice !== undefined ? line.AutoInvoice :
                                    (line.autoInvoice !== undefined ? line.autoInvoice : newForm.autoInvoice))),
                        materialcode: line.MaterialCode || line.materialcode || line.materialCode || newForm.materialcode,
                        taxCode: line.TaxCode || line.taxCode || newForm.taxCode,
                        taxInclude: line.taxInclude !== undefined ? line.taxInclude : (line.TaxInclude !== undefined ? line.TaxInclude : newForm.taxInclude),
                        invoiceComments: line.invoiceComments || line.InvoiceComments || '',
                        invoiceId: line.invoiceId || line.InvoiceId || line.invoiceID || line.InvoiceID || (newForm.autoInvoice ? newForm.invoiceId : ''),
                        invoiceDate: formatDateForInput(line.invoiceDate || line.InvoiceDate) || (newForm.autoInvoice ? newForm.invoiceDate : ''),
                        invoiceAttachments: invoicePdfs,
                        lineItemNumber: lineItemNumber
                    };
                });
            } else {
                return [{
                    ...newForm,
                    id: 1,
                    supplier: newForm.supplier,
                    taxInclude: newForm.taxInclude,
                    invoiceComments: newForm.invoiceComments || '',
                    invoiceAttachments: [],
                    vendorId: newForm.vendorId || ''
                }];
            }
        });

        setFormData(prev => ({
            ...prev,
            comments: (newForm.comments || ''),
            description: newForm?.description?.trim(),
        }));
    };

    useEffect(() => {
        if (isCopyMode && originalCopyData) {
            const parts = [];
            if (formData.venue) parts.push(formData.venue);
            if (formData.supplier) parts.push(extractVendorCodes(formData.supplier));
            if (formData.needBy) parts.push(formData.needBy);

            if (!isDraftCopyMode) {
                parts.push('(Copy)');
            }

            if (parts.length > 0) {
                const newDesc = parts.join('-');
                if (formData.description !== newDesc) {
                    setFormData(prev => ({ ...prev, description: newDesc }));
                }
            }
        } else if (!isCopyMode) {
            const parts: string[] = [];
            if (formData.venue) parts.push(formData.venue);
            if (formData.supplier) parts.push(extractVendorCodes(formData.supplier));
            if (formData.needBy) parts.push(formData.needBy);

            const newDesc = parts.join(' - ');
            if (newDesc && formData.description !== newDesc && (formData.venue || formData.supplier)) {
                setFormData(prev => ({ ...prev, description: newDesc }));
            }
        }
    }, [formData.venue, formData.supplier, formData.needBy, isCopyMode, isDraftCopyMode, originalCopyData, editingId]);

    const validationFields = [
        { key: 'venue', label: 'Venue' },
        { key: 'purchaseOrg', label: 'Purchase Org' },
        { key: 'description', label: 'Description' },
        { key: 'contract', label: 'Contract' },
        { key: 'purchaseGroup', label: 'Purchase Group' },
        { key: 'needBy', label: 'Need By Date' },
        { key: 'amount', label: 'Amount' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'glAccount', label: 'GL Account' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'costCenter', label: 'Cost Center' },
        { key: 'companyCode', label: 'Company Code' },
        { key: 'shipToPlant', label: 'Ship-to Plant' },
        { key: 'billTo', label: 'Bill-to' },
        { key: 'currency', label: 'Currency' },
        { key: 'deliveryTo', label: 'Delivery To' },
        { key: 'materialcode', label: 'Material Code' },
        { key: 'taxCode', label: 'Tax Code' },
        { key: 'uom', label: 'Uom' },
        { key: 'taxInclude', label: 'Includes Tax' }
    ];

    useEffect(() => {
        if (userId) {
            if (vendorsList.length === 0) fetchVendorsData(0, '');
            if (venuesList.length === 0) fetchVenueData(0, '');
        }
    }, [userId, vendorsList.length, venuesList.length, fetchVendorsData, fetchVenueData]);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const responce = await getPRSmartDefaults();
                if ('companyCode' in responce) {
                    setFormData(prev => ({
                        ...prev,
                        currency: "AED",
                        deliveryTo: responce.deliverTo,
                    }));
                }
            } catch (error: any) {
                if (error?.status === '401') {
                    return;
                }
            }
        };
        fetchUserInfo();
    }, [userId]);

    useEffect(() => {
        if (exitConfirmed || isDraft) {
            saveDraft();
        }
    }, [exitConfirmed, isDraft, saveDraft]);

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
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (!submitReqDisable) {
                    handleSaveAsDraft();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [submitReqDisable]);

    useEffect(() => {
        if (onViewModeChange) {
            onViewModeChange(currentViewMode as any);
        }
    }, [currentViewMode, onViewModeChange]);
    const handleBack = useCallback(() => {
        navigate('..', { relative: 'path' });
        setTargetPrNumber(null);
    }, [navigate]);

    const performBackNavigation = useCallback(() => {
        const path = location.pathname;
        if (path.endsWith('/summary') || path.endsWith('/edit') || path.endsWith('/draft')) {
            handleBack();
        } else if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    }, [location.pathname, handleBack, onBack, navigate]);

    const handleNavigateBack = () => {
        if (isDirty) {
            setPendingAction(null);
            setShowExitModal(true);
        } else {
            performBackNavigation();
        }
    };

    const handleManualProceed = useCallback(() => {
        setIsProceeding(true);
        setShowExitModal(false);
        setTimeout(() => {
            if (pendingAction) {
                if (pendingAction.type === 'path') {
                    navigate(pendingAction.value);
                } else if (pendingAction.type === 'mode' && onTypeChange) {
                    onTypeChange(pendingAction.value as 'Material' | 'Service');
                }
                setPendingAction(null);
            } else {
                performBackNavigation();
            }
        }, 0);
    }, [pendingAction, navigate, onTypeChange, performBackNavigation]);

    const handleManualNavigate = useCallback((to: string) => {
        if (isDirty) {
            setPendingAction({ type: 'path', value: to });
            setShowExitModal(true);
        } else {
            navigate(to);
        }
    }, [isDirty, navigate]);

    return (
        <Routes>
            <Route path="summary" element={
                <ServiceRelationsSummary
                    onBack={handleBack}
                    onEdit={handleEditPrFromSummary}
                    onCopy={handleCopyPrFromSummary}
                    filterPrNumber={targetPrNumber}
                />
            } />

            <Route path="edit" element={
                <PrEditWrapper
                    onBack={() => navigate('../summary', { relative: 'path' })}
                    onUpdateSuccess={() => navigate('../summary', { relative: 'path' })}
                />
            } />

            <Route path="draft" element={
                <ServiceRelationsDraft
                    onBack={handleBack}
                    onEdit={handleEditPrFromSummary}
                    onCopy={handleCopyPrFromSummary}
                    filterPrNumber={targetPrNumber}
                />
            } />

            <Route path="/" element={
                <>
                    {showValidationModal && (
                        <div className="modal-overlay summary-font-family" onClick={() => setShowValidationModal(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Validation Details</h3>
                                </div>
                                <div className="modal-body">
                                    {(lineItems || []).length === 0 ? (
                                        <div className="no-items-message">No line items to validate.</div>
                                    ) : (
                                        <div className="validation-list">
                                            {lineItems.map((item, index) => (
                                                <div key={item?.id || index} className="validation-item-container">
                                                    <div className="validation-item-header-row">
                                                        <h4 className="validation-item-header">Line Item #{index + 1}</h4>
                                                        {item?.id !== undefined && (
                                                            <button
                                                                className="btn-icon btn-edit-sm"
                                                                onClick={() => item.id && toggleValidationEdit(item.id)}
                                                                title={editingValidationIds.includes(item.id) ? "Stop Editing" : "Edit Line Item"}
                                                            >
                                                                <FaEdit color='#006eed' />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="table-container">
                                                        <table className="table-line-items validation-table">
                                                            <thead>
                                                                <tr>
                                                                    <th className='line-items-title'>FIELD</th>
                                                                    <th className='line-items-title'>VALUE</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(validationFields || []).map((field) => (
                                                                    <tr key={`${item?.id}-${field.key}`}>
                                                                        <td className="validation-field-label" title={field.label}>{field.label}</td>
                                                                        <td title={item ? String((item as any)[field.key] || '') : ''}>
                                                                            {item?.id !== undefined && editingValidationIds.includes(item.id) ? (
                                                                                field.key === 'taxInclude' ? (
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!!item.taxInclude}
                                                                                        onChange={(e) => item.id !== undefined && handleValidationItemChange(item.id, field.key, String(e.target.checked))}
                                                                                    />
                                                                                ) : (
                                                                                    <input
                                                                                        type={field.key.includes('Date') ? 'date' : 'text'}
                                                                                        value={String((item as any)[field.key] || '')}
                                                                                        onChange={(e) => item.id !== undefined && handleValidationItemChange(item.id, field.key, e.target.value)}
                                                                                        className="validation-input"
                                                                                        {...(field.key.includes('Date') && { min: '2000-01-01' })}
                                                                                    />
                                                                                )
                                                                            ) : (
                                                                                <span>{field.key === 'taxInclude' ? (item.taxInclude ? 'Yes' : 'No') : String((item as any)[field.key] || '')}</span>
                                                                            )}
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
                                    <button className="btn btn-cancel" onClick={handleCancelValidationEdit}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-submit" onClick={handleSaveValidation}>
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showSwitchConfirm && (
                        <div className="modal-overlay" onClick={() => setShowSwitchConfirm(false)}>
                            <div className="modal-content-sm switch-confirm-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Confirm Switch</h3>
                                </div>
                                <div className="modal-body">
                                    <p>
                                        You are currently editing Line Item #{lineItems.findIndex(i => i.id === editingId) + 1}.
                                        <br />
                                        Switching to Line Item #{lineItems.findIndex(i => i.id === pendingSwitchId) + 1} will discard any unsaved changes.
                                        <br /><br />
                                        Do you want to continue?
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        className="btn btn-cancel"
                                        onClick={() => {
                                            setShowSwitchConfirm(false);
                                            setPendingSwitchId(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => {
                                            setEditingId(null);
                                            setSelectedLineItemId(pendingSwitchId);
                                            setShowSwitchConfirm(false);
                                            setPendingSwitchId(null);
                                        }}
                                    >
                                        Switch & Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showExitModal && (
                        <div className="modal-overlay" onClick={() => setShowExitModal(false)}>
                            <div className="modal-content-sm switch-confirm-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header"><h3>Unsaved Changes</h3></div>
                                <div className="modal-body">
                                    <p>You have unsaved changes in your draft.<br /><br />Do you want to save these changes before leaving?</p>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-cancel" onClick={() => setShowExitModal(false)}>Cancel</button>
                                    <button className="btn btn-danger" onClick={() => { handleManualProceed() }}>Discard</button>
                                    <button className="btn btn-submit" onClick={async () => { await saveDraft(); handleManualProceed(); }}>Save as Draft</button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="pr-entertainment-container">
                        <div className="pr-header">
                            <div className='pr-header-title-row'>
                                {onBack && (
                                    <div className="pr-header-back">
                                        <BackButton onClick={handleNavigateBack} />
                                    </div>
                                )}
                                <h1>Public Relations (Service)</h1>
                            </div>
                            <div className="pr-nav-tabs-wrapper">
                                <div className="pr-nav-tabs">
                                    <button className="nav-tab active">Create PR</button>
                                    <button className="nav-tab" onClick={() => handleManualNavigate('draft')}>Drafts</button>
                                    <button className="nav-tab" onClick={() => handleManualNavigate('summary')}>Summary</button>
                                </div>
                                <div className="pr-type-switch-wrapper">
                                    {onTypeChange && (
                                        <div className="pr-type-switch">
                                            Category:
                                            <select
                                                value={currentType || 'Service'}
                                                onChange={(e) => {
                                                    const newType = e.target.value as 'Material' | 'Service';
                                                    if (isDirty) {
                                                        setPendingAction({ type: 'mode', value: newType });
                                                        setShowExitModal(true);
                                                    } else {
                                                        onTypeChange(newType);
                                                    }
                                                }}
                                                className="pr-type-dropdown"
                                            >
                                                <option value="Material">Material</option>
                                                <option value="Service">Service</option>
                                            </select>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSaveAsDraft}
                                        className="pr-save-draft-icon-btn"
                                        disabled={!isDraftEnabled || submitReqDisable}

                                        title="Save as Draft"
                                    >
                                        <FaSave />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="pr-content-wrapper">
                            <div className="pr-left-panel">
                                <div className="line-items-header">
                                    <input
                                        type="checkbox"
                                        checked={selectAllChecked}
                                        onChange={handleSelectAll}
                                        className="line-items-select-all"
                                    />
                                    <h3 className="panel-title">Line Items ({(lineItems || []).length})</h3>
                                    <button
                                        className="btn-add-line-item"
                                        onClick={handleAddOrDuplicateLineItems}
                                        title={selectedLineItemIds.length > 0 ? "Duplicate selected line items" : "Add new line item"}
                                    >
                                        +
                                    </button>
                                </div>

                                {lineItems.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">📄</div>
                                        <p>No Line Items to show</p>
                                        <span className="empty-hint">Add items individually using the (+) icon, or save time by uploading multiple items through Bulk Upload</span>
                                    </div>
                                ) : (
                                    <div className="line-items-list">
                                        {lineItems.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className={`line-item-card ${selectedLineItemId === item.id ? 'selected' : ''} ${editingId === item.id ? 'editing' : ''}`}
                                                onClick={() => {
                                                    if (editingId !== null && editingId !== item.id) {
                                                        setPendingSwitchId(item.id || null);
                                                        setShowSwitchConfirm(true);
                                                    } else {
                                                        setSelectedLineItemId(item.id || null);
                                                        setEditingId(null);
                                                    }
                                                }}
                                            >
                                                <div className="line-item-check">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.id !== undefined && selectedLineItemIds.includes(item.id)}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            item.id !== undefined && handleCheckboxChange(item.id);
                                                        }}
                                                    />
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (editingId !== null && editingId !== item.id) {
                                                                setPendingSwitchId(item.id || null);
                                                                setShowSwitchConfirm(true);
                                                            } else {
                                                                handleEdit(item.id as number);
                                                                setSelectedLineItemId(item.id || null);
                                                            }
                                                        }}
                                                        title="Edit line item"
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        className="btn-delete-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            item.id !== undefined && handleDelete(item.id);
                                                        }}
                                                        title="Delete line item"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bulk-upload-section">
                                    <input type="file" ref={excelInputRef} accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} className="excel-file-input" />
                                    <button
                                        type="button"
                                        className="btn btn-bulk-upload-sm"
                                        onClick={() => excelInputRef.current?.click()}
                                        disabled={isUploadingExcel}
                                    >
                                        <FaUpload /> Bulk Upload
                                    </button>
                                </div>
                            </div>

                            <div className="pr-right-panel">
                                <div className="form-scroll-container">
                                    <div className="form-grid">
                                        <SearchableSelect
                                            id="venue"
                                            name="venue"
                                            value={formData.venue}
                                            onChange={(value) => handleSelectChange('venue', value)}
                                            options={venuesList}
                                            placeholder="Select Property"
                                            label="Property"
                                            loading={venueLoading}
                                            onSearch={handleVenueSearch}
                                            onLoadMore={handleLoadMoreVenues}
                                            hasMore={hasMoreVenues}
                                            disabled={isEditingSubProperty}
                                        />

                                        <SearchableSelect
                                            id="supplier"
                                            name="supplier"
                                            value={formData.supplier}
                                            onChange={(value) => {
                                                const selectedVendor = vendorsList.find(v => `${v.supplierId} - ${v.supplierName}` === value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    supplier: value,
                                                    vendorId: selectedVendor ? selectedVendor.supplierId : ''
                                                }));
                                            }}
                                            options={vendorsList.map(v => `${v.supplierId} - ${v.supplierName}`)}
                                            placeholder="Select Supplier"
                                            label="Supplier"
                                            loading={vendorLoading}
                                            onSearch={handleVendorSearch}
                                            onLoadMore={handleLoadMoreVendors}
                                            hasMore={hasMoreVendors}
                                            disabled={isEditingSubProperty}
                                        />

                                        <SearchableSelect
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={(value) => handleSelectChange('category', value)}
                                            options={categoriesList}
                                            placeholder="Select Category"
                                            label="Category"
                                            loading={categoryLoading}
                                            onSearch={handleCategorySearch}
                                            onLoadMore={handleLoadMoreCategories}
                                            hasMore={hasMoreCategories}
                                            disabled={isEditingSubProperty}
                                        />

                                        <div className="form-group">
                                            <label htmlFor="needBy">Need by Date *</label>
                                            <input
                                                type="date"
                                                id="needBy"
                                                name="needBy"
                                                value={formData.needBy}
                                                onChange={handleInputChange}
                                                className=" form-input form-input-consistent-border-font"
                                                min="2000-01-01"
                                                readOnly={isEditingSubProperty}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="quantity">Quantity *</label>
                                            <input
                                                type="text"
                                                id="quantity"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleInputChange}
                                                onKeyPress={(e) => {
                                                    const allowedChars = /[0-9.]/;
                                                    if (!allowedChars.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                placeholder="Enter quantity"
                                                className="form-input form-input-consistent-border-font"
                                                inputMode="decimal"
                                                readOnly={isEditingSubProperty}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <div className="amount-label-wrapper">
                                                <label htmlFor="amount" className="amount-label">Amount *</label>
                                                <span className="amount-tax-toggle">
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    id="crossCharge"
                                                    checked={formData.crossCharge}
                                                    onChange={handleCrossChargeToggle}
                                                    disabled={isEditingSubProperty}
                                                    style={{ width: 'auto', marginLeft: '0.5rem' }}
                                                />
                                                <label htmlFor="crossCharge" style={{ fontSize: '0.8em', fontWeight: 'normal', cursor: 'pointer', marginBottom: 0 }}>Cross Charge</label>
                                            </div>
                                            <input
                                                type="text"
                                                id="amount"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleInputChange}
                                                onKeyPress={(e) => {
                                                    const allowedChars = /[0-9.]/;
                                                    if (!allowedChars.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                placeholder="Enter amount"
                                                className="form-input form-input-consistent-border-font"
                                                inputMode="decimal"
                                                readOnly={isEditingSubProperty}
                                            />
                                        </div>



                                        <div className="form-group">
                                            <label htmlFor="serviceStartDate">Service Start Date *</label>
                                            <input
                                                type="date"
                                                id="serviceStartDate"
                                                name="serviceStartDate"
                                                value={formData.serviceStartDate}
                                                onChange={handleInputChange}
                                                className="form-input form-input-consistent-border-font"
                                                min="2000-01-01"
                                                readOnly={isEditingSubProperty}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="serviceEndDate">Service End Date *</label>
                                            <input
                                                type="date"
                                                id="serviceEndDate"
                                                name="serviceEndDate"
                                                value={formData.serviceEndDate}
                                                onChange={handleInputChange}
                                                className="form-input form-input-consistent-border-font"
                                                min={formData.serviceStartDate || getTodayDate()}
                                                max="2100-12-31"
                                                readOnly={isEditingSubProperty}
                                            />
                                        </div>

                                        {formData.crossCharge && (
                                            <>
                                                <SearchableSelect
                                                    id="subProperties"
                                                    name="subProperties"
                                                    value={tempSubProperty}
                                                    onChange={(val) => {
                                                        setTempSubProperty(val);
                                                    }}
                                                    options={subPropertiesList.map((item: any) =>
                                                        typeof item === 'string' ? item : `${item.propertyCrossChargeName} - ${item.costCenter}`
                                                    )}
                                                    placeholder="Select Property Cross Charge"
                                                    label="Property Cross Charge"
                                                    loading={subPropertyLoading}
                                                    onSearch={handleSubPropertySearch}
                                                    onLoadMore={handleLoadMoreSubProperties}
                                                    hasMore={hasMoreSubProperties}
                                                />

                                                <div className="form-group">
                                                    <label htmlFor="tempPercentage">Percentage (%)</label>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <input
                                                            type="text"
                                                            id="tempPercentage"
                                                            value={tempPercentage}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                    setTempPercentage(val);
                                                                }
                                                            }}
                                                            placeholder="%"
                                                            className="form-input"
                                                            style={{ flex: 1 }}
                                                            inputMode="decimal"
                                                            onKeyPress={(e) => {
                                                                const allowedChars = /[0-9.]/;
                                                                if (!allowedChars.test(e.key)) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddCrossChargeItem}
                                                            style={{
                                                                padding: '8px 12px',
                                                                backgroundColor: isEditingSubProperty ? '#ccc' : '#007bff',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: isEditingSubProperty ? 'not-allowed' : 'pointer',
                                                                marginBottom: '1px',
                                                                whiteSpace: 'nowrap',
                                                                opacity: isEditingSubProperty ? 0.7 : 1
                                                            }}
                                                            disabled={isEditingSubProperty}
                                                        >
                                                            Add+
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="selected-sub-properties" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', gridColumn: '1 / -1' }}>
                                                    {(formData.crossChargeItems || []).map((item, idx) => (
                                                        <div key={idx} style={{
                                                            background: '#e9ecef',
                                                            padding: '4px 10px',
                                                            borderRadius: '15px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '0.85em',
                                                            border: '1px solid #dee2e6'
                                                        }}>
                                                            <span>{item.subProperty} ({item.costCenter}): {item.percentage}%</span>
                                                            {!isEditingSubProperty && (
                                                                <FaTimes
                                                                    size={12}
                                                                    style={{ cursor: 'pointer', color: '#6c757d' }}
                                                                    onClick={() => handleRemoveCrossChargeItem(item.subProperty, item.costCenter || '')}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        <div className="form-group">
                                            <label>Auto SES</label>
                                            <div className="toggle-container">
                                                <button
                                                    type="button"
                                                    onClick={handleAutoSESToggle}
                                                    className={`toggle-button ${formData.autoSES ? 'active' : ''} ${isEditingSubProperty ? 'toggle-disabled' : ''}`}
                                                    disabled={isEditingSubProperty}
                                                >
                                                    <span className="toggle-slider"></span>
                                                </button>
                                                <span className="toggle-label">{formData.autoSES ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Auto Invoice</label>
                                            <div className="toggle-container">
                                                <button
                                                    type="button"
                                                    onClick={handleAutoInvoiceToggle}
                                                    className={`toggle-button ${formData.autoInvoice ? 'active' : ''} ${(!formData.autoSES || isInvoiceReadOnlyForSubProp) ? 'toggle-disabled' : ''}`}
                                                    disabled={!formData.autoSES || isInvoiceReadOnlyForSubProp}
                                                >
                                                    <span className="toggle-slider"></span>
                                                </button>
                                                <span className="toggle-label">{formData.autoInvoice ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>

                                        {formData.autoInvoice && (
                                            <div className="form-group">
                                                <label className="ocr-proceed-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={ocrProceed}
                                                        onChange={(e) => setOcrProceed(e.target.checked)}
                                                        className="ocr-checkbox"
                                                    />
                                                    <span>Applicable for all lineitems</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

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
                                                        readOnly={isInvoiceReadOnlyForSubProp}
                                                    />
                                                    {invoiceIdError && <div className='Invoice-error'>{invoiceIdError}</div>}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="invoiceDate">Invoice Date *</label>
                                                    <input
                                                        type="date"
                                                        id="invoiceDate"
                                                        name="invoiceDate"
                                                        value={formData.invoiceDate}
                                                        onChange={handleInputChange}
                                                        className="form-input form-input-consistent-border-font"
                                                        min="2000-01-01"
                                                        readOnly={isInvoiceReadOnlyForSubProp}
                                                    />
                                                </div>
                                                <div className="form-group invoice-comments-full">
                                                    <label htmlFor="invoiceComments">Invoice Comments</label>
                                                    <textarea
                                                        id="invoiceComments"
                                                        name="invoiceComments"
                                                        value={formData.invoiceComments}
                                                        onChange={handleInvoiceCommentChange}
                                                        placeholder="Enter invoice comments"
                                                        className="form-input form-textarea"
                                                        rows={3}
                                                        readOnly={isInvoiceReadOnlyForSubProp}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="comments-section">
                                        <div className="comments-grid" style={{ display: 'flex', gap: '16px' }}>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label htmlFor="comments">Comments</label>
                                                <textarea
                                                    id="comments"
                                                    name="comments"
                                                    value={formData.comments}
                                                    onChange={handleCommentChange}
                                                    placeholder="Enter comment"
                                                    className="form-input form-textarea"
                                                    rows={2}
                                                    readOnly={isEditingSubProperty}
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label htmlFor="description">Description *</label>
                                                <textarea
                                                    id="description"
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter description"
                                                    className="form-input form-textarea"
                                                    rows={2}
                                                    readOnly={isEditingSubProperty}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {formData.autoInvoice ? (
                                    <div className="attachments-grid compact-attachments">
                                        <div className="attachments-section compact-attachment">
                                            <div className="attachment-header-row">
                                                <div className="label-and-icon">
                                                    <label className="attachment-section-label">PR Attachment</label>
                                                    <label
                                                        htmlFor="file-upload"
                                                        className={`attachment-icon-only ${isEditingSubProperty ? 'disabled-icon' : ''}`}
                                                        title={isEditingSubProperty ? "PR attachments are read-only" : "Click to add PR attachment(s)"}
                                                    >
                                                        <FaPaperclip />
                                                        <input
                                                            type="file"
                                                            id="file-upload"
                                                            name="attachments"
                                                            multiple
                                                            onChange={handleFileChange}
                                                            className="file-input-hidden"
                                                            disabled={isEditingSubProperty}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                            {attachments.length > 0 && (
                                                <div className="attached-files-chips">
                                                    {attachments.map((file, index) => (
                                                        <div key={index} className="file-chip">
                                                            <span className="file-chip-name" title={file.name} onClick={() => handleViewFile(file)}>
                                                                {truncateFileName(file.name, 24)}
                                                            </span>
                                                            {!isEditingSubProperty && (
                                                                <button type="button" className="chip-remove-btn" onClick={() => removeAttachment(index)} title="Remove file">
                                                                    <FaTimes size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="invoice-attachments-section compact-attachment">
                                            <div className="attachment-header-row">
                                                <div className="label-and-icon">
                                                    <label className="attachment-section-label">Invoice Attachment</label>
                                                    <label
                                                        htmlFor="invoice-file-upload"
                                                        className={`attachment-icon-only ${isInvoiceReadOnlyForSubProp ? 'disabled-icon' : ''}`}
                                                        title={isInvoiceReadOnlyForSubProp ? "Invoice attachments are read-only" : "Click to add invoice attachment(s)"}
                                                    >
                                                        <FaPaperclip />
                                                        <input
                                                            type="file"
                                                            id="invoice-file-upload"
                                                            name="invoiceAttachments"
                                                            multiple
                                                            onChange={handleInvoiceFileChange}
                                                            className="file-input-hidden"
                                                            disabled={isInvoiceReadOnlyForSubProp}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                            {invoiceAttachments.length > 0 && (
                                                <div className="attached-files-chips">
                                                    {invoiceAttachments.map((file, index) => (
                                                        <div key={index} className="file-chip">
                                                            <span className="file-chip-name" title={file.name} onClick={() => handleViewFile(file)}>
                                                                {truncateFileName(file.name, 24)}
                                                            </span>
                                                            {!isInvoiceReadOnlyForSubProp && (
                                                                <button type="button" className="chip-remove-btn" onClick={() => removeInvoiceAttachment(index)} title="Remove file">
                                                                    <FaTimes size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="attachments-section compact-attachment">
                                        <div className="attachment-header-row">
                                            <div className="label-and-icon">
                                                <label className="attachment-section-label">PR Attachment</label>
                                                <label
                                                    htmlFor="file-upload"
                                                    className={`attachment-icon-only ${isEditingSubProperty ? 'disabled-icon' : ''}`}
                                                    title={isEditingSubProperty ? "PR attachments are read-only" : "Click to add PR attachment(s)"}
                                                >
                                                    <FaPaperclip />
                                                    <input
                                                        type="file"
                                                        id="file-upload"
                                                        name="attachments"
                                                        multiple
                                                        onChange={handleFileChange}
                                                        className="file-input-hidden"
                                                        disabled={isEditingSubProperty}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        {attachments.length > 0 && (
                                            <div className="attached-files-chips">
                                                {attachments.map((file, index) => (
                                                    <div key={index} className="file-chip">
                                                        <span className="file-chip-name" title={file.name} onClick={() => handleViewFile(file)}>
                                                            {truncateFileName(file.name, 24)}
                                                        </span>
                                                        {!isEditingSubProperty && (
                                                            <button type="button" className="chip-remove-btn" onClick={() => removeAttachment(index)} title="Remove file">
                                                                <FaTimes size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="form-bottom-actions">
                                    {editingId === null ? (
                                        <button type="button" onClick={handleAddLineItem} className="btn btn-add-lineitem">
                                            + Add Line Item
                                        </button>
                                    ) : (
                                        <>
                                            <button type="button" onClick={handleCancelEdit} className="btn btn-cancel-edit">
                                                Cancel
                                            </button>
                                            <button type="button" onClick={handleAddLineItem} className="btn btn-update-lineitem">
                                                ✓ Update Line Item
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="pr-footer-buttons">
                        <button
                            type="button"
                            onClick={handleValidate}
                            className="btn btn-validate"
                            disabled={lineItems.length === 0}
                        >
                            Validate
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAsDraft}
                            className="btn btn-savedraft"
                            disabled={!isDraftEnabled || submitReqDisable}
                        >
                            Save as Draft
                        </button>
                        <button
                            onClick={handleSubmitRequisition}
                            className={`btn ${lineItems.length === 0 ? 'btn-submit-requisition-disabled' : 'btn-submit-requisition'}`}
                            disabled={lineItems.length === 0}
                        >
                            Submit PR
                        </button>
                    </div>
                </>
            } />
        </Routes>
    );
};

export default ServiceRelations;