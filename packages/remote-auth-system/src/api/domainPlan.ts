// src/api/createDomainPlan.ts
import instance from './axiosInstance';
import type { CreateDomainPlanDto } from '../Dto/CreateDomainPlanDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const createDomainPlan = async (
  payload: CreateDomainPlanDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    
    const response = await instance.post<SuccessResponseDto>(
      '/api/v1/domain/domain-plan',
      payload, 
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || 'Unknown error',
        description: err.detail || err.description || JSON.stringify(err.errors) || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Submission failed.',
    };
  }
};