import axios from "./axiosInstance";
import type { MaterialPRDto } from "../Dto/CreateMaterialPRDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
export interface PRSmartDefaults {
  taxCode: string;
  companyCode: string;
  shipToPlant: string;
  billTo: string;
  purchaseGroup: string;
  currency: string;
  deliverTo: string;
  purchaseOrg:string;
  costCenter:string;
}

export interface MaterialDetails {
  commodityCode: string;
  taxCode: string;
  unitOfMeasure: string;
}
export interface CommodityDetails {
  commodityCode: string;
  taxCode: string;
  unitOfMeasure: string;
}

//  Create Material PR
export const createMaterialPR = async (
  payload: MaterialPRDto[]
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>(
      "/api/v1/MaterialPR",
      payload,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while creating Material PR.",
    };
  }
};

export type GetPRSmartDefaultsResponse = PRSmartDefaults | ErrorResponseDto;

export const getPRSmartDefaults = async (aribaUserName: string): Promise<GetPRSmartDefaultsResponse> => {
  try {
    if (!aribaUserName || aribaUserName.trim() === '') {
      return {
        statusCode: 400,
        message: 'Bad Request',
        description: 'Ariba username is required',
      };
    }

    const response = await axios.get<PRSmartDefaults>(
      `/api/v1/GET_PR_SMART_DEFAULTS/${encodeURIComponent(aribaUserName)}`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || errData.statusCode || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching PR smart defaults.',
    };
  }
};

export type GetMaterialDetailsResponse = MaterialDetails | ErrorResponseDto;

export const getMaterialDetails = async (materialCode: string): Promise<GetMaterialDetailsResponse> => {
  try {
    if (!materialCode || materialCode.trim() === '') {
      return {
        statusCode: 400,
        message: 'Bad Request',
        description: 'Material code is required',
      };
    }

    const response = await axios.get<MaterialDetails>(
      `/api/v1/GetMaterialDetails/${encodeURIComponent(materialCode)}`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching material details.',
    };
  }
};
export type GetCommodityDetailsResponse = CommodityDetails | ErrorResponseDto;

export const getCommodityDetails = async (commodityCode: string): Promise<GetCommodityDetailsResponse> => {
  try {
    const response = await axios.get<CommodityDetails>(
      `/api/v1/GetCommodityDetails/${encodeURIComponent(commodityCode)}`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching material details.',
    };
  }
};