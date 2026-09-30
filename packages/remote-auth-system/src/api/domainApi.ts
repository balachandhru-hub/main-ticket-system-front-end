// domainApi.ts
import axios from './axiosInstance';
import type { CompanyPreviewDto } from '../Dto/CompanyPreviewDto';
import type { CustomerListResponseDto } from '../Dto/CustomerListResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { CompanyRegistrationPayload } from '../Dto/CompanyRegistrationPayload';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';

export const getAllDomains = async (
  index: number,
  limit: number,
  searchTerm?: string
): Promise<CompanyPreviewDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<CompanyPreviewDto[]>(
      `/api/v1/domain`, {
      params: {
        index,
        limit,
        searchTerm: searchTerm,
      },
      withCredentials: true
    }
    );
    return response.data;
  }
  catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching domains.',
    };
  }
}

export const getDomainDetail = async (
  id: string,
): Promise<CustomerListResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<CustomerListResponseDto>(
      `/api/v1/domain/domain-details/${id}`, {
      withCredentials: true
    }
    );
    return response.data;
  }
  catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching domain details.',
    };
  }
};

export const createDomain = async (payload: CompanyRegistrationPayload): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>('/api/v1/domain', payload, {
      withCredentials: true
    });

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while logging in.',
    };
  };
}
export const getDomainById = async (
  id: string
): Promise<CompanyRegistrationPayload | ErrorResponseDto> => {
  try {
    const response = await axios.get<CompanyRegistrationPayload>(
      `/api/v1/domain/${id}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching domain.',
    };
  }
};
export const updateDomain = async (
  id: string,
  payload: CompanyRegistrationPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/domain/${id}`,
      payload,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while updating domain.',
    };
  }
};

export interface UpdateDomainStatusPayload {
  domainId: string;
  activeStatus: string; // e.g., 'active', 'inactive', etc.
}

export const updateDomainStatus = async (
  payload: UpdateDomainStatusPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/domain/domain-status`,
      payload,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
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
        error.message || "Something went wrong while updating domain status.",
    };
  }
};

export const GetAllExpiredDomain = async (
  index: number,
  limit: number,
  searchTerm?: string
): Promise<CompanyPreviewDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<CompanyPreviewDto[]>(
      `/api/v1/domain/expired-domains`,
      {
        params: {
          index,
          limit,
          searchTerm: searchTerm,
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while fetching domains.",
    };
  }
};


export const getDomainLogo = async (
): Promise<{ fileBytes: string; contentType: string } | ErrorResponseDto> => {
  try {
    const response = await axios.get<{ fileBytes: string; contentType: string }>(
      `/api/v1/domain/domain-logo`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching the logo.',
    };
  }
};