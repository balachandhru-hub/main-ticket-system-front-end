import type { AssetDownloadDto } from '../Dto/AssetDownloadDto';
import type { AssetUploadDto } from '../Dto/AssetUploadDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import axios from './axiosInstance';

export const assetUpload = async (payload: AssetUploadDto): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await axios.post<SuccessResponseDto>(`api/v1/asset`, payload, {
            withCredentials: true
        });
        return response.data;
    }
    catch (error: any) {
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
        }
    }
}

export const assetGetById = async (payload: string): Promise<AssetDownloadDto | ErrorResponseDto> => {
    try {
        const response = await axios.get<AssetDownloadDto>(`api/v1/asset/${payload}`, {
            withCredentials: true
        });
        return response.data;
    }
    catch (error: any) {
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
        }
    }
}