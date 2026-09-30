import React, { useRef } from 'react';
import { FaEdit, FaTrash, FaChevronDown, FaTimes, FaUpload, FaPaperclip, FaSave } from 'react-icons/fa';
import type { AnyFormData, AnyLineItem, Supplier, PRMode } from '../Dto/ConciergeTpesDto';
import { truncateFileName } from './ConciergeUtil';
import BackButton from './BackButton';

// ── SearchableSelect (unchanged from original) ────────────────────────────────
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
    searchable?: boolean; 
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    id, value, onChange, options, placeholder, label,
    loading = false, onSearch, onLoadMore, hasMore = false, searchable = true
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    const filteredOptions = onSearch ? options : options.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()));

    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false); setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    React.useEffect(() => {
        if (onSearch) {
            const t = setTimeout(() => onSearch(searchTerm), 300);
            return () => clearTimeout(t);
        }
    }, [searchTerm, onSearch]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight <= 100 && hasMore && !loading && onLoadMore) onLoadMore();
    };

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
                  {searchable && (
    <div className="select-search">
        <input type="text" className="search-input" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
    </div>
)}
                        <div className="select-options" ref={optionsRef} onScroll={handleScroll}>
                            {loading && filteredOptions.length === 0
                                ? <div className="select-option no-results">Loading...</div>
                                : filteredOptions.length > 0
                                    ? <>{filteredOptions.map(o => (<div key={o} className={`select-option ${value === o ? 'selected' : ''}`} onClick={() => { onChange(o); setIsOpen(false); setSearchTerm(''); }}>{o}</div>))}{loading && <div className="select-option no-results">Loading more...</div>}</>
                                    : <div className="select-option no-results">No results found</div>
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── MultiSearchableSelect (Checkbox Multi Select) ─────────────────────────────
interface MultiSearchableSelectProps {
    id: string;
    name: string;
    values: string[]; // multiple selected
    onChange: (values: string[]) => void;
 options: { label: string; value: string }[];    placeholder: string;
    label: string;
    loading?: boolean;
    onSearch?: (search: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    searchable?: boolean;
}

export const MultiSearchableSelect: React.FC<MultiSearchableSelectProps> = ({
    values,
    onChange,
    options,
    placeholder,
    loading = false,
    onSearch,
    onLoadMore,
    hasMore = false,
    searchable = true
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [initialSelectedValues, setInitialSelectedValues] = React.useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Capture selected values on open to prevent options from jumping dynamically under the user's cursor
    React.useEffect(() => {
        if (isOpen) {
            setInitialSelectedValues(values);
        } else {
            setInitialSelectedValues([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Filter logic (same as SearchableSelect) and sort selected to top based on opening state
    const filteredOptions = React.useMemo(() => {
        const filtered = options.filter(o =>
            o.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const selected = filtered.filter(o => initialSelectedValues.includes(o.value));
        const unselected = filtered.filter(o => !initialSelectedValues.includes(o.value));
        return [...selected, ...unselected];
    }, [options, searchTerm, initialSelectedValues]);

    // Close dropdown on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // API search
    React.useEffect(() => {
        if (onSearch) {
            const t = setTimeout(() => onSearch(searchTerm), 300);
            return () => clearTimeout(t);
        }
    }, [searchTerm, onSearch]);

    // Scroll pagination
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (
            el.scrollHeight - el.scrollTop - el.clientHeight <= 100 &&
            hasMore &&
            !loading &&
            onLoadMore
        ) {
            onLoadMore();
        }
    };

    // Toggle checkbox selection
   const toggleOption = (value: string) => {
    if (values.includes(value)) {
        onChange(values.filter(v => v !== value));
    } else {
        onChange([...values, value]);
    }
};


    return (
        <div className="form-group">
            <div className="searchable-select" ref={dropdownRef}>
                {/* Display */}
                <div className="select-display" onClick={() => setIsOpen(!isOpen)}>
                    <span className={values.length ? 'select-value' : 'select-placeholder'}>
                        {values.length > 0
                            ? `${values.length} selected`
                            : placeholder}
                    </span>
                    <FaChevronDown className={`select-arrow ${isOpen ? 'open' : ''}`} />
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div className="select-dropdown">

                        {/* Search */}
                        {searchable && (
                            <div className="select-search">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Options */}
                        <div className="select-options" ref={optionsRef} onScroll={handleScroll}>
                            {loading && filteredOptions.length === 0 ? (
                                <div className="select-option no-results">Loading...</div>
                            ) : filteredOptions.length > 0 ? (
                                <>
                                   {filteredOptions.map(option => (
  <div
    key={option.value}
    className={`select-option multi-option ${
      values.includes(option.value) ? 'selected' : ''
    }`}
    onClick={() => toggleOption(option.value)}
  >
    <input
      type="checkbox"
      checked={values.includes(option.value)}
      onChange={() => toggleOption(option.value)}
      onClick={e => e.stopPropagation()}
    />
    <span>{option.label}</span>
  </div>
))}


                                    {loading && (
                                        <div className="select-option no-results">
                                            Loading more...
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="select-option no-results">
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Form Props ────────────────────────────────────────────────────────────
export interface ConciergeFormProps {
    mode: PRMode;
    formData: AnyFormData;
    lineItems: AnyLineItem[];
    onBack?: () => void;
    onAutoSESToggle?: () => void;
    editingId: number | null;
    selectedLineItemId: number | null;
    selectedLineItemIds: number[];
    selectAllChecked: boolean;
    ocrProceed: boolean;
    isDraftEnabled: boolean;
    submitReqDisable: boolean;
    isUploadingExcel: boolean;
    attachments: File[];
    invoiceAttachments: File[];
    vendorsList: Supplier[];
    vendorLoading: boolean;
    hasMoreVendors: boolean;
    venuesList: string[];
    venueLoading: boolean;
    hasMoreVenues: boolean;
    excelInputRef: React.RefObject<HTMLInputElement | null>;
    pendingSwitchId: number | null;
    showSwitchConfirm: boolean;
    showValidationModal: boolean;
    editingValidationIds: number[];
    showExitModal: boolean;

    // handlers
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onSelectChange: (name: string, value: string) => void;
    onAutoInvoiceToggle: () => void;
    onAutoGRNToggle: () => void;
    onAddTaxToggle: () => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onInvoiceFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onViewFile: (file: File) => void;
    onRemoveAttachment: (index: number) => void;
    onRemoveInvoiceAttachment: (index: number) => void;
    onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCheckboxChange: (id: number) => void;
    onAddLineItem: () => void;
    onDelete: (id: number) => void;
    onCancelEdit: () => void;
    onValidate: () => void;
    onValidationItemChange: (id: number, field: string, value: string) => void;
    onSaveValidation: () => void;
    onCancelValidationEdit: () => void;
    onToggleValidationEdit: (id: number) => void;
    onSubmitRequisition: () => void;
    onSaveAsDraft: () => void;
    onExcelFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onNavigate: (path: string) => void;
    onNavigateBack: () => void;
    onSetOcrProceed: (val: boolean) => void;
    onSetEditingId: (id: number | null) => void;
    onSetSelectedLineItemId: (id: number | null) => void;
    onSetPendingSwitchId: (id: number | null) => void;
    onSetShowSwitchConfirm: (val: boolean) => void;
    onSetShowExitModal: (val: boolean) => void;
    onSetFormData: (updater: (prev: AnyFormData) => AnyFormData) => void;
    onSetInvoiceAttachments?: (files: File[]) => void;
    onInvoiceIdKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    invoiceIdError?: string;
    saveDraft: () => Promise<void>;
    onProceed: () => void;
    nextId: number;
    onSetNextId: (n: number) => void;
    onSetLineItems: (items: AnyLineItem[]) => void;

    // vendor / venue search handlers
    handleVendorSearch: (search: string) => void;
    handleLoadMoreVendors: () => void;
    handleVenueSearch: (search: string) => void;
    handleLoadMoreVenues: () => void;
    onModeChange?: (mode: PRMode) => void;
    extraFields?: React.ReactNode;
    extraValidationFields?: { key: string; label: string }[];
}

// ── Component ─────────────────────────────────────────────────────────────────
const ConciergeForm: React.FC<ConciergeFormProps> = (props) => {
    const {
        mode, formData, lineItems, onBack, onAutoSESToggle, editingId, selectedLineItemId, selectedLineItemIds,
        selectAllChecked, ocrProceed, isDraftEnabled, submitReqDisable, isUploadingExcel,
        attachments, invoiceAttachments, vendorsList, vendorLoading, hasMoreVendors,
        venuesList, venueLoading, hasMoreVenues, excelInputRef,
        pendingSwitchId, showSwitchConfirm, showValidationModal, editingValidationIds, showExitModal,
        onInputChange, onSelectChange, onAutoInvoiceToggle, onAutoGRNToggle, onAddTaxToggle,
        onFileChange, onInvoiceFileChange, onViewFile, onRemoveAttachment, onRemoveInvoiceAttachment,
        onSelectAll, onCheckboxChange, onAddLineItem, onDelete, onCancelEdit,
        onValidate, onValidationItemChange, onSaveValidation, onCancelValidationEdit, onToggleValidationEdit,
        onSubmitRequisition, onSaveAsDraft, onExcelFileChange, onNavigate, onNavigateBack,
        onSetOcrProceed, onSetEditingId, onSetSelectedLineItemId, onSetPendingSwitchId,
        onSetShowSwitchConfirm, onSetShowExitModal, onSetFormData, onSetInvoiceAttachments,
         invoiceIdError,
        saveDraft, nextId, onSetNextId, onSetLineItems, onProceed,
        handleVendorSearch, handleLoadMoreVendors, handleVenueSearch, handleLoadMoreVenues,
        onModeChange,
        extraFields, extraValidationFields = [],
    } = props;

    const getTodayDate = () => new Date().toISOString().split('T')[0];

    const baseValidationFields = [
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
        { key: 'uom', label: 'UOM' },
        { key: 'taxInclude', label: 'Includes Tax' },
        ...extraValidationFields,
    ];

    return (
        <>
            {/* ── Validation Modal ── */}
            {showValidationModal && (
                <div className="modal-overlay summary-font-family" onClick={onCancelValidationEdit}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Validation Details</h3></div>
                        <div className="modal-body">
                            {lineItems.length === 0
                                ? <div className="no-items-message">No line items to validate.</div>
                                : <div className="validation-list">
                                    {lineItems.map((item, index) => (
                                        <div key={item.id} className="validation-item-container">
                                            <div className="validation-item-header-row">
                                                <h4 className="validation-item-header">Line Item #{index + 1}</h4>
                                                {item.id !== undefined && (
                                                    <button className="btn-icon btn-edit-sm" onClick={() => item.id && onToggleValidationEdit(item.id)}>
                                                        <FaEdit color="#0064D2" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="table-container">
                                                <table className="table-line-items validation-table">
                                                    <thead><tr><th>FIELD</th><th>VALUE</th></tr></thead>
                                                    <tbody>
                                                        {baseValidationFields.map(field => (
                                                            <tr key={`${item.id}-${field.key}`}>
                                                                <td className="validation-field-label">{field.label}</td>
                                                                <td>
                                                                    {item.id !== undefined && editingValidationIds.includes(item.id)
                                                                        ? field.key === 'taxInclude'
                                                                            ? <input type="checkbox" checked={!!((item as any)[field.key])} onChange={e => item.id !== undefined && onValidationItemChange(item.id, field.key, String(e.target.checked))} />
                                                                            : <input type={field.key.includes('Date') ? 'date' : 'text'} value={String((item as any)[field.key] || '')} onChange={e => item.id !== undefined && onValidationItemChange(item.id, field.key, e.target.value)} className="validation-input" {...(field.key.includes('Date') && { min: '2000-01-01' })} />
                                                                        : <span>{field.key === 'taxInclude' ? ((item as any).taxInclude ? 'Yes' : 'No') : String((item as any)[field.key] || '')}</span>
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-cancel" onClick={onCancelValidationEdit}>Cancel</button>
                            <button className="btn btn-submit" onClick={onSaveValidation}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Switch Confirm Modal ── */}
            {showSwitchConfirm && (
                <div className="modal-overlay" onClick={() => onSetShowSwitchConfirm(false)}>
                    <div className="modal-content-sm switch-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Confirm Switch</h3></div>
                        <div className="modal-body">
                            <p>
                                You are currently editing Line Item #{lineItems.findIndex(i => i.id === editingId) + 1}.
                                <br />Switching to Line Item #{lineItems.findIndex(i => i.id === pendingSwitchId) + 1} will discard unsaved changes.
                                <br /><br />Do you want to continue?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-cancel" onClick={() => { onSetShowSwitchConfirm(false); onSetPendingSwitchId(null); }}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => { onSetEditingId(null); onSetSelectedLineItemId(pendingSwitchId); onSetShowSwitchConfirm(false); onSetPendingSwitchId(null); }}>Switch & Discard</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Exit Modal ── */}
            {showExitModal && (
                <div className="modal-overlay" onClick={() => onSetShowExitModal(false)}>
                    <div className="modal-content-sm switch-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Unsaved Changes</h3></div>
                        <div className="modal-body"><p>You have unsaved changes.<br /><br />Do you want to save these changes before leaving?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-cancel" onClick={() => onSetShowExitModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => onProceed()}>Discard</button>
                            <button className="btn btn-submit" onClick={async () => { await saveDraft(); onProceed(); }}>Save as Draft</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="pr-entertainment-container">
                <div className="pr-header">
                    <div className="pr-header-title-row">
                        {onBack && <div className="pr-header-back"><BackButton onClick={onNavigateBack} /></div>}
                        <h1>Concierge ({mode})</h1>
                    </div>
                    <div className="pr-nav-tabs-wrapper">
                        <div className="pr-nav-tabs">
                            <button className="nav-tab active">Create PR</button>
                            <button className="nav-tab" onClick={() => onNavigate('draft')}>Drafts</button>
                            <button className="nav-tab" onClick={() => onNavigate('summary')}>Summary</button>
                        </div>
                        <div className="pr-header-actions">
                            <div className="concierge-category-container">
                                <span className="concierge-category-label">Category:</span>
                                <select
                                    value={mode}
                                    onChange={(e) => onModeChange?.(e.target.value as any)}
                                    className="concierge-category-select"
                                >
                                    <option value="material">Material</option>
                                    <option value="service">Service</option>
                                </select>
                            </div>
                            <button type="button" onClick={onSaveAsDraft} className="pr-save-draft-icon-btn" disabled={!isDraftEnabled} title="Save as Draft">
                                <FaSave />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pr-content-wrapper">
                    {/* ── Left Panel: Line Items ── */}
                    <div className="pr-left-panel">
                        <div className="line-items-header">
                            <input type="checkbox" checked={selectAllChecked} onChange={onSelectAll} className="line-items-select-all" />
                            <h3 className="panel-title">Line Items</h3>
                            <button
                                className="btn-add-line-item"
                                title={selectedLineItemIds.length > 0 ? 'Duplicate selected' : 'Add new'}
                                onClick={() => {
                                    if (selectedLineItemIds.length > 0) {
                                        const toDupe = lineItems.filter(i => i.id !== undefined && selectedLineItemIds.includes(i.id!));
                                        const duped = toDupe.map((item, idx) => ({ ...item, id: nextId + idx, invoiceAttachments: item.invoiceAttachments ? [...item.invoiceAttachments] : [] }));
                                        onSetLineItems([...lineItems, ...duped]);
                                        onSetNextId(nextId + duped.length);
                                    } else {
                                        onSetEditingId(null);
                                        onSetSelectedLineItemId(null);
                                        onSetFormData(() => ({
                                            venue: '', supplier: '', description: '', amount: '',
                                            costCenter: '', companyCode: '', shipToPlant: '', billTo: '',
                                            purchaseOrg: '', purchaseGroup: '', currency: 'AED', deliveryTo: '',
                                            materialcode: '', contract: null, glAccount: '', uom: 'EA',
                                            autoInvoice: false, needBy: getTodayDate(), quantity: '1',
                                            autoGRN: true, comments: '', invoiceId: '', invoiceDate: '',
                                            invoiceComments: '', vendorId: '', taxCode: '', taxInclude: false,
                                            title: '',
                                            ...(mode === 'service' && { serviceStartDate: '', serviceEndDate: '', autoSES: true }),
                                        } as AnyFormData));
                                        if (onSetInvoiceAttachments) onSetInvoiceAttachments([]);
                                    }
                                }}
                            >+</button>
                        </div>

                        {lineItems.length === 0
                            ? <div className="empty-state">
                                <div className="empty-icon">📄</div>
                                <p>No Line Items to show</p>
                                <span className="empty-hint">Add items individually using the (+) icon, or upload via Bulk Upload</span>
                            </div>
                            : <div className="line-items-list">
                                {lineItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`line-item-card ${selectedLineItemId === item.id ? 'selected' : ''} ${editingId === item.id ? 'editing' : ''}`}
                                        onClick={() => {
                                            if (editingId !== null && editingId !== item.id) {
                                                onSetPendingSwitchId(item.id || null);
                                                onSetShowSwitchConfirm(true);
                                            } else {
                                                onSetSelectedLineItemId(item.id || null);
                                                onSetEditingId(null);
                                            }
                                        }}
                                    >
                                        <div className="line-item-check">
                                            <input type="checkbox" checked={item.id !== undefined && selectedLineItemIds.includes(item.id)} onChange={e => { e.stopPropagation(); item.id !== undefined && onCheckboxChange(item.id); }} />
                                        </div>
                                        <div className="line-item-content">
                                            <div className="line-item-title">Line No. #{index + 1}</div>
                                            <div className="line-item-details">
                                                <span className="detail-label">{item.venue}</span>
                                                <span className="detail-value">{item.supplier}</span>
                                            </div>
                                        </div>
                                        <div className="line-item-actions">
                                            <button className="btn-edit-sm" title="Edit" onClick={e => {
                                                e.stopPropagation();
                                                if (editingId !== null && editingId !== item.id) { onSetPendingSwitchId(item.id || null); onSetShowSwitchConfirm(true); return; }
                                                const found = lineItems.find(l => l.id === item.id);
                                                if (!found) return;
                                                onSetFormData(() => ({ ...getResetFormState_inline(), ...found } as AnyFormData));
                                                if (onSetInvoiceAttachments) onSetInvoiceAttachments(found.invoiceAttachments ? [...found.invoiceAttachments] : []);
                                                onSetEditingId(item.id || null);
                                                onSetSelectedLineItemId(item.id || null);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}><FaEdit /></button>
                                            <button className="btn-delete-sm" onClick={e => { e.stopPropagation(); item.id !== undefined && onDelete(item.id); }} title="Delete"><FaTrash /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        }

                        <div className="bulk-upload-section">
                            <input type="file" ref={excelInputRef} accept=".xlsx,.xls,.csv" onChange={onExcelFileChange} className="excel-file-input" />
                            <button type="button" className="btn btn-bulk-upload-sm" onClick={() => excelInputRef.current?.click()} disabled={isUploadingExcel}>
                                <FaUpload /> Bulk Upload
                            </button>
                        </div>
                    </div>

                    {/* ── Right Panel: Form ── */}
                    <div className="pr-right-panel">
                        <div className="form-scroll-container">
                            <div className="form-grid">
                                {/* Row 1: Property & Supplier */}
                                <SearchableSelect id="venue" name="venue" value={formData.venue} onChange={v => onSelectChange('venue', v)} options={venuesList} placeholder="Select Property" label="Property" loading={venueLoading} onSearch={handleVenueSearch} onLoadMore={handleLoadMoreVenues} hasMore={hasMoreVenues} />
                                <SearchableSelect id="supplier" name="supplier" value={formData.supplier} onChange={v => { const found = vendorsList.find(vend => `${vend.supplierId} - ${vend.supplierName}` === v); onSetFormData(prev => ({ ...prev, supplier: v, vendorId: found ? found.supplierId : '' })); }} options={vendorsList.map(v => `${v.supplierId} - ${v.supplierName}`)} placeholder="Select Supplier" label="Supplier" loading={vendorLoading} onSearch={handleVendorSearch} onLoadMore={handleLoadMoreVendors} hasMore={hasMoreVendors} />

                                {/* Row 3: Quantity */}
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input type="text" name="quantity" value={formData.quantity} onChange={onInputChange} onKeyPress={e => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); }} placeholder="Enter quantity" className="form-input form-input-consistent-border-font" inputMode="decimal" />
                                </div>

                                {/* Row 4: Amount & Need By */}
                                <div className="form-group">
                                    <div className="amount-label-wrapper">
                                        <label htmlFor="amount" className="amount-label">Amount *</label>
                                        {mode=== 'material' && (
                                            <span className="amount-tax-toggle">
                                                <input type="checkbox" id="taxInclude" checked={formData.taxInclude} onChange={onAddTaxToggle} className="tax-checkbox" />
                                                <label htmlFor="taxInclude" className="tax-label">Inc. Tax</label>
                                            </span>
                                        )}
                                    </div>
                                    <input type="text" id="amount" name="amount" value={formData.amount} onChange={onInputChange} onKeyPress={e => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); }} placeholder="Enter amount" className="form-input form-input-consistent-border-font" inputMode="decimal" />
                                </div>

                                {/* Need By Date */}
                                {mode === 'material' ? <div className="form-group">
                                    <label htmlFor="needBy">Need By Date *</label>
                                    <input
                                        type="date"
                                        id="needBy"
                                        name="needBy"
                                        value={formData.needBy}
                                        onChange={onInputChange}
                                        className="form-input form-input-consistent-border-font"
                                        min={getTodayDate()}
                                    />
                                </div> : <div className="form-group">
                                    <label>Comments</label>
                                    <textarea name="comments" value={formData.comments} onChange={onInputChange} placeholder="Enter comment" className="form-input form-textarea" rows={3} />
                                </div>}

                                {/* Row: Description & Comments side-by-side (below Invoice Details) */}
                                <div className="form-group">
                                    <label htmlFor="description">Description *</label>
                                    <textarea id="description" name="description" value={formData.description} onChange={onInputChange} placeholder="Enter description" className="form-input form-textarea" rows={3} />
                                </div>
                                {/* ↓ Service-specific extra fields slot (dates etc) */}
                                {extraFields}
                                {/* Auto GRN (Material) or Auto SES (Service) */}
                                {mode === 'service' ? (
                                    <div className="form-group">
                                        <label>Auto SES</label>
                                        <div className="toggle-container">
                                            <button
                                                type="button"
                                                onClick={onAutoSESToggle}
                                                className={`toggle-button ${(formData as any).autoSES ? 'active' : ''}`}
                                            >
                                                <span className="toggle-slider"></span>
                                            </button>
                                            <span className="toggle-label">{(formData as any).autoSES ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>Auto GRN</label>
                                        <div className="toggle-container">
                                            <button
                                                type="button"
                                                onClick={onAutoGRNToggle}
                                                className={`toggle-button ${formData.autoGRN ? 'active' : ''}`}
                                            >
                                                <span className="toggle-slider"></span>
                                            </button>
                                            <span className="toggle-label">{formData.autoGRN ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Auto Invoice</label>
                                    <div className="toggle-container">
                                        <button
                                            type="button"
                                            onClick={onAutoInvoiceToggle}
                                            className={`toggle-button ${formData.autoInvoice ? 'active' : ''} ${mode !== 'service' && !formData.autoGRN ? 'toggle-disabled' : ''}`}
                                            disabled={mode !== 'service' && !formData.autoGRN}
                                        >
                                            <span className="toggle-slider"></span>
                                        </button>
                                        <span className="toggle-label">{formData.autoInvoice ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>
                                {formData.autoInvoice && (
                                    <div className="form-group full-width">
                                        <label className="ocr-proceed-label">
                                            <input type="checkbox" checked={ocrProceed} onChange={e => onSetOcrProceed(e.target.checked)} className="ocr-checkbox" />
                                            <span>Applicable for all line items</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Invoice Details */}
                            {formData.autoInvoice && (
                                <div className="invoice-details-section">
                                    <h3>Invoice Details</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Invoice ID *</label>
                                            <input type="text" name="invoiceId" value={formData.invoiceId} onChange={onInputChange} maxLength={16} placeholder="Enter invoice ID" className="form-input form-input-consistent-border-font" aria-invalid={invoiceIdError ? 'true' : 'false'} />
                                            {invoiceIdError && <div className='Invoice-error'>{invoiceIdError}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label>Invoice Date *</label>
                                            <input type="date" name="invoiceDate" value={formData.invoiceDate} onChange={onInputChange} className="form-input form-input-consistent-border-font" min="2000-01-01" />
                                        </div>
                                        <div className="form-group invoice-comments-full">
                                            <label>Invoice Comments</label>
                                            <textarea name="invoiceComments" value={formData.invoiceComments} onChange={onInputChange} placeholder="Enter invoice comments" className="form-input form-textarea" rows={2} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {mode === 'material' && (
                                <div className="form-group full-width">
                                    <label>Comments</label>
                                    <textarea name="comments" value={formData.comments} onChange={onInputChange} placeholder="Enter comment" className="form-input form-textarea" rows={3} />
                                </div>
                            )}

                            {/* Attachments */}
                            {formData.autoInvoice ? (
                                <div className="attachments-grid compact-attachments">
                                    <AttachmentSection label="PR Attachment" attachments={attachments} onAdd={onFileChange} onRemove={onRemoveAttachment} onView={onViewFile} inputId="concierge-header-file-upload" />
                                    <AttachmentSection label="Invoice Attachment" attachments={invoiceAttachments} onAdd={onInvoiceFileChange} onRemove={onRemoveInvoiceAttachment} onView={onViewFile} inputId="concierge-invoice-file-upload" accept=".pdf,.png,.jpg,.jpeg,.jpe,.jfif,.gif,.tiff" />
                                </div>
                            ) : (
                                <AttachmentSection label="PR Attachment" attachments={attachments} onAdd={onFileChange} onRemove={onRemoveAttachment} onView={onViewFile} inputId="concierge-header-file-upload" />
                            )}

                            {/* Add / Update buttons */}
                            <div className="form-bottom-actions">
                                {editingId === null
                                    ? <button type="button" onClick={onAddLineItem} className="btn btn-add-lineitem">+ Add Line Item</button>
                                    : <>
                                        <button type="button" onClick={onCancelEdit} className="btn btn-cancel-edit">Cancel</button>
                                        <button type="button" onClick={onAddLineItem} className="btn btn-update-lineitem">✓ Update Line Item</button>
                                    </>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer Buttons ── */}
            <div className="pr-footer-buttons">
                <button type="button" onClick={onValidate} className="btn btn-validate" disabled={lineItems.length === 0}>Validate</button>
                <button type="button" onClick={onSaveAsDraft} className="btn btn-savedraft" disabled={!isDraftEnabled}>Save as Draft</button>
                <button onClick={onSubmitRequisition} className={`btn ${lineItems.length === 0 ? 'btn-submit-requisition-disabled' : 'btn-submit-requisition'}`} disabled={lineItems.length === 0 || submitReqDisable}>
                    Submit PR                </button>
            </div>
        </>
    );
};

// ── Reusable attachment section ────────────────────────────────────────────────
interface AttachmentSectionProps {
    label: string;
    attachments: File[];
    onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
    onView: (file: File) => void;
    inputId: string;
    accept?: string;
}

const AttachmentSection: React.FC<AttachmentSectionProps> = ({ label, attachments, onAdd, onRemove, onView, inputId, accept }) => (
    <div className="attachments-section compact-attachment">
        <div className="attachment-header-row">
            <div className="label-and-icon">
                <label className="attachment-section-label">{label}</label>
                <label className="attachment-icon-only" title={`Click to add ${label.toLowerCase()}`}>
                    <FaPaperclip />
                    <input
                        key={inputId}
                        type="file"
                        id={inputId}
                        multiple
                        accept={accept}
                        onChange={onAdd}
                        className="file-input-hidden"
                    />
                </label>
            </div>
        </div>
        {attachments.length > 0 && (
            <div className="attached-files-chips">
                {attachments.map((file, index) => (
                    <div key={index} className="file-chip">
                        <span className="file-chip-name" title={file.name} onClick={() => onView(file)}>{truncateFileName(file.name, 24)}</span>
                        <button type="button" className="chip-remove-btn" onClick={() => onRemove(index)} title="Remove"><FaTimes size={11} /></button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// tiny inline helper to avoid importing getTodayDate
const getResetFormState_inline = () => ({ venue: '', supplier: '', description: '', amount: '', costCenter: '', companyCode: '', shipToPlant: '', billTo: '', purchaseOrg: '', purchaseGroup: '', currency: 'AED', deliveryTo: '', materialcode: '', contract: null, glAccount: '', uom: 'EA', autoInvoice: false, needBy: new Date().toISOString().split('T')[0], quantity: '1', autoGRN: true, comments: '', invoiceId: '', invoiceDate: '', invoiceComments: '', vendorId: '', taxCode: '', taxInclude: false, prNumber: '', title: '' });

export default ConciergeForm;
