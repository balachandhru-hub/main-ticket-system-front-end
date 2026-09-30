import axios from './axiosInstance';
import type { ContractEditDto, ErrorResponseDto } from '../Dto/ContractDto';

interface ContractEditResponse {
  statusCode: number;
  message: string;
  description?: string;
}


export const getContractEditData = async (
  taskId: string,
  editData: ContractEditDto
): Promise<ContractEditResponse | ErrorResponseDto> => {
  try {
    const response = await axios.patch<ContractEditResponse>(
      `/api/v1/ariba/contract/edit`,
      {
        description: editData.description,
        contractValue: editData.contractValue ? Number(editData.contractValue) : 0,
      },
      {
        params: {
          TaskId: taskId,
        },
      }
    );

    return {
      statusCode: response.status,
      message: response.data?.message || 'Contract updated successfully',
      description: response.data?.description,
    };
  } catch (error: any) {

    return {
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to edit contract',
      description: 'An unexpected error occurred.',
    };
  }
};

export const getAllEasyContracts = async (
  payload: { index: number; limit: number; search: string }
): Promise<any[] | ErrorResponseDto> => {
   try {
         const body = {
             index: payload?.index ?? 0,
             limit: payload?.limit ?? 10,
             search: payload?.search ?? '',
             searchTerm: payload?.search ?? '',
             keyword: payload?.search ?? '',
         };
         const response = await axios.post<any>(`/api/v1/get-all-easy-contracts`, body);
 
         if (response.data) {
             if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                 (window as any).handleUnauthorized?.();
                 return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
             }
             return response.data;
         }
 
         return response.data;
     } catch (error: any) {
         const statusCode = error?.response?.status || error?.status;
         if (statusCode === 401) {
             (window as any).handleUnauthorized?.();
         }
 
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
                 error.message || "Something went wrong while fetching easy contracts.",
         };
     }
};
