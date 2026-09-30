import instance from './axiosInstance';
import type { ContractDetailsDto, DropdownOption, ErrorResponseDto } from '../Dto/ContractDetailsDto';
import type { CreateContractPayload, CreateContractResult } from '../Dto/ContractDetailsDto';
import type { VendorFetchResponse } from '../Dto/ContractCustomTypeDto';
interface FetchResponse {
  data: DropdownOption[];
  error: ErrorResponseDto | null;
}

const handleError = (error: any): ErrorResponseDto => {
  if (error.response?.status === 401) {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    (window as any).handleUnauthorized?.();
    return {
      statusCode: 401,
      message: 'Session expired. Please login again.',
    };
  }

  if (error.response?.status) {
    return {
      statusCode: error.response.status,
      message: error.response.data?.message || 'An error occurred',
    };
  }

  return {
    statusCode: 500,
    message: error.message || 'An unexpected error occurred',
  };
};

const isErrorResponse = (data: any): data is ErrorResponseDto => {
  return data && (data.statusCode || (data as any).status_code);
};

const transformToOptions = (data: ContractDetailsDto[]): DropdownOption[] => {
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    value: item.id,
    uniqueName: item.uniqueName,
  }));
};

export const getDropdownData = async (
  type: 'COMODITY' | 'REGION' | 'DEPARTMENT',
  index: number = 0,
  limit: number = 10,
  search: string = ''
): Promise<FetchResponse> => {
  try {
    const response = await instance.get<ContractDetailsDto[]>(
      '/api/v1/ariba/GetAllContractDetails',
      {
        params: {
          type,
          index,
          limit,
          ...(search ? { search } : {})
        },
      }
    );

    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return {
          data: [],
          error: {
            statusCode: 401,
            message: 'Session expired. Please login again.',
          },
        };
      }
      return {
        data: [],
        error: response.data,
      };
    }

    return {
      data: transformToOptions(response.data),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: handleError(error),
    };
  }
};


export const createContract = async (
  payload: CreateContractPayload
): Promise<CreateContractResult> => {
  try {
    const response = await instance.post<CreateContractResult>(
      '/api/v1/ariba/create/easy-contract', payload 
    );
 
    // Check if response is an error response
    if (response.data?.statusCode && response.data.statusCode >= 400) {
      return {
        statusCode: response.data.statusCode,
        message: response.data.message || 'Failed to create contract',
        description: response.data.description,
      };
    }
    if (response.data?.statusCode === 200 && response.data.isSuccess === false) {
      return {
        statusCode: response.data.statusCode,  
        message: response.data.message || 'Failed to create contract',
        description: response.data.description,
      };
    }
 
    return response.data;
  } catch (error: any) {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Session expired. Please login again.',
        description: 'Unauthorized',
      };
    }
 
    // Handle other HTTP errors
    if (error.response?.status) {
      return {
        statusCode: error.response.status,
        message: error.response.data?.message || 'Failed to create contract',
        description: error.response.data?.description || error.message,
      };
    }
 
    // Handle network or other errors
    return {
      statusCode: 500,
      message: error.message || 'An unexpected error occurred',
      description: 'Failed to create contract',
    };
  }
};

// Vendor API function
export const fetchVendors = async (
  searchTerm: string = '',
  index: number = 0,
  limit: number = 10
): Promise<VendorFetchResponse> => {
  try {
    const response = await instance.get<any[]>(
      '/api/v1/contract-suppliers',
      {
        params: {
          searchTerm,
          index,
          limit,
        },
      }
    );

    const vendors = (response.data || []).map((item) => ({
      id: item.smVendorId,
      name: item.name,
      smVendorId: item.smVendorId,
    }));

    return {
      data: vendors,
      error: null,
    };
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      (window as any).handleUnauthorized?.();
    }

    return {
      data: [],
      error: {
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || 'Failed to fetch vendors',
      },
    };
  }
};

export const fetchParentAgreements = async (
  searchTerm: string = '',
  index: number = 0,
  limit: number = 10
): Promise<any> => {
  try {
    const response = await instance.get<any[]>(
      '/api/v1/contractid',
      {
        params: {
          searchTerm,
          index,
          limit,
        },
      }
    );

    return {
      data: response.data || [],
      error: null,
    };
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      (window as any).handleUnauthorized?.();
    }

    return {
      data: [],
      error: {
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || 'Failed to fetch parent agreements',
      },
    };
  }
};