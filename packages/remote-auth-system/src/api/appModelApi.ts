import axios from './axiosInstance';
import type { AppModelResponseDto, AppModel, RawAppModelDto } from '../Dto/AppModelResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const getAllAppModels = async (): Promise<AppModelResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<RawAppModelDto[] | AppModelResponseDto>(`/api/v1/appname/all`);

    const rawData = response.data;
    const items: RawAppModelDto[] = Array.isArray(rawData)
      ? rawData
      : (rawData as AppModelResponseDto)?.appModels && Array.isArray((rawData as AppModelResponseDto).appModels)
      ? (rawData as AppModelResponseDto).appModels
      : [];

    const appModels: AppModel[] = items.map((app) => ({
      id: app.id,
      name: app.name || app.appName || '',
      description: app.description || '',
      link: app.link || '',
      key: app.key || '',
    }));

    return { appModels };
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || errData.statusCode || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching app models.',
    };
  }
};

export const getAppNamesByUser = async (): Promise<AppModel[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<AppModel[]>(`/api/v1/apps/app-names-by-user`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || errData.statusCode || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Network error',
      description: error.message || 'Failed to fetch app names for user',
    };
  }
};
