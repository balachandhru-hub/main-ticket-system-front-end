import axios from './axiosInstance';
import type { DiscountCouponDto } from '../Dto/DiscountCouponDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

export const createDiscountCoupon = async (
  payload: DiscountCouponDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>('/api/v1/discount', payload, {
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
      description: error.message || 'Something went wrong while creating discount coupon.',
    };
  }
};
