// Add this import at the top with other imports
import axios from './axiosInstance';
import type { LatestPendingApprovalsSyncResponseDto } from '../Dto/LatestPendingApprovalsDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

// Corrected API function
export const syncLatestPendingApprovals = async (): Promise<LatestPendingApprovalsSyncResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<LatestPendingApprovalsSyncResponseDto | ErrorResponseDto>(
      `/api/v1/leadership/latest-pending-aprovals-usersync`,
      { withCredentials: true }
    );

    if (response.status === 204) {
      return {
        statusCode: 204,
        message: 'You are up to date',
        description: 'No new pending approvals to sync',
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