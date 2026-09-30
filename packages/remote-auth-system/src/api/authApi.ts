import type { CreateUserPayload } from '../Dto/CreateUserPayload';
import type { LoginPayload } from '../Dto/LoginPayload';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { LoginResponseDto } from '../Dto/LoginResponseDto';
import type { RefreshTokenResponseDto } from '../Dto/RefreshTokenResponseDto'
import axios from './axiosInstance';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';

export const registerUser = async (payload: CreateUserPayload): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>('/api/v1/person', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      if (typeof errData === 'object' && !('message' in errData) && !('status_code' in errData)) {
        const errorMessages = Object.entries(errData)
          .map(([, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              return messages.join(', ');
            }
            return messages;
          })
          .join(' | ');
        
        return {
          statusCode: error.response.status || 400,
          message: errorMessages || 'Validation error',
          description: 'Please check the validation errors above.',
        };
      }
      return {
        statusCode: errData.status_code || error.response.status || 500,
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
export const loginUser = async (payload: LoginPayload): Promise<LoginResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<LoginResponseDto>('/api/v1/auth/login', payload, {
      withCredentials: true
    });
    response.data.statusCode = 200;
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
  };
};

export const refreshAuthToken = async (): Promise<RefreshTokenResponseDto> => {
  try {
    const response = await axios.post<RefreshTokenResponseDto>('/api/v1/auth/refresh-token', null, {
      withCredentials: true
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const fetchLoggedInUser = async () => {
  try {
    const response = await axios.get('/api/v1/person');
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const resetPassword = async (
  userId: string,
  password: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>(
      `/api/v1/auth/reset-password`,
      { userId, password },
      { withCredentials: true }
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
      description: error.message || 'Something went wrong while resetting the password.',
    };
  }
};


export const logoutUser = async (): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>('/api/v1/auth/logout', null, {
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

export const impersonateUser = async (targetUserId: string): Promise<LoginResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<LoginResponseDto>(`/api/v1/auth/impersonate/${targetUserId}`, null, {
      withCredentials: true
    });
    response.data.statusCode = 200;
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
      description: error.message || 'Something went wrong while impersonating.',
    };
  }
};
