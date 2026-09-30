import axios from "./axiosInstance";
import type { EmailCCDto } from "../Dto/EmailCCDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

// ✅ Create EmailCC
export const createEmailCC = async (
  payload: EmailCCDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>(
      "/api/v1/email-cc",
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
      description:
        error.message || "Something went wrong while creating EmailCC.",
    };
  }
};

// ✅ Get all EmailCCs by entityType
export const getEmailCCs = async (
  entityType: string
): Promise<EmailCCDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<EmailCCDto[]>(
      "/api/v1/email-cc",
      {
        withCredentials: true,
        params: { entityType }, // query param
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
        error.message || "Something went wrong while fetching EmailCCs.",
    };
  }
};

// ✅ Delete EmailCC
export const deleteEmailCC = async (
  id: string,
  entityType: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.delete<SuccessResponseDto>(
      `/api/v1/email-cc/${id}`,
      {
        withCredentials: true,
        params: { entityType }, // query param
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
        error.message || "Something went wrong while deleting EmailCC.",
    };
  }
};
