// src/api/microsoftAuthApi.ts
import type { LoginResponseDto } from '../Dto/LoginResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import axios from './axiosInstance';
import { getMsalInstance, initializeMsal, isInteractionInProgress } from './msalConfig';

export const microsoftLogin = async (email: string): Promise<LoginResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<LoginResponseDto>('/api/v1/auth/microsoft-login', {
      headers: { email },
      withCredentials: true
    });

    return {
      ...response.data,
      statusCode: 200
    } as LoginResponseDto;

  } catch (error: any) {
    if (error.response?.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      } as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong during Microsoft login.',
    } as ErrorResponseDto;
  }
};


export const clearMicrosoftCache = async () => {
  try {
    const msalInstance = getMsalInstance();

    // logoutRedirect is an interactive API, so MSAL must be initialized and any
    // pending redirect must be drained first, and it must not race an active
    // login interaction.
    await initializeMsal();
    if (isInteractionInProgress()) return;

    const activeAccount = msalInstance.getActiveAccount();

    if (activeAccount) {
      await msalInstance.logoutRedirect({
        account: activeAccount,
        postLogoutRedirectUri: window.location.origin + "/",
      });
    } else {
      await msalInstance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + "/",
      });
    }

  } catch (error) {
 
    sessionStorage.clear();
    localStorage.clear();
  }
};
