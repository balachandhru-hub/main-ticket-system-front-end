import axios from './axiosInstance';
import type { ContractCustomTypeDto } from '../Dto/ContractCustomTypeDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const fetchContractCustomTypes = async (
  type: string,
  index = 0,
  limit = 10,
  search = ''
): Promise<ContractCustomTypeDto[] | ErrorResponseDto> => {
  try {
    const params: Record<string, any> = { type, index, limit };
    if (search) params.searchTerm = search;

    const response = await axios.get<ContractCustomTypeDto[]>('/api/v1/contract-custom-types', {
      params,
      withCredentials: true,
    });

    const data = response.data || [];
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to access this resource. Please log in.',
      };
    }

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
      description: error.message || 'Something went wrong while fetching contract custom types.',
    };
  }
};
