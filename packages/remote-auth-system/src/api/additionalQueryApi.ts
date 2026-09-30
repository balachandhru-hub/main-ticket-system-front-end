import aribaInstance from './axiosInstance'; // adjust path if your axios instance file is named differently
import type {
  AdditionalQueryDto,
  AdditionalQueryListDto,
  AdditionalQueryFilterDto,
  AdditionalQueryStatusDto,
} from '../Dto/AdditionalQueryDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const isErrorResponse = (data: any): data is ErrorResponseDto => {
  return data && typeof data === 'object' && typeof data.statusCode === 'number';
};

// Create additional query (POST)
// returns SuccessResponseDto or ErrorResponseDto
export const createAdditionalQuery = async (
  payload: AdditionalQueryDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const resp = await aribaInstance.post<SuccessResponseDto>('/api/v1/additional-query', payload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      withCredentials: true,
    });
    return resp.data ?? { statusCode: 500, message: 'Empty response', description: 'No response body' };
  } catch (err: any) {
    if (err?.response?.status === 401) (window as any).handleUnauthorized?.();
    if (err?.response?.data) return err.response.data;
    return { statusCode: 500, message: 'Unexpected Error', description: err?.message ?? 'Network error' } as ErrorResponseDto;
  }
};

// Get all queries with optional filters (GET)
export const getAllAdditionalQueries = async (
  filters: AdditionalQueryFilterDto
): Promise<AdditionalQueryListDto[] | ErrorResponseDto> => {
  try {
    const resp = await aribaInstance.get<AdditionalQueryListDto[]>('/api/v1/additional-query', {
      params: filters,
      headers: { Accept: 'application/json' },
      withCredentials: true,
    });
    return resp.data ?? [];
  } catch (err: any) {
    if (err?.response?.status === 401) (window as any).handleUnauthorized?.();
    if (err?.response?.data) return err.response.data;
    return { statusCode: 500, message: 'Unexpected Error', description: err?.message ?? 'Network error' } as ErrorResponseDto;
  }
};

// Update a query status (PUT)
// /api/v1/additional-query/{id}/status
export const updateAdditionalQueryStatus = async (
  id: string,
  payload: AdditionalQueryStatusDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const resp = await aribaInstance.put<SuccessResponseDto>(`/api/v1/additional-query/${id}/status`, payload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      withCredentials: true,
    });
    return resp.data ?? { statusCode: 500, message: 'Empty response', description: 'No response body' };
  } catch (err: any) {
    if (err?.response?.status === 401) (window as any).handleUnauthorized?.();
    if (err?.response?.data) return err.response.data;
    return { statusCode: 500, message: 'Unexpected Error', description: err?.message ?? 'Network error' } as ErrorResponseDto;
  }
};