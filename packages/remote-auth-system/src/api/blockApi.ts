// src/api/blockApi.ts
import axios from "./axiosInstance";
import type {
  GetBlockUnblockRequest,
  GetBlockUnblockResponse,
  UpdateBlockUnblockQuery,
  UpdateBlockUnblockBody,
  UpdateBlockUnblockResponse,
} from "../Dto/BlockDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

export const getBlockUnblockPOs = async (
  params: GetBlockUnblockRequest
): Promise<GetBlockUnblockResponse | ErrorResponseDto> => {
  try {
    const response = await axios.get<GetBlockUnblockResponse>(
      `/api/v1/purchase-order/block-unblock`,
      {
        params: {
          index: params.index,
          limit: params.limit,
          isBlocked: params.isBlocked,
          searchTerm: params.searchTerm,
        },
        withCredentials: true,
      }
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
      description:
        error.message || "Something went wrong while fetching purchase orders.",
    };
  }
};

export const updateBlockUnblockPOs = async (
  query: UpdateBlockUnblockQuery,
  body: UpdateBlockUnblockBody
): Promise<UpdateBlockUnblockResponse | ErrorResponseDto> => {
  try {
    const response = await axios.put<UpdateBlockUnblockResponse>(
      `/api/v1/purchase-order/block-unblock`,
      body,
      {
        params: {
          isBlocked: query.isBlocked,
        },
        withCredentials: true,
      }
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
      description:
        error.message || "Something went wrong while updating purchase orders.",
    };
  }
};
