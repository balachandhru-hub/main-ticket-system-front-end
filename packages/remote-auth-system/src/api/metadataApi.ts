
import axios from './axiosInstance';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { CreateRefTermDto } from '../Dto/CreateRefTermDto';
import type { GetAllModulesDto } from "../Dto/GetAllModulesDto";
import type { UpdateModelStatusDto } from '../Dto/UpdateModelStatusDto';

export const createRefTerm = async (
  payload: CreateRefTermDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {  try {
    const response = await axios.post<SuccessResponseDto>(
      '/api/v1/metadata/create-refterm',
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
      description: error.message || 'Something went wrong while creating RefTerm.',
    };
  }
};

export const getAllModules = async (): Promise<GetAllModulesDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<GetAllModulesDto[] | ErrorResponseDto>(
      `/api/v1/metadata/module-list`,
      { withCredentials: true }
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
      description: error.message || "Something went wrong while fetching modules.",
    };
  }
};

export const updateModuleStatus = async (
  payload: UpdateModelStatusDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/metadata/update-model`,
      payload,
      { withCredentials: true }
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
      description: error.message || "Something went wrong while updating module status.",
    };
  
  }
};
