// src/api/PRSyncApi.ts

import axios from './axiosInstance';
import type { PRSyncResponseDto } from '../Dto/PRSyncDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

/**
 * Sync latest pending approvals for PR
 * @returns Promise with sync response or error
 */
export const syncLatestPendingApprovalsPR = async (): Promise<PRSyncResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<PRSyncResponseDto | ErrorResponseDto>(
      `/api/v1/ariba/pending-approvals-PR-usersync`,
      { withCredentials: true }
    );

    // Handle 204 No Content
    if (response.status === 204) {
      return {
        statusCode: 204,
        message: 'You are up to date',
        description: 'No new pending approvals to sync',
      };
    }
    
    // Handle 200 Success with data
    if (response.status === 200) {
      return {
        statusCode: 200,
        message: 'Sync completed successfully',
        data: response.data as any,
      };
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while syncing pending approvals.',
    };
  }
};