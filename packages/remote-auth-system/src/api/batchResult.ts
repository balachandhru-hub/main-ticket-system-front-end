import axios from "./axiosInstance";
import type { BatchResultDto } from "../Dto/batchresultDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

export const getBatchResults = async (
  batchId: number,
  index: number,
  limit: number,
  purchaseOrderId?: string 
): Promise<BatchResultDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<BatchResultDto[]>(
      `/api/v1/purchase-order/batch-id-result`,
      {
        params: {
          batchId,
          index,
          limit,
          purchaseOrderId: purchaseOrderId || undefined, 
        },
        withCredentials: true,
      }
    );

    return response.data; // array of purchase orders
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
      description:
        error.message ||
        "Something went wrong while fetching purchase order results.",
    };
  }
};
