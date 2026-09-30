import React, { useState, useEffect } from 'react';
import { FaSave, FaPlus } from 'react-icons/fa';
import {  createServicePR } from '../api/prEntertainmentApi';
import { toast } from 'react-toastify';
import BackButton from './BackButton';
import './PrEdit.css';

/* ── Types ─────────────────────────────────────── */
interface PublicRelationsEditProps {
    data: any;
    onBack: () => void;
    onUpdateSuccess: () => void;
}

/* ── Field definitions ─────────────────────────── */
const editField = [
    { key: 'venue',          label: 'Venue' },
    { key: 'purchaseOrg',    label: 'Purchase Org' },
    { key: 'description',    label: 'Description' },
    { key: 'headerComment',  label: 'Comments' },
    { key: 'commodityCode',  label: 'Commodity Code' },
    { key: 'contract',       label: 'Contract' },
    { key: 'purchaseGroup',  label: 'Purchase Group' },
    { key: 'needBy',         label: 'Need By Date',   type: 'date' ,materialOnly: true},
    { key: 'amount',         label: 'Amount' },
    { key: 'quantity',       label: 'Quantity' },
    { key: 'glAccount',      label: 'GL Account' },
    { key: 'supplier',       label: 'Supplier' },
    { key: 'costCenter',     label: 'Cost Center' },
    { key: 'companyCode',    label: 'Company Code' },
    { key: 'shipToPlant',    label: 'Ship-to Plant' },
    { key: 'billTo',         label: 'Bill-to' },
    { key: 'currency',       label: 'Currency' },
    { key: 'deliveryTo',     label: 'Delivery To' },
    { key: 'materialcode',   label: 'Material Code' },
    { key: 'taxCode',        label: 'Tax Code' },
    { key: 'uom',            label: 'UOM' },
    { key: 'invoiceId',      label: 'Invoice ID',     type: 'text',     conditional: true },
    { key: 'invoiceDate',    label: 'Invoice Date',   type: 'date',     conditional: true },
    { key: 'autoSES',        label: 'Auto SES',       type: 'checkbox' },
    {key :'serviceStartDate', label: 'Service Start Date', type: 'date'},
    {key:'serviceEndDate',   label: 'Service End Date',   type: 'date'},
    { key: 'autoGRN',       label: 'Auto GRN',        type: 'checkbox' },
    { key: 'autoInvoices',   label: 'Auto Invoice',   type: 'checkbox' },
    { key: 'isHeader',       label: 'Applicable for all line items', type: 'checkbox' },
];

/* ── Helpers ───────────────────────────────────── */
const extractCode = (value: string | undefined | null) => {
    if (!value) return '';
    return value.split(' ')[0] || value;
};

const extractVendorCode = (value: string | undefined | null) => {
    if (!value) return '';
    const parts = value.split(' - ');
    if (parts.length >= 3) return parts[2].trim();
    if (parts.length === 2) return parts[1].trim();
    return value;
};

const formatDateForInput = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return ''; }
};

const isNewlyAddedItem   = (item: any): boolean => item.isNewlyAdded === true;
const hasLockedInvoiceData = (item: any, isHeader: boolean): boolean => {
    if (isNewlyAddedItem(item)) return false;
    if (isHeader) return true;
    return !!item.isOCRAttachmentProcessed;
};

/* ══════════════════════════════════════════════
   Component
══════════════════════════════════════════════ */
const ServiceRelationsEdit: React.FC<PublicRelationsEditProps> = ({ data, onBack, onUpdateSuccess }) => {
     const isService = true;
    const [formData, setFormData] = useState<any>(data || {});
    const [lineItems, setLineItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const anyLineItemHasHeader = lineItems.some(item => item.isHeader === true);

    /* ── Invoice file handlers ─────────────────── */
    const handleInvoiceFileChange = (lineItemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setLineItems(prev => prev.map(item => {
                if (item.id !== lineItemId) return item;
                const existing = Array.isArray(item.invoiceAttachments) ? item.invoiceAttachments : [];
                return { ...item, invoiceAttachments: [...existing, ...newFiles] };
            }));
            e.target.value = '';
        }
    };

    const handleViewFile = (file: File) => {
        if (file instanceof File) {
            try { window.open(URL.createObjectURL(file), '_blank'); }
            catch { toast.error('Unable to view file'); }
        }
    };

    const removeInvoiceAttachment = (lineItemId: number, fileIndex: number) => {
        setLineItems(prev => prev.map(item => {
            if (item.id !== lineItemId) return item;
            const existing = Array.isArray(item.invoiceAttachments) ? item.invoiceAttachments : [];
            return { ...item, invoiceAttachments: existing.filter((_: any, i: number) => i !== fileIndex) };
        }));
    };

    const truncateFileName = (name: string | undefined, maxLength = 24) => {
        if (!name) return 'File';
        if (name.length <= maxLength) return name;
        const ext = name.split('.').pop();
        const base = name.substring(0, name.lastIndexOf('.'));
        return `${base.substring(0, maxLength - 3 - (ext?.length || 0))}...${ext}`;
    };

    /* ── Add line item ─────────────────────────── */
    const addLineItem = () => {
        const newId = lineItems.length > 0 ? Math.max(...lineItems.map(i => i.id)) + 1 : 1;
        const newLineItemNumber = lineItems.length > 0
            ? Math.max(...lineItems.map(i => i.lineItemNumber || 0)) + 1 : 1;
        const templateItem = lineItems.length > 0 ? lineItems[0] : null;
        const lastItem = lineItems.length > 0 ? lineItems[lineItems.length - 1] : null;

        const newItem: any = {
            id: newId, lineItemNumber: newLineItemNumber, isNewlyAdded: true,
            venue:         templateItem?.venue         || data.Venue         || data.venue         || '',
            purchaseOrg:   templateItem?.purchaseOrg   || data.PurchaseOrg   || data.purchaseOrg   || '',
            description:   templateItem?.description   || '',
            commodityCode: templateItem?.commodityCode || data.CommodityCode || data.commodityCode || '',
            contract:      templateItem?.contract      || data.Contract      || data.contract      || null,
            purchaseGroup: templateItem?.purchaseGroup || data.PurchaseGroup || data.purchaseGroup || '',
            needBy:        templateItem?.needBy        || '',
            amount:        templateItem?.amount        || '',
            quantity:      templateItem?.quantity      || '',
            glAccount:     templateItem?.glAccount     || data.GLAccount     || data.glAccount     || '',
            supplier:      templateItem?.supplier      || extractVendorCode(data.Vendor || data.vendor || data.supplier),
            costCenter:    templateItem?.costCenter    || data.CostCenter    || data.costCenter    || '',
            companyCode:   templateItem?.companyCode   || data.CompanyCode   || data.companyCode   || '',
            shipToPlant:   templateItem?.shipToPlant   || data.ShipToPlant   || data.shipToPlant   || '',
            billTo:        templateItem?.billTo        || data.BillTo        || data.billTo        || '',
            currency:      templateItem?.currency      || data.Currency      || data.currency      || '',
            deliveryTo:    templateItem?.deliveryTo    || data.DeliverTo     || data.deliverTo     || data.deliveryTo || '',
            materialcode:  templateItem?.materialcode  || data.materialCode,
            taxCode:       templateItem?.taxCode       || data.TaxCode       || data.taxCode       || '',
            uom:           templateItem?.uom           || 'EA',
            receiptId:     null,
            autoGRN:           templateItem?.autoGRN       || false,
            headerComment:     templateItem?.headerComment || data.HeaderComment || data.headerComment || '',
            vendorName:        templateItem?.vendorName    || data?.vendorName?.trim() || '',
            autoInvoices:      formData.isHeader ? true : false,
            isHeader:          formData.isHeader ? true : false,
            originalIsHeader:  false,
            isOCRAttachmentProcessed: false,
            invoiceId:         (formData.isHeader && lastItem) ? lastItem.invoiceId   : '',
            invoiceDate:       (formData.isHeader && lastItem) ? lastItem.invoiceDate : '',
            invoiceComments:   '',
            invoiceAttachments: []
        };
        setLineItems(prev => [...prev, newItem]);
        toast.success('New line item added');
    };

    /* ── Load data ─────────────────────────────── */
    useEffect(() => {
        if (!data) return;
        try {
            const isHeader = data.isHeader || data.IsHeader || data.isheader || false;
            const rawLines = data.lineItems || data.LineItems || [];

            const getValue = (line: any, key: string, fallbackKeys: string[] = [], defaultValue: any = '') => {
                if (line[key] !== undefined && line[key] !== null && line[key] !== '') return line[key];
                for (const k of fallbackKeys) if (line[k] !== undefined && line[k] !== null && line[k] !== '') return line[k];
                if (data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
                for (const k of fallbackKeys) if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
                return defaultValue;
            };

            let lines: any[] = [];

            if (rawLines.length > 0) {
                lines = rawLines.map((line: any, index: number) => {
                    const item: any = { id: index + 1, isNewlyAdded: false };
                    item.venue         = getValue(line, 'venue',         ['Venue']);
                    item.purchaseOrg   = getValue(line, 'purchaseOrg',   ['PurchaseOrg']);
                    item.description   = getValue(line, 'description',   ['Description']);
                    item.commodityCode = getValue(line, 'commodityCode', ['CommodityCode', 'commdityCode']);
                    item.contract      = getValue(line, 'contract',      ['Contract'], null);
                    item.purchaseGroup = getValue(line, 'purchaseGroup', ['PurchaseGroup']);
                    item.needBy        = formatDateForInput(getValue(line, 'needBy', ['NeedBy']));
                    item.amount        = getValue(line, 'amount',        ['Amount', 'Price', 'price']);
                    item.quantity      = getValue(line, 'quantity',      ['Quantity']);
                    item.glAccount     = getValue(line, 'glAccount',     ['GLAccount']);
                    item.supplier      = extractVendorCode(getValue(line, 'supplier', ['vendor', 'Vendor']));
                    item.costCenter    = getValue(line, 'costCenter',    ['CostCenter']);
                    item.companyCode   = getValue(line, 'companyCode',   ['CompanyCode']);
                    item.shipToPlant   = getValue(line, 'shipToPlant',   ['ShipToPlant']);
                    item.billTo        = getValue(line, 'billTo',        ['BillTo']);
                    item.currency      = getValue(line, 'currency',      ['Currency']);
                    item.deliveryTo    = getValue(line, 'deliveryTo',    ['deliverTo', 'DeliverTo']);
                    item.materialcode  = getValue(line, 'materialcode',  ['materialCode', 'MaterialCode']);
                    item.taxCode       = getValue(line, 'taxCode',       ['TaxCode']);
                    item.uom           = getValue(line, 'uom',           ['UOM'], 'EA');
                    item.receiptId     = getValue(line, 'reciptID',      ['ReceiptId', 'ReceiptID', 'ReciptID']);
                    item.autoGRN       = getValue(line, 'autoGRN',       ['AutoGRN']);
                    item.headerComment = getValue(line, 'headerComment', ['HeaderComment', 'Comments']);
                    item.vendorName    = getValue(line, 'vendorName',    ['VendorName'], '');
                    item.lineItemNumber= getValue(line, 'lineItemNumber',['LineItemNumber'], index + 1);
                    item.autoInvoices  = getValue(line, 'autoInvoices',  ['autoInvoice', 'AutoInvoices', 'AutoInvoice'], false);
                    item.originalAutoInvoices = item.autoInvoices;
                    item.isHeader      = getValue(line, 'isHeader',      ['IsHeader'], false);
                    item.originalIsHeader     = item.isHeader;
                    item.isOCRAttachmentProcessed = getValue(line, 'isOCRAttachmentProcessed', ['IsOCRAttachmentProcessed'], false);
                    item.invoiceId     = getValue(line, 'InvoiceID',     ['invoiceID', 'invoiceId', 'InvoiceId'], '');
                    item.invoiceDate   = formatDateForInput(getValue(line, 'InvoiceDate', ['invoiceDate'], ''));
                    item.invoiceComments = getValue(line, 'invoiceComment', ['invoiceComments', 'InvoiceComment', 'InvoiceComments'], '');
                    const rawAttachments = line.invoiceAttachments || line.InvoiceAttachments || [];
                    item.invoiceAttachments = [];
                    item.originalInvoiceId           = item.invoiceId;
                    item.originalInvoiceDate         = item.invoiceDate;
                    item.originalInvoiceAttachments  = Array.isArray(rawAttachments) ? rawAttachments : [];
                    return { ...line, ...item, isHeader };
                });
            } else {
                const item: any = { id: 1, isNewlyAdded: false };
                item.venue         = data.Venue         || data.venue         || '';
                item.purchaseOrg   = data.PurchaseOrg   || data.purchaseOrg   || '';
                item.description   = data.Description   || data.description   || '';
                item.commodityCode = data.CommodityCode || data.commodityCode || data.commdityCode || '';
                item.contract      = data.Contract      || data.contract      || null;
                item.purchaseGroup = data.PurchaseGroup || data.purchaseGroup || '';
                item.needBy        = formatDateForInput(data.NeedBy || data.needBy || '');
                item.amount        = data.Amount        || data.amount        || data.Price || '';
                item.quantity      = data.Quantity      || data.quantity      || '';
                item.glAccount     = data.GLAccount     || data.glAccount     || '';
                item.supplier      = extractVendorCode(data.Vendor || data.vendor || data.supplier);
                item.costCenter    = data.CostCenter    || data.costCenter    || '';
                item.companyCode   = data.CompanyCode   || data.companyCode   || '';
                item.shipToPlant   = data.ShipToPlant   || data.shipToPlant   || '';
                item.billTo        = data.BillTo        || data.billTo        || '';
                item.currency      = data.Currency      || data.currency      || '';
                item.deliveryTo    = data.DeliverTo     || data.deliverTo     || data.deliveryTo || '';
                item.materialcode  = data.MaterialCode  || data.materialCode  ;
                item.taxCode       = data.TaxCode       || data.taxCode       || '';
                item.uom           = data.UOM           || data.uom           || 'EA';
                item.receiptId     = data.reciptID      || data.ReceiptId     || data.ReceiptID   || '';
                item.autoGRN       = data.AutoGRN       || data.autoGRN;
                item.headerComment = data.HeaderComment || data.headerComment || '';
                item.vendorName    = data?.vendorName?.trim() || '';
                item.lineItemNumber = 1;
                item.autoInvoices  = data.autoInvoices  || data.autoInvoice   || data.AutoInvoices || data.AutoInvoice || false;
                item.originalAutoInvoices = item.autoInvoices;
                item.isHeader      = data.isHeader      || data.IsHeader      || false;
                item.originalIsHeader     = item.isHeader;
                item.isOCRAttachmentProcessed = data.isOCRAttachmentProcessed || data.IsOCRAttachmentProcessed || false;
                item.invoiceId     = data.InvoiceID     || data.invoiceID     || data.invoiceId    || data.InvoiceId || '';
                item.invoiceDate   = formatDateForInput(data.InvoiceDate || data.invoiceDate || '');
                item.invoiceComments = data.invoiceComment || data.invoiceComments || data.InvoiceComment || data.InvoiceComments || '';
                const rawAttachments = data.invoiceAttachments || data.InvoiceAttachments || [];
                item.invoiceAttachments = [];
                item.originalInvoiceId          = item.invoiceId;
                item.originalInvoiceDate        = item.invoiceDate;
                item.originalInvoiceAttachments = Array.isArray(rawAttachments) ? rawAttachments : [];
                lines = [item];
            }

            setLineItems(lines);
            setFormData({ ...data, isHeader });
        } catch (error) {
            toast.error('Error loading PR data');
        }
    }, [data]);

    /* ── Field change handler ──────────────────── */
    const handleLineItemChange = (id: number, field: string, value: any) => {
        if (field === 'isHeader') {
            setLineItems(prev => prev.map(item => ({ ...item, [field]: value })));
        } else if (field === 'autoGRN') {
            setLineItems(prev => prev.map(item => {
                if (item.id !== id) return item;
                if (!value) return { ...item, autoGRN: false, autoInvoices: false, isHeader: false };
                return { ...item, autoGRN: true, autoInvoices: item.originalAutoInvoices ?? false, isHeader: item.originalIsHeader ?? false };
            }));
        } else if (field === 'autoInvoices') {
            setLineItems(prev => prev.map(item => {
                if (item.id !== id) return item;
                if (!value) return { ...item, autoInvoices: false, isHeader: false };
                return { ...item, autoInvoices: true, invoiceId: item.invoiceId || '', invoiceDate: item.invoiceDate || '', invoiceComments: item.invoiceComments || '', invoiceAttachments: item.invoiceAttachments || [] };
            }));
        } else {
            setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        }
    };

    /* ── File to base64 ────────────────────────── */
    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    /* ── Update PR ─────────────────────────────── */
    const handleUpdate = async () => {
        setLoading(true);
        try {
            if (lineItems.length === 0) return;

            const isHeaderValues = lineItems.map(item => Boolean(item.isHeader));
            if (!isHeaderValues.every(v => v === isHeaderValues[0])) {
                toast.error('All line items must have the same "applicable for all line items" value');
                setLoading(false); return;
            }

            for (const item of lineItems) {
                const isLocked = hasLockedInvoiceData(item, formData.isHeader);
                if (item.autoInvoices && !isLocked) {
                    const hasId   = !!(item.invoiceId && item.invoiceId.trim());
                    const hasDate = !!(item.invoiceDate && item.invoiceDate.trim());
                    const hasAttach = (formData.isHeader || (!isNewlyAddedItem(item) && item.originalAutoInvoices))
                        ? true
                        : (Array.isArray(item.invoiceAttachments) && item.invoiceAttachments.length > 0) ||
                          (Array.isArray(item.originalInvoiceAttachments) && item.originalInvoiceAttachments.length > 0);
                    if ((hasId || hasDate || hasAttach) && (!hasId || !hasDate || !hasAttach)) {
                        toast.error(`Line Item ${item.lineItemNumber || item.id}: All invoice fields must be filled`);
                        setLoading(false); return;
                    }
                }
            }

            if (isHeaderValues[0]) {
                const ids = lineItems.filter(i => i.autoInvoices && i.invoiceId).map(i => i.invoiceId.trim());
                if (ids.length > 0 && !ids.every(id => id === ids[0])) {
                    toast.error('All line items must have the same Invoice ID when "applicable for all line items" is checked');
                    setLoading(false); return;
                }
            }

            const updatedLineItems = await Promise.all(lineItems.map(async (item, index) => {
                const lineItem: any = {
                    NumberInCollection: item.lineItemNumber || index + 1,
                    purchaseOrg:  item.purchaseOrg,
                    vendor:       extractVendorCode(item.supplier),
                    description:  item.description,
                    commodityCode:extractCode(item.commodityCode),
                    contract:     extractCode(item.contract),
                    purchaseGroup:item.purchaseGroup,
                    quantity:     parseInt(item.quantity),
                    uom:          item.uom,
                    amount:       parseFloat(item.amount),
                    deliveryDate: item.needBy ? new Date(item.needBy).toISOString() : undefined,
                    needBy:       item.needBy ? new Date(item.needBy).toISOString() : undefined,
                    deliverTo:    item.deliveryTo,
                    glAccount:    item.glAccount,
                    costCenter:   extractCode(item.costCenter),
                    materialCode: item.materialcode,
                    venue:        item.venue,
                    companyCode:  item.companyCode,
                    shipToPlant:  item.shipToPlant,
                    billTo:       item.billTo,
                    currency:     item.currency,
                    taxCode:      item.taxCode,
                    autoGRN:      Boolean(item.autoGRN),
                    TaxInclude:   undefined,
                    VendorName:   item.vendorName,
                    autoInvoices: Boolean(item.autoInvoices),
                    isHeader:     Boolean(item.isHeader),
                };

                const isLocked = hasLockedInvoiceData(item, formData.isHeader);
                if (item.autoInvoices && !isLocked) {
                    if (item.invoiceId)   lineItem.InvoiceID   = item.invoiceId;
                    if (item.invoiceDate) lineItem.InvoiceDate = new Date(item.invoiceDate).toISOString();
                    if (Array.isArray(item.invoiceAttachments) && item.invoiceAttachments.length > 0) {
                        const newFiles = item.invoiceAttachments.filter((a: any) => a instanceof File);
                        if (newFiles.length > 0) {
                            lineItem.InvoiceAttachment = await Promise.all(newFiles.map(async (file: File) => ({
                                assetType: 'INVOICE_TYPE_PRATTACHMENT',
                                contentType: file.type || 'application/pdf',
                                entityType: 'INVOICE_TYPE_PRATTACHMENT',
                                fileBytes: await fileToBase64(file),
                                fileName: file.name
                            })));
                        }
                    }
                }
                return lineItem;
            }));

            const payload = {
                isUpdate: true,
                prRequests: [{
                    prNumber:      formData.prNumber,
                    headerComment: lineItems[0]?.headerComment || formData.headerComment,
                    needBy:        formData.needBy ? new Date(formData.needBy).toISOString() : undefined,
                    isHeader:      Boolean(lineItems[0]?.isHeader || formData.isHeader),
                    lineItems:     updatedLineItems,
                    isUpdate:      true
                }]
            };

            const response = await createServicePR(payload as any);
            if (response && (response.statusCode === 200 || response.statusCode === 201)) {
                toast.success('PR updated successfully');
                setTimeout(() => { onUpdateSuccess(); onBack(); }, 1500);
            } else {
                toast.error('Update failed: ' + (response?.message || 'Unknown error'));
            }
        } catch (error) {
            toast.error('Error submitting PR');
        } finally {
            setLoading(false);
        }
    };

    /* ── Render ─────────────────────────────────── */
    return (
        <div className="pr-edit-wrapper animate-fade-in">

            {/* ── Sticky header ── */}
            <div className="pr-edit-header">
                <BackButton onClick={onBack} />
                <h2 className="pr-edit-header__title">
                    Edit PR:&nbsp;
                    <span className="pr-edit-header__pr-num">
                        {formData.prNumber || formData.PRNumber}
                    </span>
                </h2>
            </div>

            {/* ── Empty / loading states ── */}
            {!data ? (
                <div className="pr-edit-empty">No PR data found. Please go back and try again.</div>
            ) : !lineItems || lineItems.length === 0 ? (
                <div className="pr-edit-empty">Loading line items...</div>
            ) : (

                /* ── Line item cards ── */
                <div className="pr-edit-cards">
                    {lineItems.map((item, index) => {
                        if (!item || typeof item !== 'object') return null;
                        const itemIsNew    = isNewlyAddedItem(item);
                        const itemIsLocked = hasLockedInvoiceData(item, formData.isHeader);

                        const autoInvoicesDisabled =
                            !item.autoGRN ||
                            (itemIsLocked && !itemIsNew) ||
                            (item.originalAutoInvoices === true && item.originalIsHeader === true) ||
                            (itemIsNew && anyLineItemHasHeader) ||
                            formData.isHeader === true;

                        const isHeaderDisabled =
                            !item.autoGRN ||
                            !item.autoInvoices ||
                            (item.originalAutoInvoices === true && item.originalIsHeader === true) ||
                            (itemIsNew && anyLineItemHasHeader) ||
                            formData.isHeader === true;

                        return (
                            <div key={item.id} className="pr-edit-card">

                                {/* Card title */}
                                <div className="pr-edit-card__header">
                                    <h3 className="pr-edit-card__title">
                                        Line Item {item.lineItemNumber || index + 1}
                                    </h3>
                                    {itemIsNew    && <span className="pill pill-new">New</span>}
                                    {itemIsLocked && !itemIsNew && <span className="pill pill-locked">Invoice Locked</span>}
                                </div>

                                {/* Scrollable field table */}
                                <div className="pr-edit-card__body">
                                    <table className="pr-edit-table">
                                        <thead>
                                            <tr>
                                                <th>Field</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editField.map((field: any) => {
                                                if (field.conditional && !item.autoInvoices) return null;
                                                if (field.serviceOnly && !isService) return null;  
                                                if (field.materialOnly && isService) return null;

                                                const isInvIdOrDate = field.key === 'invoiceId' || field.key === 'invoiceDate';
                                                const inputDisabled = isInvIdOrDate && formData.isHeader;

                                                return (
                                                    <tr key={field.key}>
                                                        <td className="field-label">{field.label}</td>
                                                        <td>
                                                            {field.type === 'checkbox' ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        item[field.key] ||
                                                                        (formData.isHeader === true &&
                                                                         (field.key === 'autoInvoices' || field.key === 'isHeader')) ||
                                                                        false
                                                                    }
                                                                    onChange={e => handleLineItemChange(item.id, field.key, e.target.checked)}
                                                                    disabled={
                                                                        (field.key === 'autoGRN'      && item.receiptId && item.autoGRN) ||
                                                                        (field.key === 'autoInvoices' && autoInvoicesDisabled) ||
                                                                        (field.key === 'isHeader'     && isHeaderDisabled)
                                                                    }
                                                                />
                                                            ) : (
                                                                <input
                                                                    type={field.type === 'date' ? 'date' : 'text'}
                                                                    value={item[field.key] || ''}
                                                                    onChange={e => handleLineItemChange(item.id, field.key, e.target.value)}
                                                                    disabled={inputDisabled}
                                                                />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Invoice attachments row */}
                                            {item.autoGRN &&
                                             item.autoInvoices &&
                                             item.originalIsHeader === false &&
                                             !formData.isHeader &&
                                             !itemIsLocked &&
                                             (itemIsNew || !item.originalAutoInvoices) && (
                                                <tr>
                                                    <td className="field-label">Invoice Attachments</td>
                                                    <td>
                                                        <input
                                                            type="file"
                                                            id={`inv-file-${item.id}`}
                                                            multiple
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={e => handleInvoiceFileChange(item.id, e)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        <label htmlFor={`inv-file-${item.id}`} className="invoice-attach-label">
                                                            {Array.isArray(item.invoiceAttachments) && item.invoiceAttachments.length > 0
                                                                ? `Attachments (${item.invoiceAttachments.length})`
                                                                : 'Add Invoice Attachments'}
                                                        </label>

                                                        {Array.isArray(item.invoiceAttachments) && item.invoiceAttachments.length > 0 && (
                                                            <ul className="attach-file-list">
                                                                {item.invoiceAttachments.map((file: File, fi: number) => (
                                                                    <li key={fi} className="attach-file-item">
                                                                        <span
                                                                            className="attach-file-name"
                                                                            title={file?.name || 'Unknown file'}
                                                                            onClick={() => handleViewFile(file)}
                                                                        >
                                                                            {truncateFileName(file?.name || (file as any).fileName || 'Unknown file')}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="attach-file-remove"
                                                                            onClick={() => removeInvoiceAttachment(item.id, fi)}
                                                                            title="Remove"
                                                                        >✕</button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Fixed footer ── */}
            <div className="pr-edit-footer">
                <button
                    className="ab-btn ab-btn-outline"
                    onClick={handleUpdate}
                    disabled={loading}
                >
                    <FaSave /> {loading ? 'Updating...' : 'Update PR'}
                </button>

                <button
                    className="ab-btn ab-btn-primary"
                    onClick={addLineItem}
                >
                    <FaPlus /> Add Line Item
                </button>
                <button
                    className="ab-btn ab-btn-ghost"
                    onClick={onBack}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ServiceRelationsEdit;