// src/api/referenceListApi.ts
import axios from './axiosInstance';
import type { ReferenceItem } from '../Dto/ReferenceListDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const fetchReferenceList = async (
  types: string[]
): Promise<ReferenceItem[] | ErrorResponseDto> => {
  try {
    const response = await axios.post<ReferenceItem[]>('/api/v1/metadata/reference-list', types, {
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
      description: error.message || 'Something went wrong while fetching reference list.',
    };
  }
};
