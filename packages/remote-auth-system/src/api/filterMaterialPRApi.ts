import axios from "./axiosInstance";
import type { FilterMaterialPRDto } from "../Dto/FilterMaterialPRDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

export interface FilterMaterialPRRequest {
  index: number;
  limit: number;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  glAccount?: string[];
  materialCode?: string[];
  costCenter?: string[];
}

interface FilterMaterialPRResponse {
  statusCode: number;
  data: FilterMaterialPRDto[];
  message: string;
}

export interface MaterialCodesDTO {
  data: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedFilterPayload {
  page?: number;
  page_size?: number;
  search?: string;
}

// Filter Material PRs with POST request
export const filterMaterialPR = async (
  filters: FilterMaterialPRRequest
): Promise<FilterMaterialPRResponse | ErrorResponseDto> => {
  try {
    // Build the payload with only defined fields
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
    if (filters.materialCode && filters.materialCode.length > 0) {
      payload.materialCode = filters.materialCode;
    }
    if (filters.costCenter && filters.costCenter.length > 0) {
      payload.costCenter = filters.costCenter;
    }
    // companyCode is intentionally excluded per requirements

    const response = await axios.post<FilterMaterialPRDto[]>(
      `/api/v1/GetMaterialPR`,
      payload,
      {
        withCredentials: true,
      }
    );

    return {
      statusCode: 200,
      data: response.data,
      message: "Material PRs filtered successfully",
    };
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.statusCode || err.status || error.response.status || 500,
        message: err.title || err.message || 'Failed to filter Material PRs',
        description: err.detail || err.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while filtering Material PRs.',
    };
  }
};

// Get All Material PRs
export const getAllMaterialPR = async (
  index: number,
  limit: number
): Promise<FilterMaterialPRResponse | ErrorResponseDto> => {
  try {
    const response = await axios.get<FilterMaterialPRDto[]>(
      `/api/v1/GetMaterialPR`,
      {
        params: { index, limit },
        withCredentials: true,
      }
    );

    return {
      statusCode: 200,
      data: response.data,
      message: "Material PRs fetched successfully",
    };
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.statusCode || err.status || error.response.status || 500,
        message: err.title || err.message || 'Failed to fetch Material PRs',
        description: err.detail || err.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching Material PRs.',
    };
  }
};
// Fetch Material Codes
export const fetchMaterialCodes = async (payload?: PaginatedFilterPayload): Promise<MaterialCodesDTO | ErrorResponseDto> => {
  try {
    const params = {
      page: payload?.page || 1,
      page_size: payload?.page_size || 10,
      ...(payload?.search && { search: payload.search }),
    };

    const response = await axios.get<MaterialCodesDTO>("/api/v1/GetMaterialCodes", {
      params,
      withCredentials: true,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.statusCode || err.status || error.response.status || 500,
        message: err.title || err.message || 'Failed to fetch Material Codes',
        description: err.detail || err.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching Material Codes.',
    };
  }
};
