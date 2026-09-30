import PoExcel from "./poUploadExcelApi";

const isErrorResponse = (data: any): boolean => {
    return data && (data.statusCode >= 400 || data.status_code >= 400);
};

export interface GetAllServicePRPayload {
    index?: number;
    limit?: number;
    searchTerm?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    glAccount?: string[];
    materialCode?: string[];
    costCenter?: string[];
}

export const createServicePR = async (payload: any): Promise<any> => {
    try {
        const response = await PoExcel.post<any>(
            "/api/v1/PublicRelationServicePR",
            payload,
            { withCredentials: true }
        );
        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }
        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) (window as any).handleUnauthorized?.();
        if (error.response?.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description: error.message || "Something went wrong while creating Service PR.",
        };
    }
};

export const getAllServicePR = async (payload?: GetAllServicePRPayload): Promise<any> => {
    try {
        const requestBody = {
            index: payload?.index ?? 0,
            limit: payload?.limit ?? 10,
            ...(payload?.searchTerm && { searchTerm: payload.searchTerm }),
        };
        const response = await PoExcel.post<any>("/api/v1/GetAllServicePR", requestBody);
        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }
        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) (window as any).handleUnauthorized?.();
        if (error.response?.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description: error.message || "Something went wrong while fetching Service PRs.",
        };
    }
};

export const getAllDraftServicePR = async (
    payload?: GetAllServicePRPayload
): Promise<any> => {
    try {
        const requestBody = {
            index: payload?.index ?? 0,
            limit: payload?.limit ?? 10,
            ...(payload?.searchTerm && { searchTerm: payload.searchTerm }),
            ...(payload?.fromDate && { fromDate: payload.fromDate }),
            ...(payload?.toDate && { toDate: payload.toDate }),
            ...(payload?.status && { status: payload.status }),
            ...(payload?.glAccount?.length && { glAccount: payload.glAccount }),
            ...(payload?.materialCode?.length && { materialCode: payload.materialCode }),
            ...(payload?.costCenter?.length && { costCenter: payload.costCenter }),
        };

        const response = await PoExcel.post(
            "/api/v1/GetAllDraftServicePR",
            requestBody
        );

        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 401) {
            (window as any).handleUnauthorized?.();
        }

        return {
            statusCode: error?.response?.status || 500,
            message: "Unexpected Error",
        };
    }
};

export const fetchAssetsBulk = async (
    assetIds: string[]
): Promise<any[]> => {
    try {
        if (!assetIds || assetIds.length === 0) {
            return [];
        }
        const response = await PoExcel.post<any>(
            `/api/v1/asset/list`,
            assetIds,  // Send array with potential duplicates
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return [];
            }
            return [];
        }

        return response.data || [];
    } catch (error: any) {
        if (error?.response?.status === 401) {
            (window as any).handleUnauthorized?.();
        }
        return [];
    }
};

export interface UpdateServicePRDto {
    purchaseOrg: string;
    vendor: string;
    description: string;
    commodity: string;
    contract: string;
    purchaseGroup: string;
    quantity: number;
    uom: string;
    amount: number;
    deliveryDate: string;
    deliverTo: string;
    glAccount: string;
    costCenter: string;
    materialCode: string;
}

export interface UpdateServicePRResponse {
    success: boolean;
    message: string;
    prNumber?: string;
}

export interface UpdateLineItemDto {
    numberInCollection?: number;
    originatingSystemLineNumber?: string;
    quantity?: number;
    lineItemNumber?: number;
    deliverTo?: string;
    needBy?: string;
    serviceStartDate?: string;
    serviceEndDate?: string;
    crossCharge?: boolean;
    type?: string;
    venue?: string;
    description?: string;
    manPartNumber?: string;
    vendor?: string;
    contract?: string;
    supplierPartAuxiliaryID?: string;
    uom?: string;
    price?: number;
    autoGRN?: boolean;
    autoInvoices?: boolean;
    currency?: string;
    commodityDomain?: string;
    commodityCode?: string;
    preparerPasswordAdapter?: string;
    requesterPasswordAdapter?: string;
    materialCode?: string;
    itemCategory?: string;
    purchaseOrg?: string;
    purchaseGroup?: string;
    shipTo?: string;
    billingAddress?: string;
    supplier?: string;
    supplierLocation?: string;
    costCenter?: string;
    companyCode?: string;
    glAccount?: string;
    procurementUnit?: string;
    glAccountCompanyCode?: string;
    costCenterCompanyCode?: string;
    accountType?: string;
    amount?: number;
    title?: string;
    shipToPlant?: string;
    billTo?: string;
    taxCode?: string;
    deliveryDate?: string;
}

export interface UpdateServicePRRequestDto {
    uniqueName?: string;
    headerComment?: string;
    defaultDeliverTo?: string;
    needBy?: string;
    venue?: string;
    lineItems?: UpdateLineItemDto[];
    attachments?: any[];
    isUpdate?: boolean;
}