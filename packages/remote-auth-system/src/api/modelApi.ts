// src/api/modelApi.ts

import type { ModelApiResponse } from '../Dto/ModelDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import axios from './axiosInstance';

export const getModelsByUser = async (): Promise<ModelApiResponse[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<ModelApiResponse[]>('/api/v1/models/model-names-by-user', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // API returns array of objects with id and modelName
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
      message: 'Network error',
      description: error.message || 'Failed to fetch models',
    };
  }
};