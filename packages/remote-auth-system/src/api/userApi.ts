// src/api/userApi.ts
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { ProfileResponseDto } from '../Dto/ProfileResponseDto';
import type {GetUserDto} from '../Dto/GetUserDto';
import type { ConsultantTicketCountDto } from '../Dto/ConsultantTicketCountDto';

import axios from './axiosInstance';


export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const getUsersByDomain = async (
  domainId: string,
  index: number,
  limit: number,
  searchTerm: string = ''
): Promise<User[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<User[]>(`/api/v1/person/domain/${domainId}`, {
      params: {
        index,
        limit,
        searchTerm: searchTerm,
      },
      withCredentials: true
    });

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

export const getMyProfile = async (): Promise<ProfileResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<ProfileResponseDto>(`/api/v1/person/myprofile`, {
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
    };
  }

  
}
export const getUserById = async (userId: string): Promise<GetUserDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<GetUserDto>(`/api/v1/user/${userId}`, {
      withCredentials: true
    });
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
      description: error.message || 'Something went wrong while fetching the user profile.',
    };
  }
};

export const GetConsultantsWithTicketCount  = async (
  index: number,
  limit: number,
  searchTerm: string = ''
): Promise<ConsultantTicketCountDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<ConsultantTicketCountDto[]>(
      `/api/v1/person/consultants`,
      {
        params: { index, limit, searchTerm },
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
      description: error.message || 'Something went wrong while fetching consultants.',
    };
  }
};
