// ─────────────────────────────────────────────────────────────────────────────
// types.ts  — shared across Material and Service PR
// ─────────────────────────────────────────────────────────────────────────────

export type PRMode = 'material' | 'service';

export interface Supplier {
    supplierId: string;
    supplierName: string;
}

// Base form data shared by BOTH modes
export interface BaseFormData {
    venue: string;
    supplier: string;
    description: string;
    amount: string;
    costCenter: string;
    companyCode: string;
    shipToPlant: string;
    billTo: string;
    purchaseOrg: string;
    purchaseGroup: string;
    currency: string;
    deliveryTo: string;
    materialcode: string;
    taxCode: string;
    needBy: string;
    contract: string | null;
    glAccount: string;
    uom: string;
    autoInvoice: boolean;
    quantity: string;
    autoGRN: boolean;
    comments: string;
    invoiceId: string;
    invoiceDate: string;
    invoiceComments: string;
    vendorId: string;
    taxInclude: boolean;
    prNumber?: string;
    title?: string;
}

// Extra fields ONLY for Service mode
export interface ServiceExtraFields {
    serviceStartDate: string;
    serviceEndDate: string;
    autoSES: boolean;
}

// Combined form data (service has extra fields)
export type MaterialFormData = BaseFormData;
export type ServiceFormData = BaseFormData & ServiceExtraFields;
export type AnyFormData = MaterialFormData | ServiceFormData;

// Line item shared
export interface BaseLineItem {
    id?: number;
    venue: string;
    supplier: string;
    description: string;
    amount: string;
    contract?: string | null;
    glAccount?: string;
    uom?: string;
    quantity?: string;
    purchaseOrg?: string;
    costCenter?: string;
    needBy?: string;
    currency?: string;
    autoGRN?: boolean;
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
    ocrProceed?: boolean;
}

export interface ServiceLineItem extends BaseLineItem {
    serviceStartDate?: string;
    serviceEndDate?: string;
    autoSES?: boolean;
}

export type AnyLineItem = BaseLineItem | ServiceLineItem;

// API config injected per mode
export interface PRApiConfig {
    createPR: (payload: any) => Promise<any>;
    fetchVenueName: (params: any) => Promise<any>;
    getVenueDetails: (params: any) => Promise<any>;
    createDraft: (payload: any) => Promise<any>;
    uploadExcelDraft: (file: File) => Promise<any>;
}

export interface ConciergeBaseProps {
    onBack?: () => void;
    userId?: string;
    exitConfirmed?: boolean;
    onResetExitFlag?: () => void;
    onViewModeChange?: (viewMode: 'form' | 'summary' | 'edit' | 'draft') => void;
    onModeChange?: (mode: PRMode) => void;
}