import axios from './axiosInstance';
import type { MessageDto, CreateMessageDto } from '../Dto/MessageDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { AssetUploadDto } from '../Dto/AssetUploadDto';

export const getTicketMessages = async (
  ticketId: string,
  index = 0,
  limit = 20
): Promise<MessageDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<MessageDto[]>(
      `/api/v1/ticket/message/${ticketId}`,
      {
        params: { index, limit },
        withCredentials: true,
      }
    );

    if (response.status === 204 || !response.data) return [];

    if (Array.isArray(response.data)) return response.data;

    return {
      statusCode: 500,
      message: 'Unexpected API response format',
      description: 'API returned invalid or empty data',
    };
  } catch (error: any) {
    const err = error.response?.data;
    return {
      statusCode: err?.statusCode || error.response?.status || 500,
      message: err?.message || 'Unknown error',
      description: err?.description || 'No details provided',
    };
  }
};

export const createTicketMessage = async (
  messageData: CreateMessageDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>(
      '/api/v1/ticket/message',
      messageData,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }
    );

    return response.data
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
    }
  }
};

export const uploadTicketImage = async (
  payload: AssetUploadDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>(
      '/api/v1/ticket/asset',
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
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
    }
  }
};
