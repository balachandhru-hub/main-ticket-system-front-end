import PoExcel from "./poUploadExcelApi";
import type { UploadExcelDraftResponse } from "../api/prEntertainmentApi"
import type { CreateMaterialPRPayload } from "../api/prEntertainmentApi";
import type { GetAllMaterialPRPayload } from "../api/prEntertainmentApi";

export type CreateConciergeServicePRPayload = CreateMaterialPRPayload;
export type UploadExcelDraftConciergeServicePRResponse = UploadExcelDraftResponse;

const isErrorResponse = (data: any): boolean => {
    return data && (data.statusCode >= 400 || data.status_code >= 400);
};

export interface PaginatedFilterPayload {
    page?: number;
    page_size?: number;
    search?: string;
}

export interface SuccessResponseDto {
    statusCode: number;
    message: string;
    data?: any;
}

export interface ErrorResponseDto {
    statusCode: number;
    message: string;
    description: string;
}

export interface ConciergeAssetDto {
    fileName: string;
    contentType: string;
    fileBytes: string;
    isSingletonAsset: boolean;
    entityType: string;
    assetType: string;
}

export interface ConciergeLineItemDto {
    NumberInCollection?: number;
    Venue?: string;
    Description?: string;
    Quantity?: number;
    UOM?: string;
    amount?: number;
    Currency?: string;
    Vendor?: string;
    Contract?: string | null;
    PurchaseOrg?: string;
    GLAccount?: string;
    CostCenter?: string;
    MaterialCode?: string;
    NeedBy?: string;
    TaxCode?: string;
    AutoGRN?: boolean;
    TaxInclude?: boolean;
    VendorName?: string;
    AutoInvoices?: boolean;
    InvoiceID?: string | null;
    InvoiceDate?: string | null;
    InvoiceAttachment?: ConciergeAssetDto[] | null;
    InvoiceComment?: string | null;
    ocrProceed?: boolean;
    CommodityCode?: string;
    PurchaseGroup?: string;
    DeliveryDate?: string;
    DeliverTo?: string;
    CompanyCode?: string;
    ShipToPlant?: string;
    BillTo?: string;
    ServiceStartDate?: string;
    ServiceEndDate?: string;
    AutoSES?: boolean;
}

export interface ConciergeRequestDto {
    HeaderComment?: string;
    NeedBy?: string;
    isHeader?: boolean;
    lineItems?: ConciergeLineItemDto[];

}

export interface CreateConciergePRPayload {
    PRRequests?: ConciergeRequestDto[];
    asset?: ConciergeAssetDto[];
}

export const fetchConciergeVenueName = async (payload?: PaginatedFilterPayload): Promise<any | null> => {
    try {
        const params = {
            index: payload?.page !== undefined ? payload.page : 1,
            limit: payload?.page_size || 100,
            ...(payload?.search && { searchTerm: payload.search }),
        };

        const response = await PoExcel.get<any>("/api/v1/concierge-venue-name", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        const datas = response?.data;
        const venueStrings = datas?.map((item: any) => item?.venueName);

        return {
            suppliers: venueStrings,
            pagination: {
                page: params.index,
                page_size: params.limit,
                total: venueStrings.length,
                total_pages: 1,
            },
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
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
            description: error.message || `Something went wrong while fetching concierge venues.`,
        };
    }
};

export const getConciergeVenueDetails = async (payload?: any): Promise<any | null> => {
    try {
        const params = {
            ...(payload?.search && { venueName: payload?.search?.trim() }),
        };

        const response = await PoExcel.get<any>("/api/v1/concierge-venue-details", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }
        const datas = response?.data;
        return {
            suppliers: datas,
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
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
            description: error.message || `Something went wrong while fetching concierge venue details.`,
        };
    }
};

export const createConciergePR = async (
    payload: CreateConciergePRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/concierge-pr",
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
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
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
            description: error.message || "Something went wrong while creating Concierge PR.",
        };
    }
};

export const createConciergeServicePR = async (
    payload: CreateConciergePRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/concierge-service-pr",
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
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
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
            description: error.message || "Something went wrong while creating Concierge Service PR.",
        };
    }
};
export const createServicePRDraft = async (
    payload: CreateConciergeServicePRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/DraftServicePR",
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
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
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
            description:
                error.message || "Something went wrong while creating Material PR.",
        };
    }
};

export const getAllServicePR = async (payload?: {
    index?: number;
    limit?: number;
    searchTerm?: string;
}): Promise<any> => {
    try {
        const body = {
            index: payload?.index ?? 0,
            limit: payload?.limit ?? 10,
            searchTerm: payload?.searchTerm
        };
        const response = await PoExcel.post<any>(`/api/v1/GetAllServicePR`, body);

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
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        return {
            statusCode: statusCode || 500,
            message: "Unexpected Error",
        };
    }
};

export const getAllDraftServicePR = async (
    payload?: GetAllMaterialPRPayload
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

export const uploadExcelDraftServicePR = async (file: File): Promise<UploadExcelDraftConciergeServicePRResponse | ErrorResponseDto> => {
    try {
        const formData = new FormData();
        formData.append('excelFile', file);

        const response = await PoExcel.post<any>(
            "/api/v1/upload-excel-draft-service-pr",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        // Response example in swagger is plain text with the counts; try to return parsed body if present
        return response.data as UploadExcelDraftResponse;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
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
            description:
                error.message || "Something went wrong while uploading the Excel file.",
        };
    }
};