
import type { UploadExtensionPayload } from '../Dto/UploadExtensionPayload';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ExtensionResponseDto } from '../Dto/ExtensionResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import axios from './axiosInstance';
import { toast } from 'react-toastify';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Updated function to accept domainId
export const uploadExtension = async (
  file: File,
  domainId: string // Add domainId parameter
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    // Convert file to base64
    const fileBytes = await fileToBase64(file);

    const payload: UploadExtensionPayload = {
      fileBytes,
      fileName: file.name,
      contentType: file.type || 'application/zip',
    };

    // Add domainId as query parameter
    const response = await axios.post<SuccessResponseDto>(
      `/api/v1/ariba/extension?domainId=${domainId}`, // Add domainId here
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );

    return {
      statusCode: response.status || 200,
      message: response.data.message || 'Extension uploaded successfully',
      description: response.data.description,
    };
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || errData.statusCode || 500,
        message: errData.message || 'Upload failed',
        description: errData.description || 'Failed to upload extension',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while uploading the extension.',
    };
  }
};

export const getLatestExtension = async (): Promise<ExtensionResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<ExtensionResponseDto>(
      '/api/v1/ariba/extension/latest',
      {
        withCredentials: true,
      }
    );
    if (response.status === 204) {
      return {
        statusCode: 204,
        message: 'No extension available',
        description: 'No extension has been uploaded yet',
      };
    }

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 204) {
      return {
        statusCode: 204,
        message: 'No extension available',
        description: 'No extension has been uploaded yet',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || errData.statusCode || 500,
        message: errData.message || 'Failed to fetch extension',
        description: errData.description || 'No extension available',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching the extension.',
    };
  }
};

export const fetchExtension = async (
  domainId: string
): Promise<ExtensionResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<ExtensionResponseDto>(
      `/api/v1/ariba/fetchextension?domainId=${domainId}`,
      {
        withCredentials: true,
      }
    );

    toast.success("Extension loaded successfully");
    return response.data;

  } catch (error: any) {

    const status = error.response?.status;
    const errData = error.response?.data;

    if (status === 403) {
      toast.error("Access denied");
      return {
        statusCode: 403,
        message: "Access Denied",
        description: "Not authorized to access this extension",
      };
    }

    if (status === 404) {
      toast.error("No extension available for this domain");
      return {
        statusCode: 404,
        message: "No extension available",
        description: "No extension has been uploaded for this domain",
      };
    }

    if (errData) {
      toast.error(errData.message || "Failed to fetch extension");
      return {
        statusCode: errData.statusCode || 500,
        message: errData.message || "Failed to fetch extension",
        description:
          errData.description ||
          "Failed to fetch extension for this domain",
      };
    }

    toast.error("Unexpected error occurred");

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message ||
        "Something went wrong while fetching the extension.",
    };
  }
};


export interface LinkResponse {
  id: string;
  linkUrl: string;
  type: string;
}



export const getLinkByType = async (type: 'Video' | 'Document'): Promise<{ id?: string; linkUrl?: string }> => {
  try {
    const response = await axios.get<LinkResponse>(
      `/api/v1/link?type=${type}`,
      {
        withCredentials: true,
      }
    );

    return {
      id: response.data.id,
      linkUrl: response.data.linkUrl || '',
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {};
    }

    toast.error(`Failed to load ${type} link. Please try again.`);
    return {};
  }
};

