import axios from './axiosInstance';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
 
export const downloadPurchaseOrderLogs = async (
  fromDate: string,
  toDate: string
): Promise<void | ErrorResponseDto> => {
  try {
    const response = await axios.get<Blob>('/api/v1/purchase-order/logs/download', {
      params: { fromDate, toDate },
      responseType: 'blob',
      withCredentials: true,
    });
 
    // ✅ Explicitly assert response.data as Blob
    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
 
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
 
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
  if (error.response && error.response.data) {
    return {
      statusCode: error.response.data.statusCode || 500,
      message: error.message || 'Failed to download file.',
      description:
        error.response.data.description ||
        'Error while downloading purchase order logs.',
    };
  }

 
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while downloading the file.',
    };
  }
};