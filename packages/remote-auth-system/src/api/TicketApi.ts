
import axios from './axiosInstance';
import type { TicketDashboardSummaryDto } from '../Dto/TicketDashboardSummaryDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { EditTicketDto } from '../Dto/EditTicketDto';
import type { TicketDetailDto } from '../Dto/TicketDetailDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { TicketCreateDto } from '../Dto/TicketCreateDto';


interface PRApiRequest {
  taskName: string;
  hrs: number;
  amount: number;
}


export interface PRTask {
  taskName: string;
  hrs: number;
}

export const getTicketDashboardSummary = async (): Promise<TicketDashboardSummaryDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<TicketDashboardSummaryDto | ErrorResponseDto>(
      `/api/v1/ticket/dashboard-summary`,
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
      description: error.message || 'Something went wrong while fetching dashboard summary.',
    };
  }
};

export const createTicket = async (
  data: TicketCreateDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto | ErrorResponseDto>(
      `/api/v2/ticket`,
      data,
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
      description: error.message || 'Something went wrong while creating ticket.',
    };
  }
};

export const getTicketById = async (
  id: string
): Promise<TicketDetailDto | ErrorResponseDto> => {
  try {
    const response = await axios.get<TicketDetailDto | ErrorResponseDto>(
      `/api/v1/ticket/${id}`,
      {
        withCredentials: true,
      }
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
      description: error.message || 'Something went wrong while fetching ticket.',
    };
  }
};

export const updateTicket = async (
  payload: EditTicketDto
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.put<SuccessResponseDto>(
      `/api/v1/ticket`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || 'Unknown error',
        description: err.detail || err.description || 'No details provided',
      };
    }
    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Submission failed.',
    };
  }
};

export const createPRTask = async (
  prData: PRApiRequest,
  ticketId: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await axios.post<SuccessResponseDto>(
      `/api/v1/ticket/ticket-PR?ticketId=${ticketId}`,
      [prData],
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status_code || err.status || error.response.status || 500,
        message: err.message || err.title || 'API Error',
        description: err.description || err.detail || 'Server error',
      };
    }
    
    return {
      statusCode: 500,
      message: 'Network Error',
      description: error.message || 'Something went wrong while creating PR task.',
    };
  }
};

export interface ExportTicketsParams {
  Index?: number;
  Limit?: number;
  SearchTerm?: string;
  Status?: string;
  Category?: string;
  Priority?: string;
  FromDate?: string | null;
  ToDate?: string | null;
}

export const downloadTicketsExcel = async (params: ExportTicketsParams = {}): Promise<void> => {
  try {
    const response = await axios.get('/api/v1/ticket/details-excel', {
      params,
      responseType: 'blob',
      headers: {
        Accept: 'application/octet-stream, application/json',
      },
      withCredentials: true,
    });

    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'] || '';

    // If server returned JSON error as blob, parse it and throw
    if (contentType.includes('application/json')) {
      const text = await (response.data as Blob).text();
      let json;
      try { json = JSON.parse(text); } catch { json = { message: text }; }
      const msg = json?.message || json?.description || JSON.stringify(json);
      throw new Error(msg || 'Server returned an error');
    }

    // Extract filename from content-disposition header (handles filename* and filename)
    let filename = `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
    if (disposition) {
      const fileNameStarMatch = disposition.match(/filename\*\s*=\s*([^;]+)/i);
      const fileNameMatch = disposition.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
      if (fileNameStarMatch) {
        // filename*=UTF-8''... or similar; remove encoding prefix if present
        let val = fileNameStarMatch[1].trim();
        // decode RFC5987 style: UTF-8''encoded
        const parts = val.split("''");
        if (parts.length === 2) {
          try { filename = decodeURIComponent(parts[1]); } catch { filename = parts[1]; }
        } else {
          filename = val.replace(/(^['"]|['"]$)/g, '');
        }
      } else if (fileNameMatch) {
        filename = (fileNameMatch[1] || fileNameMatch[2] || filename).trim().replace(/(^['"]|['"]$)/g, '');
      }
    }

    // Create blob and trigger download
    const data = response.data as unknown;
    const blob =
    data instanceof Blob ? data : new Blob([data as BlobPart], { type: contentType || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return;
  } catch (error: any) {
    // Normalize axios error with response data (if JSON available)
    if (error?.response && error.response.data) {
      try {
        // If response data is blob, try to parse JSON
        if (error.response.data instanceof Blob) {
          const text = await (error.response.data as Blob).text();
          const json = JSON.parse(text);
          throw new Error(json?.message || json?.description || JSON.stringify(json));
        }
      } catch (e) {
        // fall through
      }
      const status = error.response.status;
      const text = error.response.statusText || (error.response.data?.message) || 'Download failed';
      throw new Error(`${status}: ${text}`);
    }
    throw new Error(error?.message || 'Failed to download Excel');
  }
};