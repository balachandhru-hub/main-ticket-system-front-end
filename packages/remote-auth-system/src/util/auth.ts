import axios from '../api/axiosInstance';
import type { AuthInfo } from '../components/context/AuthContext';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';


export const fetchAuthInfo = async (): Promise<AuthInfo | ErrorResponseDto> => {
  try {
    const response = await axios.get<AuthInfo | ErrorResponseDto>("/api/v1/auth/token-claim", {
      withCredentials: true
    });

    if (
      typeof response.data === 'object' &&
      'roleId' in response.data &&
      'domainId' in response.data &&
      'userId' in response.data &&
      'personId' in response.data
    ) {
      return response.data as AuthInfo;
    }

    return {
      statusCode: 500,
      message: 'Invalid auth data',
      description: 'Token claim response missing expected properties',
    };

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

// export const getUserRoleFromToken = (): string | null => {
//   return authInfo?.roleId || null;
// };

// export const getDomainIdFromToken = (): string | null => {
//   return authInfo?.domainId || null;
// };

// export const getUserIdFromToken = (): string | null => {
//   return authInfo?.userId || null;
// };

// export const getPersonIdFromToken = (): string | null => {
//   return authInfo?.personId || null;
// };
