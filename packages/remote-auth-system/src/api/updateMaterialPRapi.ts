import axios from "./axiosInstance";
import type { UpdateMaterialPRDto } from "../Dto/updateMaterialPR";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";

export const updateMaterialPR = async (
    prNumber: string,
    payload: UpdateMaterialPRDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const url = `/api/v1/MaterialPR/${prNumber}`;
        
        const response = await axios.put<SuccessResponseDto>(
            url,
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
                error.message || `Something went wrong while updating Material PR ${prNumber}.`,
        };
    }
};