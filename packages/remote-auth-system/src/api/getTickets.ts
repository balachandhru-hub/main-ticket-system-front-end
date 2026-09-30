// src/api/getTickets.ts
import axios from './axiosInstance';
import type { TicketDto, TicketFilterParams } from '../Dto/TicketDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const getTickets = async (
  filters?: TicketFilterParams
): Promise<TicketDto[] | ErrorResponseDto> => {
  try {
    const params: Record<string, any> = {};

    if (filters) {
      if (filters.Index !== undefined) params.Index = Number(filters.Index);
      if (filters.Limit !== undefined) params.Limit = Number(filters.Limit);
      if (filters.SearchTerm) params.SearchTerm = filters.SearchTerm;
      if (filters.Status) params.Status = filters.Status;
      if (filters.Category) params.Category = filters.Category;
      if (filters.Priority) params.Priority = filters.Priority;
      if (filters.FromDate) params.FromDate = filters.FromDate;
      if (filters.ToDate) params.ToDate = filters.ToDate;
    }

    const response = await axios.get('/api/v1/ticket', {
      params,
       withCredentials: true,
    });

    if (response.status === 204 || response.data === '') {
      return [];
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return {
      statusCode: 500,
      message: 'Unexpected API response format',
      description: 'API returned invalid or empty data',
    };
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
      description: error.message || 'Something went wrong while fetching tickets.',
    };
  }
};
