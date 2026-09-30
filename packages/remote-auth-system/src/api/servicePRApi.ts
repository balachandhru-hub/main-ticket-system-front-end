import axios from "./axiosInstance";
import type { ServicePRDto } from "../Dto/CreateServicePRDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";


export const createServicePR = async (
    payload: ServicePRDto[]
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await axios.post<SuccessResponseDto>(
            "/api/v1/ServicePR",
            payload,
            { withCredentials: true }
        );
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while creating Service PR.",
        };
    }
};


export const updateServicePR = async (prNumber: string, payload: any) => {
    try {
        // Using PUT for update
        const response = await axios.put(
            `/api/v1/ServicePR/${prNumber}`,
            payload,
            { withCredentials: true }
        );
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description: error.message || "Something went wrong updating Service PR.",
        };
    }
};