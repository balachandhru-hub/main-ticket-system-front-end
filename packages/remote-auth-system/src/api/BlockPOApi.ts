import axios from './axiosInstance';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export interface BlockUnblockUploadResponse {
  totalRows: number;
  successfulUploads: number;
  failedUploads: number;
  errorResponses: Array<{
    statusCode: number;
    message: string;
    description: string;
  }>;
}

export const uploadBlockUnblockExcel = async (file: File): Promise<BlockUnblockUploadResponse | ErrorResponseDto> => {
  try {
    const formData = new FormData();
    formData.append('excelFile', file);

    const response = await axios.post('/api/v1/upload-excel-block-unblock', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });

    return response.data as BlockUnblockUploadResponse;
  } catch (error: any) {
    if (error.response && error.response.data) {
      let errData: any = {};
      try {
        if (typeof error.response.data === 'string') {
          errData = JSON.parse(error.response.data);
        } else {
          errData = error.response.data;
        }
      } catch {
        errData = {};
      }
      return {
        statusCode: errData.status_code || errData.statusCode || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while uploading block/unblock file.',
    };
  }
};

export const downloadBlockedPurchaseOrders = async (): Promise<Blob | ErrorResponseDto> => {
  try {
    const response = await axios.get('/api/v1/purchase-order/blocked/download', {
      responseType: 'blob',
      withCredentials: true,
    });
    return response.data as Blob; 
  } catch (error: any) {
    if (error.response && error.response.data) {
 
      let errData: any = {};
      try {
        const text = await error.response.data.text();
        errData = JSON.parse(text);
      } catch {
        errData = {};
      }
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while downloading blocked purchase orders.',
    };
  }
};