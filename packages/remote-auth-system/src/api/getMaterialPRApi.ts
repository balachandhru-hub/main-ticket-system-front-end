import axios from "./axiosInstance";
import type { GetMaterialPRDto } from "../Dto/GetMaterialPRDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

interface GetMaterialPRResponse {
  statusCode: number;
  data: GetMaterialPRDto[];
  message: string;
}

export const getAllMaterialPR = async (
  index: number = 0,
  limit: number = 50
): Promise<GetMaterialPRResponse | ErrorResponseDto> => {
  try {
    const response = await axios.get<GetMaterialPRDto[]>(
      `/api/v1/GetAllMaterialPR`,
      {
        params: {
          index,
          limit,
        },
        withCredentials: true,
      }
    );

    return {
      statusCode: 200,
      data: response.data,
      message: "Material PRs fetched successfully",
    };
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Failed to fetch Material PRs",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while fetching Material PRs.",
    };
  }
};

export const getMaterialPRByNumber = async (
  prNumber: string
): Promise<{ statusCode: number; data: GetMaterialPRDto | null; message: string } | ErrorResponseDto> => {
  try {
    const response = await axios.get<GetMaterialPRDto[]>(
      `/api/v1/GetAllMaterialPR`,
      {
        params: {
          index: 0,
          limit: 20,
        },
        withCredentials: true,
      }
    );

    const prData = response.data.find((pr) => pr.prNumber === prNumber);

    if (!prData) {
      return {
        statusCode: 404,
        message: `Material PR with number ${prNumber} not found`,
        data: null,
      };
    }

    return {
      statusCode: 200,
      data: prData,
      message: "Material PR fetched successfully",
    };
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Failed to fetch Material PR",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while fetching Material PR.",
    };
  }
};