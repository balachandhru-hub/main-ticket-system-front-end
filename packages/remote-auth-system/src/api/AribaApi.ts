import axios from './axiosInstance';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { PendingApprovalPRDto } from '../Dto/PendingApprovalDto';
import type { PendingApprovalDto } from '../Dto/PendingApprovalDto';
import type { ContractApprovalDto } from '../Dto/ContractDto';


// Define InvoiceApprovalDto and InvoiceApprovalCommentDto
export interface InvoiceApprovalCommentDto {
  text: string;
  visibleToSupplier: boolean;
}
export interface InvoiceEditDto {
  description: string;
  contractValue: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
}
export interface ApiResponse {
  statusCode: number;
  message: string;
  description: string;
  id?: string;
}

export interface InvoiceApprovalDto {
  state: string;
  comment: InvoiceApprovalCommentDto;
  approvedInvoiceAmount: number;
}

export interface StatusSummaryDto {
  pending: number;
  approved: number;
  deny: number;
  total: number;
  closed: number;
}

export interface PatchRequisitionResponse {
  statusCode: number;
  message: string;
  description: string;
  id?: string;
}

export interface PatchRequisitionRequest {
  state: string
  comment: {
    text: string;
    visibleToSupplier: boolean;
  };
  approvedInvoiceAmount: number;
}

export interface AttachmentResponse {
  statusCode: number;
  data?: string[]; // Array of Base64-encoded strings
  mimeType?: string; // MIME type of the attachments
  fileName?: string; // Base filename for downloads
  message?: string;
  description?: string;
}

export interface GetPendingApprovalsParams {
  index?: number;
  limit?: number;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}

const serializeParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
};

export const getPendingApprovals = async (
index: number = 0, limit: number = 8, searchTerm: string = "", fromDate: string = "", toDate: string = "", status: string = "", glAccount?: string[]): Promise<PendingApprovalDto[] | ErrorResponseDto> => {
  try {
    const cleanGLAccounts = glAccount?.length
      ? glAccount.map((id) => id.split('-')[0])
      : undefined;

    const response = await axios.get<PendingApprovalDto[]>(
      `/api/v1/ariba/pending-approvals-details`,
      {
        withCredentials: true,
        params: {
          index,
          limit,
          searchTerm: searchTerm || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          status: status || undefined,
          glAccount: cleanGLAccounts,
        },
        paramsSerializer: serializeParams,
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Something went wrong while fetching pending approvals.",
    };
  }
};

export const getContractApprovals = async (
index: number = 0, limit: number = 8, searchTerm: string = "", fromDate: string = "", toDate: string = "", status: string = ""): Promise<ContractApprovalDto[] | ErrorResponseDto> => {
  try {

    const response = await axios.get<ContractApprovalDto[]>(
      `/api/v1/ariba/pending-approvals-contracts`,
      {
        withCredentials: true,
        params: {
          index,
          limit,
          searchTerm: searchTerm || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          status: status || undefined,
        },
        paramsSerializer: serializeParams,
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Something went wrong while fetching pending approvals.",
    };
  }
};

export const downloadAribaApprovalsExcelPr = async (queryParams: string): Promise<Blob> => {
    const url = `/api/v1/ariba/pending-approvals-PR-details-excel?${queryParams}`;

    try {
        const response = await axios.get(url, {
            responseType: 'blob',
            withCredentials: true,
        });
        return response.data as Blob; 
        
    } catch (error: any) {

        if (error.response && error.response.data instanceof Blob) {
            
            const errorText = await error.response.data.text();
            
            try {
                const errData = JSON.parse(errorText);
                throw { 
                    statusCode: errData.status_code || error.response.status || 500,
                    message: errData.message || 'Download failed',
                    description: errData.description || 'No file generated.',
                } as ErrorResponseDto;
            } catch (e) {
                throw {
                    statusCode: error.response.status || 500,
                    message: 'Download Error',
                    description: 'Failed to process API error response.',
                } as ErrorResponseDto;
            }
        }
        
        throw {
            statusCode: 500,
            message: 'Network Error',
            description: error.message || 'Could not connect to the download server.',
        } as ErrorResponseDto;
    }
};

export const downloadAribaApprovalsExcel= async (queryParams: string): Promise<Blob> => {
    const url = `/api/v1/ariba/pending-approvals-details-excel?${queryParams}`;

    try {
        const response = await axios.get(url, {
            responseType: 'blob',
            withCredentials: true,
        });
        return response.data as Blob; 
        
    } catch (error: any) {

        if (error.response && error.response.data instanceof Blob) {
            
            const errorText = await error.response.data.text();
            
            try {
                const errData = JSON.parse(errorText);
                throw { 
                    statusCode: errData.status_code || error.response.status || 500,
                    message: errData.message || 'Download failed',
                    description: errData.description || 'No file generated.',
                } as ErrorResponseDto;
            } catch (e) {
                throw {
                    statusCode: error.response.status || 500,
                    message: 'Download Error',
                    description: 'Failed to process API error response.',
                } as ErrorResponseDto;
            }
        }
        
        throw {
            statusCode: 500,
            message: 'Network Error',
            description: error.message || 'Could not connect to the download server.',
        } as ErrorResponseDto;
    }
};

export const downloadContractApprovalsExcel= async (queryParams: string): Promise<Blob> => {
    const url = `/api/v1/ariba/pending-approvals-contract-details-excel?${queryParams}`;

    try {
        const response = await axios.get(url, {
            responseType: 'blob',
            withCredentials: true,
        });
        return response.data as Blob; 
        
    } catch (error: any) {

        if (error.response && error.response.data instanceof Blob) {
            
            const errorText = await error.response.data.text();
            
            try {
                const errData = JSON.parse(errorText);
                throw { 
                    statusCode: errData.status_code || error.response.status || 500,
                    message: errData.message || 'Download failed',
                    description: errData.description || 'No file generated.',
                } as ErrorResponseDto;
            } catch (e) {
                throw {
                    statusCode: error.response.status || 500,
                    message: 'Download Error',
                    description: 'Failed to process API error response.',
                } as ErrorResponseDto;
            }
        }
        
        throw {
            statusCode: 500,
            message: 'Network Error',
            description: error.message || 'Could not connect to the download server.',
        } as ErrorResponseDto;
    }
};

export const approveOrRejectInvoice = async (
  requisitionId: string,
  data: InvoiceApprovalDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.patch<SuccessResponseDto | ErrorResponseDto>(
      `/api/v1/ariba/requisition/patch?requisitionId=${requisitionId}`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to perform this action.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      if (errData.error && errData.error.code === 'notFound') {
        return {
          statusCode: 404,
          message: errData.error.message || 'Requested resource not found',
          description: 'The specified invoice task could not be found in Ariba.',
        };
      }
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || errData.error?.message || 'Unknown error',
        description: errData.description || errData.error?.message || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while processing invoice approval.',
    };
  }
};

export const patchRequisition = async (
  requisitionId: string,
  data: PatchRequisitionRequest
): Promise<PatchRequisitionResponse | ErrorResponseDto> => {
  try {
    const response = await axios.patch<PatchRequisitionResponse | ErrorResponseDto>(
      `/api/v1/ariba/requisition/patch?requisitionId=${requisitionId}`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to perform this action.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      if (errData.error && errData.error.code === 'notFound') {
        return {
          statusCode: 404,
          message: errData.error.message || 'Requested resource not found',
          description: 'The specified invoice task could not be found in Ariba.',
        };
      }
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || errData.error?.message || 'Unknown error',
        description: errData.description || errData.error?.message || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while patching requisition.',
    };
  }
};

export const getAttachment = async (attachmentId: string): Promise<AttachmentResponse> => {
  try {
    const response = await axios.get<string[]>(
      `/api/v1/ariba/final-attachment/${attachmentId}`,
      {
        withCredentials: true,
        responseType: 'text', // Expect JSON array of Base64 strings
      }
    );

    const contentType = response.headers['content-type'] || 'application/pdf';
    const contentDisposition = response.headers['content-disposition'] || '';
    let fileName = `attachment_${attachmentId}.pdf`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch) {
        fileName = fileNameMatch[1];
      }
    }

    return {
      statusCode: 200,
      data: Array.isArray(response.data) ? response.data : [response.data], // Ensure array
      mimeType: contentType,
      fileName: fileName,
    };
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
      description: error.message || 'Something went wrong while fetching attachment.',
    };
  }
};

export const getAttachmentCombine = async (
  documentId: string
): Promise<any> => {
  try {
    const response = await axios.get(
      `/api/v1/ariba/contract/has-attachment/${documentId}`,
      {
        responseType: "json",
        timeout: 0,
        headers: {
          Accept: "application/json",
        },
      }
    );

   
    return response.data; 
  } catch (error: any) {
 
    throw error;
  }
};
export const getAttachmentCombineInvoice = async (
  documentId: string
): Promise<any> => {
  try {
    const response = await axios.get(
      `/api/v1/ariba/final-attachment/${documentId}`,
      {
        responseType: "json",
        timeout: 0,
        headers: {
          Accept: "application/json",
        },
      }
    );

   
    return response.data; 
  } catch (error: any) {
 
    throw error;
  }
};
export const getAttachmentContractData = async (
  documentId: string
): Promise<any> => {
  try {
    const response = await axios.get(
      `/api/v1/ariba/contract/has-attachment/${documentId}`,
      {
        responseType: "json",
        timeout: 0,
        headers: {
          Accept: "application/json",
        },
      }
    );

   
    return response.data; 
  } catch (error: any) {
 
    throw error;
  }
};
export const syncLatestPendingApprovalsContract = async (): Promise<any | any> => {
  try {
    const response = await axios.get<any | any>(
      `/api/v1/ariba/pending-approvals-Contract-usersync`,
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
export const ApprovalDashBoard = async (type: string = 'INVOICE'): Promise<StatusSummaryDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<StatusSummaryDto>(
      `/api/v1/leadership/approval-dashboard-summary`,
      { params: {type}, withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching pending approvals.',
    };
  }
};

export const ContractDashBoard = async (type: string = 'CONTRACT'): Promise<StatusSummaryDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<StatusSummaryDto>(
      `/api/v1/leadership/approval-dashboard-summary`,
      { params: {type}, withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching pending approvals.',
    };
  }
};

export const getPendingApprovalsForPR = async (
index: number = 0, limit: number = 8, searchTerm: string = "", fromDate: string = "", toDate: string = "", status: string = "", glAccount?: String[]): Promise<PendingApprovalPRDto[] | ErrorResponseDto> => {
  try {
    const cleanGLAccounts = glAccount?.length
      ? glAccount.map((id) => id.split('-')[0])
      : undefined;

    const response = await axios.get<PendingApprovalPRDto[]>(
      `/api/v1/ariba/pending-approvals-details-PR`,
      {
        withCredentials: true,
        params: {
          index,
          limit,
          searchTerm: searchTerm || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          status: status || undefined,
          glAccount: cleanGLAccounts,
        },
        paramsSerializer: serializeParams,
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Something went wrong while fetching pending approvals.",
    };
  }
};

export const patchRequisitionForPR = async (
  requisitionId: string,
  data: PatchRequisitionRequest
): Promise<PatchRequisitionResponse | ErrorResponseDto> => {
  try {
    const response = await axios.patch<PatchRequisitionResponse | ErrorResponseDto>(
      `/api/v1/ariba/requisition-PR/patch?requisitionId=${requisitionId}`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to perform this action.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      if (errData.error && errData.error.code === 'notFound') {
        return {
          statusCode: 404,
          message: errData.error.message || 'Requested resource not found',
          description: 'The specified invoice task could not be found in Ariba.',
        };
      }
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || errData.error?.message || 'Unknown error',
        description: errData.description || errData.error?.message || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while patching requisition.',
    };
  }
};

// ...existing code...
// ...existing code...
export const triggerAribaNotificationForPR = async (
  entityType: string,
  requisitionId: string,
  approver: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  const params = {
    entityType,
    aribaId: requisitionId,
    approver,
  };

  try {
    // Try POST first (curl example uses POST with empty body and query params)
    const response = await axios.post<SuccessResponseDto>(
      `/api/v1/ariba/notify`,
      null, // empty body - matches your curl -d ''
      {
        params,
        withCredentials: true,
        headers: { Accept: 'text/plain' },
      }
    );
    return response.data;
  } catch (error: any) {
    // If server rejects POST with 405, try GET as a fallback
    if (error?.response?.status === 405) {
      try {
        const getResp = await axios.get<SuccessResponseDto>(`/api/v1/ariba/notify`, {
          params,
          withCredentials: true,
          headers: { Accept: 'text/plain' },
        });
        return getResp.data;
      } catch (getErr: any) {
        const errData = getErr?.response?.data;
        return {
          statusCode: errData?.statusCode || getErr?.response?.status || 500,
          message: errData?.message || getErr?.message || 'Notify GET failed after POST 405',
          description: errData?.description || getErr?.message,
        };
      }
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || errData.error?.message || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while triggering Ariba notification for PR.',
    };
  }
};
// ...existing code...
export const getAttachmentCombineForPR = async (
  invoiceId: string
): Promise<string[]> => {
  try {
    const response = await axios.get(
      `/api/v1/ariba/final-PR-attachment/${invoiceId}`,
      {
        responseType: "json",
        timeout: 0,
        headers: {
          Accept: "application/json",
        },
      }
    );
    return response.data as string[]; // array of Base64 PDFs
  } catch (error: any) {
    throw error;
  }
};
export const getPendingApprovalsContractEditPr = async (
  requisitionId: string,
  data: InvoiceEditDto
): Promise<InvoiceEditDto> => {
  try {
    const response = await axios.patch<InvoiceEditDto>(
      `/api/v1/ariba/details-PR/edit?requisitionId=${requisitionId}`,
      data,
      {
        withCredentials: true,
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    const statusCode = error?.response?.status;

    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    throw error;
  }
};

export const getPendingApprovalsContractEdit = async (
  invoiceId: string,
  data: InvoiceEditDto
): Promise<ApiResponse | ErrorResponseDto> => {
  try {
    const response = await axios.patch<ApiResponse | ErrorResponseDto>(
      `/api/v1/ariba/details/edit`,
      data,
      {
        withCredentials: true,
        params: { invoiceId },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );
 
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: "Unauthorized",
        description: "You are not authorized to perform this action.",
      };
    }
 
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status || error.response.status || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
 
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error?.message || "Something went wrong while updating invoice details.",
    };
  }
};

export const triggerAribaNotification = async (
  entityType: string,
  aribaId: string,
  approver: string
): Promise<ApiResponse | ErrorResponseDto> => {
  try {
    const response = await axios.post<ApiResponse>(
      `/api/v1/ariba/notify`,
      null,
      {
        params: { entityType, aribaId, approver },
        withCredentials: true,
        headers: {
          Accept: 'application/json',
        },
        timeout: 10000,
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
        id: (errData as any).id || '',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while triggering notification.',
      id: '',
    };
  }
};

export const updatePaymentStatus = async (
  invoiceId: string,
  paymentStatus: string
): Promise<ApiResponse | ErrorResponseDto> => {
  try {
    const response = await axios.put<ApiResponse>(
      `/api/v1/ariba/PaymentStatus`,
      { 
        paymentStatus: paymentStatus,
        invoiceId: invoiceId },
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
        id: (errData as any).id || '',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while updating payment status.',
      id: '',
    };
  }
};

