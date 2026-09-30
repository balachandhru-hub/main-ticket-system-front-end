// src/api/getRoleCategories.ts
import axios from './axiosInstance'; 
import type { RoleCategory } from '../Dto/RoleCategory';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const getRoleCategories = async (
  roleCategory: string
): Promise<RoleCategory[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<RoleCategory[]>(
      `/api/v1/auth/role/all/${roleCategory}`,
      {
        withCredentials: true
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
      description: error.message || `Something went wrong while fetching role categories.`,
    };
  }
};
