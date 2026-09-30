// src/api/botModelApi.ts

import axios from './axiosInstance';
import type { BotModelResponseDto } from '../Dto/BotModelResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const getAllBotModels = async (): Promise<BotModelResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<
      { id: string; modelName: string }[]
    >(
      `/api/v1/modelname/all`,
      { withCredentials: true }
    );

    const botModels = response.data.map((model) => ({
      id: model.id,
      name: model.modelName
    }));

    return { botModels };

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
      description: error.message || 'Something went wrong while fetching bot models.',
    };
  }
};
