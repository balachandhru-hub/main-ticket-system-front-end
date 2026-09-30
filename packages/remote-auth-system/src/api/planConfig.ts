// src/api/getPlanConfig.ts
import axios from './axiosInstance';
import type { PlanConfigDto, PlanType, EngagementType } from '../Dto/PlanConfigDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { GetPlanConfigDto } from '../Dto/GetPlanConfigDto';
import type { UpdatePlanConfigDto } from '../Dto/UpdatePlanConfigDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
export const getPlanConfig = async (
  planType: PlanType,
  engagementType: EngagementType
): Promise<PlanConfigDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<PlanConfigDto | ErrorResponseDto>(
      `/api/v1/config/plan`,
      {
        params: {
          plan: planType,
          engagementType: engagementType
        },
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
      description: error.message || 'Something went wrong while logging in.',
    };
  }
};
export const getAllPlanConfigs = async (): Promise<GetPlanConfigDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<GetPlanConfigDto[]>(
      `/api/v1/config/plan-details/all`,
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
      description: error.message || "Something went wrong while fetching plans.",
    };
  }
};

export const updatePlanConfig = async (
  dto: UpdatePlanConfigDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/config/plan`,
      dto,
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
      description: error.message || "Something went wrong while updating plan config.",
    };
  }
};
