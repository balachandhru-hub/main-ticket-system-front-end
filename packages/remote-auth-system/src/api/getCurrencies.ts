import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import axios from "./axiosInstance";

export const getCurrencies = async (): Promise<string[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<{ currencyName: string; sortNumber: number | null }[]>(
      `/api/v1/currencyname/all`,
      { withCredentials: true }
    );
    return response.data.map((item) => item.currencyName);
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
      description: error.message || "Something went wrong while fetching currencies.",
    };
  }
};