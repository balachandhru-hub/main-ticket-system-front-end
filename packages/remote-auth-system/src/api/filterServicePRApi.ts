import axios from "./axiosInstance";
import type { FilterServicePRDto, FilterServicePRRequest } from "../Dto/FilterServicePRDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

interface FilterServicePRResponse {
    statusCode: number;
    data: FilterServicePRDto[];
    message: string;
}

export const filterServicePR = async (
    filters: FilterServicePRRequest
): Promise<FilterServicePRResponse | ErrorResponseDto> => {
    try {
        const payload: any = {
            index: filters.index,
            limit: filters.limit,
        };

        if (filters.searchTerm) {
            payload.searchTerm = filters.searchTerm;
        }
        if (filters.fromDate) {
            payload.fromDate = filters.fromDate;
        }
        if (filters.toDate) {
            payload.toDate = filters.toDate;
        }
        if (filters.status) {
            payload.status = filters.status;
        }
        if (filters.glAccount && filters.glAccount.length > 0) {
            payload.glAccount = filters.glAccount;
        }
        if (filters.commodity && filters.commodity.length > 0) {
            payload.commodity = filters.commodity;
        }
        if (filters.costCenter && filters.costCenter.length > 0) {
            payload.costCenter = filters.costCenter;
        }
        if (filters.serviceStartDate) {
            payload.serviceStartDate = filters.serviceStartDate;
        }
        if (filters.serviceEndDate) {
            payload.serviceEndDate = filters.serviceEndDate;
        }

        const response = await axios.post<FilterServicePRDto[]>(
            `/api/v1/GetServicePR`,
            payload,
            {
                withCredentials: true,
            }
        );

        return {
            statusCode: 200,
            data: response.data,
            message: "Service PRs filtered successfully",
        };
    } catch (error: any) {
        if (error.response?.data) {
            const err = error.response.data;
            return {
                statusCode: err.statusCode || err.status || error.response.status || 500,
                message: err.title || err.message || 'Failed to filter Service PRs',
                description: err.detail || err.description || 'No details provided',
            };
        }
        return {
            statusCode: 500,
            message: 'Unexpected Error',
            description: error.message || 'Something went wrong while filtering Service PRs.',
        };
    }
};