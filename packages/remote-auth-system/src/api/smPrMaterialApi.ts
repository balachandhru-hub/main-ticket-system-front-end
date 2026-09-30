import axiosInstance from "./axiosInstance";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
export interface BulkUploadResponse {
    totalRows: number;
    successfulUploads: number;
    failedUploads: number;
    errorResponses: any[];
    rows?: any[];
}

export const uploadBulkExcel = async (
    file: File
): Promise<BulkUploadResponse | ErrorResponseDto> => {
    try {
        const formData = new FormData();
        formData.append("excelFile", file);
        const response = await axiosInstance.post<BulkUploadResponse>(
            "/api/v1/upload-excel-material-pr",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                totalRows: errData.totalRows || 0,
                successfulUploads: errData.successfulUploads || 0,
                failedUploads: errData.failedUploads || 0,
                errorResponses: errData.errorResponses || [],
            };
        }
        return {
            totalRows: 0,
            successfulUploads: 0,
            failedUploads: 0,
            errorResponses: [],
        };
    }
};
export const uploadBulkExcelForService = async (
    file: File
): Promise<BulkUploadResponse | ErrorResponseDto> => {
    try {
        const formData = new FormData();
        formData.append("excelFile", file);
        const response = await axiosInstance.post<BulkUploadResponse>(
            "api/v1/upload-excel-service-pr",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                totalRows: errData.totalRows || 0,
                successfulUploads: errData.successfulUploads || 0,
                failedUploads: errData.failedUploads || 0,
                errorResponses: errData.errorResponses || [],
            };
        }
        return {
            totalRows: 0,
            successfulUploads: 0,
            failedUploads: 0,
            errorResponses: [],
        };
    }
};
export interface MaterialDetailsResponse {
    commodityCode: string;
    taxCode: string | null;
    unitOfMeasure: string;
}

export const getMaterailDetails = async (
    materialId: string
): Promise<MaterialDetailsResponse | null> => {
    try {
        const response = await axiosInstance.get<MaterialDetailsResponse>(
            `/api/v1/GetMaterialDetails/${materialId}`,
            {
                withCredentials: true
            }
        );
        return response.data;
    } catch (error: any) {
        return null;
    }
};