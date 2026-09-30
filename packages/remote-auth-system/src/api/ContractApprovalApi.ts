import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { InvoiceApprovalDto } from "../Dto/InvoiceApprovalDto";
import axios from "./axiosInstance";


export const approveOrRejectContract = async (
  data: InvoiceApprovalDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.patch<SuccessResponseDto | ErrorResponseDto>(
      `/api/v1/ariba/contract/action`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    
    if (error.status == 401) {
      const errData = error;
      if(errData.status == 401){
           (window as any).handleUnauthorized?.();
      }
    }

    return {
      statusCode: error?.response?.data?.status_code || 500,
      message:"",
      description:  error?.response?.data?.message?.split('"description" : "')[1]?.split('"')[0] || 'Unexpected Error',
    };
  }
};