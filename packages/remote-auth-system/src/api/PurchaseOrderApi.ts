import axios from "./axiosInstance";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { PurchaseOrderDetailsRequestDto } from "../Dto/PurchaseOrderDetailsRequestDto";
import type { PurchaseOrderDetailDto } from "../Dto/PurchaseOrderDetailDto";
import type { createPurchaseOrderDto } from "../Dto/CreatePurchaseOrderDto";
import PoExcel from "./poUploadExcelApi";
import type { PoUploadExcelResponseDto } from "../Dto/UploadExcelPoDto";
import type { CreateNewPurchaseOrderDto } from "../Dto/CreateNewPurchaseOrderDto";

export const getPurchaseOrderIds = async (
  index: number,
  limit: number,
  searchTerm?: string,
  mode?: number
): Promise<string[] | ErrorResponseDto> => {
  try {
    const response = await axios.get<string[]>(`/api/v1/purchase-order/ids`, {
      params: {
        index,
        limit,
        ...(searchTerm && { searchTerm }),
        mode,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message ||
        "Something went wrong while fetching purchase order IDs.",
    };
  }
};

export const getPurchaseOrderDetails = async (
  payload: PurchaseOrderDetailsRequestDto
): Promise<PurchaseOrderDetailDto[] | ErrorResponseDto> => {
  try {
    const response = await axios.post<PurchaseOrderDetailDto[]>(
      `/api/v1/purchase-order`,
      payload,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message ||
        "Something went wrong while fetching purchase order details.",
    };
  }
};

export const deletePurchaseOrder = async (
  id: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.delete<SuccessResponseDto>(
      `/api/v1/purchase-order/${id}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while deleting purchase order.",
    };
  }
};

export const getRecieptByOrderId = async (
  purchaseOrderIds: string[]
): Promise<string[] | ErrorResponseDto> => {
  try {
    const response = await axios.post<string[]>(
      "/api/v1/reciept",
      purchaseOrderIds,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while deleting purchase order.",
    };
  }
};

export const createPurchaseOrderAriba = async (
  payload: createPurchaseOrderDto[],
  isReversible: boolean,
  date?: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const query = new URLSearchParams();
    query.append("isReversible", isReversible.toString());
    if (date) {
      query.append("date", date);
    }
    const response = await axios.post<SuccessResponseDto>(
      `/api/v1/purchase-order-ariba?${query.toString()}`,
      payload,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while deleting purchase order.",
    };
  }
};

export const instanceOfPoUploadExcel = async (
  file: File
): Promise<PoUploadExcelResponseDto | ErrorResponseDto> => {
  try {
    const formData = new FormData();
    formData.append("excelFile", file); // backend expects "excelFile"

    const response = await PoExcel.post<
      PoUploadExcelResponseDto | ErrorResponseDto
    >("/api/v1/upload-excel", formData, {
      withCredentials: true,
      validateStatus: () => true,
    });

    return response.data as PoUploadExcelResponseDto | ErrorResponseDto;
  } catch (err: any) {

    return {
      statusCode: err?.statusCode || 500,
      message: err?.message || "Unknown error",
      description: err?.description || "No details provided",
    };
  }
};

export const instanceOfPoMasterUploadExcel = async (
  file: File
): Promise<PoUploadExcelResponseDto | ErrorResponseDto> => {
  try {
    const formData = new FormData();
    formData.append("excelFile", file);

    const response = await PoExcel.post<
      PoUploadExcelResponseDto | ErrorResponseDto
    >("/api/v1/upload-excel-master", formData, {
      withCredentials: true,
      validateStatus: () => true,
    });

    return response.data as PoUploadExcelResponseDto | ErrorResponseDto;
  } catch (err: any) {

    return {
      statusCode: err?.statusCode || 500,
      message: err?.message || "Unknown error",
      description: err?.description || "No details provided",
    };
  }
};

export const createNewPurchaseOrderApi = async (
  payload: CreateNewPurchaseOrderDto[]
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {

    const response = await axios.post<
      SuccessResponseDto | ErrorResponseDto
    >("/api/v1/purchase-order/create",
      payload,
      {
        withCredentials: true,
        validateStatus: () => true,
      });

    return response.data;
  } catch (err: any) {

    return {
      statusCode: err?.statusCode || 500,
      message: err?.message || "Unknown error",
      description: err?.description || "No details provided",
    };
  }
};