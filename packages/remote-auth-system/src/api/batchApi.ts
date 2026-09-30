import axios from "./axiosInstance";
import type { BatchIdResponseDto } from "../Dto/BatchIdDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

export const getBatchIds = async (
  index: number,
  limit: number
): Promise<BatchIdResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<BatchIdResponseDto>(
      `/api/v1/purchase-order/batch-ids?index=${index}&limit=${limit}`,
      { withCredentials: true }
    );
    return response.data; // returns number[]
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
      description: error.message || "Something went wrong while fetching batch IDs.",
    };
  }
};
