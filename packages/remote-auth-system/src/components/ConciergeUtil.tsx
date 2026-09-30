// ─────────────────────────────────────────────────────────────────────────────
// utils.ts  — shared helper functions
// ─────────────────────────────────────────────────────────────────────────────

import type { PRMode, BaseFormData, ServiceFormData } from '../Dto/ConciergeTpesDto';

export const extractCode = (value: string | undefined | null): string => {
    if (!value) return '';
    return value.split(' ')[0] || value;
};

export const extractVendorCode = (value: string | undefined | null): string => {
    if (!value) return '';
    const parts = value.split(' - ');
    if (parts.length >= 3) return parts[2].trim();
    if (parts.length === 2) return parts[0].trim();
    return value;
};

export const extractVendorCodes = (value: string | undefined | null): string => {
    if (!value) return '';
    const parts = value.split(' - ');
    if (parts.length >= 3) return parts[2].trim();
    if (parts.length === 2) return parts[1].trim();
    return value;
};

export const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
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

export const truncateFileName = (name: string | undefined | null, maxLength: number = 20): string => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0));
    return `${truncatedName}...${extension}`;
};

export const formatDateForInput = (dateString: string | Date | undefined | null): string => {
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

export const getTodayDate = (): string => {
    const today = new Date();
    return formatDateForInput(today);
};

export const getMonthEndDate = (): string => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return formatDateForInput(endOfMonth);
};

export const getBaseResetFormState = (prev: Partial<BaseFormData> = {}): BaseFormData => ({
    venue: '',
    supplier: '',
    description: '',
    amount: '',
    costCenter: prev.costCenter || '',
    companyCode: prev.companyCode || '',
    shipToPlant: prev.shipToPlant || '',
    billTo: prev.billTo || '',
    purchaseOrg: prev.purchaseOrg || '',
    purchaseGroup: prev.purchaseGroup || '',
    currency: prev.currency || 'AED',
    deliveryTo: prev.deliveryTo || '',
    materialcode: prev.materialcode || '',
    taxCode: '',
    needBy: getTodayDate(),
    contract: null,
    glAccount: prev.glAccount || '',
    uom: 'EA',
    autoInvoice: false,
    quantity: '1',
    autoGRN: true,
    comments: '',
    invoiceId: '',
    invoiceDate: '',
    invoiceComments: '',
    vendorId: '',
    taxInclude: false,
    prNumber: prev.prNumber || '',
    title: prev.title || '',
});

export const getServiceResetFormState = (prev: Partial<ServiceFormData> = {}): ServiceFormData => ({
    ...getBaseResetFormState(prev),
    serviceStartDate: getTodayDate(),
    serviceEndDate: getMonthEndDate(),
    autoSES: true,
});

export const getResetFormState = (mode: PRMode, prev: any = {}): any => {
    return mode === 'service' ? getServiceResetFormState(prev) : getBaseResetFormState(prev);
};