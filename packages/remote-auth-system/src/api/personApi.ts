import axios from './axiosInstance';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { UpdatePersonDto} from '../Dto/UpdatePersonDto';
import type { CustomerMasterEditDto } from '../Dto/CustomerMasterEditDto';


export const updatePerson = async (
  payload: UpdatePersonDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/updateperson`,
      payload,
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
      description: error.message || 'Something went wrong while updating person.',
    };
  }
};
export const updatePersonByID = async (
  userId: string,
  payload: CustomerMasterEditDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/updateperson/${userId}`,
      payload,
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
      description: error.message || 'Something went wrong while updating person.',
    };
  }
};