import axios from "axios";

export const GrnSesDashboardInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_DASHBOARD_GRN_SES_URLS,
  headers: {
    "Content-Type": "application/json",
  },
});

export const PRDashboardInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


export interface DownloadBaseExcelRequestDto {
  index: number;
  limit: number;
}

// Type aliases for backward compatibility (SES/GRN)
export type DownloadSesExcelRequestDto = DownloadBaseExcelRequestDto;
export type DownloadGrnExcelRequestDto = DownloadBaseExcelRequestDto;

export interface DownloadSesExcelWithFiltersRequestDto extends DownloadBaseExcelRequestDto {
  supplier_filter?: string[];
  requester_filter?: string[];
  department_filter?: string[];
  status_strings?: string[];
  company_code_filter?: string[];
  gl_accounts_filter?: string[];
  unique_names?: string[];
  service_entry_ids?: string[];
  cost_centers_filter?: string[];
  erp_receipt_numbers?: string[];
  from_date?: string;
  to_date?: string;
}

export interface DownloadGrnExcelWithFiltersRequestDto extends DownloadBaseExcelRequestDto {
  supplier_filter?: string[];
  requester_filter?: string[];
  company_code_filter?: string[];
  department_filter?: string[];
  cost_centers_filter?: string[];
  gl_accounts_filter?: string[];
  from_date?: string;
  to_date?: string;
  receiptIds?: string[];
  poNumbers?: string[];
  status?: string[];
}

export interface DownloadInvoiceExcelWithFiltersRequestDto extends DownloadBaseExcelRequestDto {
  supplier_filter?: string[];
  requester_filter?: string[];
  company_code_filter?: string[];
  department_filter?: string[];
  cost_centers_filter?: string[];
  gl_accounts_filter?: string[];
  from_date?: string;
  to_date?: string;
  invoice_ids?: string[];
  invoice_order_ids?: string[];
  ir_ids?: string[];
  payment_ids?: string[];
  erp_payment_ids?: string[];
  erp_payable_numbers?: string[];
  CommodityCodes?: string[];
  status?: string[];
}

export interface DownloadPRExcelWithFiltersRequestDto extends DownloadBaseExcelRequestDto {
  supplier_filter?: string[];
  requester_filter?: string[];
  company_code_filter?: string[];
  department_filter?: string[];
  cost_centers_filter?: string[];
  gl_accounts_filter?: string[];
  Commodity_Code?: string[];
  Deliver_To?: string[];
  from_date?: string;
  to_date?: string;
  status?: string[];
}

export interface DownloadExcelResponseDto {
  fileContent: Blob;
  fileName: string;
  totalRecords: number;
  pageNumber: number;
  contentType: string;
}

// Type aliases for backward compatibility (SES)
export type DownloadSesExcelResponseDto = DownloadExcelResponseDto;

export interface DownloadErrorDto {
  statusCode: number;
  message: string;
  details?: string;
}

export type SesDownloadErrorDto = DownloadErrorDto;

export const downloadSesExcelWithFilters = async (
  request: DownloadSesExcelWithFiltersRequestDto
): Promise<DownloadExcelResponseDto> => {
  try {
    const safeIndex = Math.max(1, request.index);
    const safeLimit = Math.min(Math.max(1, request.limit), 30000);

    const payload: Record<string, any> = {
      index: safeIndex,
      limit: safeLimit,
    };

    // Conditionally add filters to the payload
    if (request.status_strings?.length)
      payload.status_strings = request.status_strings;
    if (request.unique_names?.length)
      payload.unique_names = request.unique_names;
    if (request.service_entry_ids?.length)
      payload.service_entry_ids = request.service_entry_ids;
    if (request.requester_filter?.length)
      payload.requester_filter = request.requester_filter;
    if (request.supplier_filter?.length)
      payload.supplier_filter = request.supplier_filter;
    if (request.department_filter?.length)
      payload.department_filter = request.department_filter;
    if (request.gl_accounts_filter?.length)
      payload.gl_accounts_filter = request.gl_accounts_filter;
    if (request.cost_centers_filter?.length)
      payload.cost_centers_filter = request.cost_centers_filter;
    if (request.company_code_filter?.length)
      payload.company_code_filter = request.company_code_filter;
    if (request.erp_receipt_numbers?.length)
      payload.erp_receipt_numbers = request.erp_receipt_numbers;
    if (request.from_date) payload.from_date = request.from_date;
    if (request.to_date) payload.to_date = request.to_date;

    const response = await GrnSesDashboardInstance.post(
      "/download/ses/excel",
      payload,
      {
        responseType: "blob", // Important for file downloads
      }
    );

    // Extract file name from 'content-disposition' header
    const contentDisposition = response.headers["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename=([^;]+)/);
    const fileName = fileNameMatch
      ? fileNameMatch[1].replace(/"/g, "").trim()
      : `ses_export_page_${safeIndex}.xlsx`;

    const fileContent = response.data as Blob;

    // Attempt to extract total records from the file name (if in format like '123_records.xlsx')
    const recordsMatch = fileName.match(/(\d+)_records/);
    const totalRecords = recordsMatch ? parseInt(recordsMatch[1], 10) : 0;

    return {
      fileContent,
      fileName,
      totalRecords,
      pageNumber: safeIndex,
      contentType:
        response.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = "/";
    }

    throw error;
  }
};

export const downloadGrnExcelWithFilters = async (
  request: DownloadGrnExcelWithFiltersRequestDto
): Promise<DownloadExcelResponseDto> => {
  try {
    const safeIndex = Math.max(1, request.index);
    const safeLimit = Math.min(Math.max(1, request.limit), 30000);

    const payload: Record<string, any> = {
      index: safeIndex,
      limit: safeLimit,
    };

    if (request.supplier_filter?.length)
      payload.supplier_filter = request.supplier_filter;
    if (request.requester_filter?.length)
      payload.requester_filter = request.requester_filter;
    if (request.company_code_filter?.length)
      payload.company_code_filter = request.company_code_filter;
    if (request.department_filter?.length)
      payload.department_filter = request.department_filter;
    if (request.cost_centers_filter?.length)
      payload.cost_centers_filter = request.cost_centers_filter;
    if (request.gl_accounts_filter?.length)
      payload.gl_accounts_filter = request.gl_accounts_filter;
    if (request.from_date) payload.from_date = request.from_date;
    if (request.to_date) payload.to_date = request.to_date;
    if (request.receiptIds?.length)
      payload.receiptIds = request.receiptIds;
    if (request.poNumbers?.length)
      payload.poNumbers = request.poNumbers;
    if (request.status?.length)
      payload.status = request.status;

    const response = await GrnSesDashboardInstance.post(
      "/download/grn/excel",
      payload,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename=([^;]+)/);
    const fileName = fileNameMatch
      ? fileNameMatch[1].replace(/"/g, "").trim()
      : `grn_export_page_${safeIndex}.xlsx`;

    const fileContent = response.data as Blob;

    const recordsMatch = fileName.match(/(\d+)_records/);
    const totalRecords = recordsMatch ? parseInt(recordsMatch[1], 10) : 0;

    return {
      fileContent,
      fileName,
      totalRecords,
      pageNumber: safeIndex,
      contentType:
        response.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      window.location.href = "/";
    }

    throw error;
  }
};

export const downloadInvoiceExcelWithFilters = async (
  request: DownloadInvoiceExcelWithFiltersRequestDto
): Promise<DownloadExcelResponseDto> => {
  try {
    const safeIndex = Math.max(1, request.index);
    const safeLimit = Math.min(Math.max(1, request.limit), 30000);

    const payload: Record<string, any> = {
      index: safeIndex,
      limit: safeLimit,
    };

    // Conditionally add filters to the payload based on the Invoice API schema
    if (request.supplier_filter?.length)
      payload.supplier_filter = request.supplier_filter;
    if (request.requester_filter?.length)
      payload.requester_filter = request.requester_filter;
    if (request.company_code_filter?.length)
      payload.company_code_filter = request.company_code_filter;
    if (request.department_filter?.length)
      payload.department_filter = request.department_filter;
    if (request.cost_centers_filter?.length)
      payload.cost_centers_filter = request.cost_centers_filter;
    if (request.gl_accounts_filter?.length)
      payload.gl_accounts_filter = request.gl_accounts_filter;
    if (request.from_date) payload.from_date = request.from_date;
    if (request.to_date) payload.to_date = request.to_date;
    if (request.invoice_ids?.length)
      payload.invoice_ids = request.invoice_ids;
    if (request.invoice_order_ids?.length)
      payload.invoice_order_ids = request.invoice_order_ids;
    if (request.ir_ids?.length)
      payload.ir_ids = request.ir_ids;
    if (request.payment_ids?.length)
      payload.payment_ids = request.payment_ids;
    if (request.erp_payment_ids?.length)
      payload.erp_payment_ids = request.erp_payment_ids;
    if (request.erp_payable_numbers?.length)
      payload.erp_payable_numbers = request.erp_payable_numbers;
    if (request.CommodityCodes?.length)
      payload.CommodityCodes = request.CommodityCodes;
    if (request.status?.length)
      payload.status = request.status;

    // API endpoint: POST /download/invoice/excel
    const response = await GrnSesDashboardInstance.post(
      "/download/invoice/excel",
      payload,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename=([^;]+)/);
    const fileName = fileNameMatch
      ? fileNameMatch[1].replace(/"/g, "").trim()
      : `invoice_export_page_${safeIndex}.xlsx`;

    const fileContent = response.data as Blob;

    const recordsMatch = fileName.match(/(\d+)_records/);
    const totalRecords = recordsMatch ? parseInt(recordsMatch[1], 10) : 0;

    return {
      fileContent,
      fileName,
      totalRecords,
      pageNumber: safeIndex,
      contentType:
        response.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      window.location.href = "/";
    }

    throw error;
  }
};

export const downloadPRExcelWithFilters = async (
  request: DownloadPRExcelWithFiltersRequestDto
): Promise<DownloadExcelResponseDto> => {
  try {
    const safeIndex = Math.max(1, request.index);
    const safeLimit = Math.min(Math.max(1, request.limit), 30000);

    const payload: Record<string, any> = {
      index: safeIndex,
      limit: safeLimit,
    };

    // Conditionally add filters to the payload based on the Invoice API schema
    if (request.supplier_filter?.length)
      payload.supplier_filter = request.supplier_filter;
    if (request.requester_filter?.length)
      payload.requester_filter = request.requester_filter;
    if (request.company_code_filter?.length)
      payload.company_code_filter = request.company_code_filter;
    if (request.department_filter?.length)
      payload.department_filter = request.department_filter;
    if (request.cost_centers_filter?.length)
      payload.cost_centers_filter = request.cost_centers_filter;
    if (request.gl_accounts_filter?.length)
      payload.gl_accounts_filter = request.gl_accounts_filter;
    if (request.from_date) payload.from_date = request.from_date;
    if (request.to_date) payload.to_date = request.to_date;
    if (request.status?.length)
      payload.status = request.status;

    // API endpoint: POST /download/pr/excel
    const response = await PRDashboardInstance.post(
      "/download/pr_excel",
      payload,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename=([^;]+)/);
    const fileName = fileNameMatch
      ? fileNameMatch[1].replace(/"/g, "").trim()
      : `pr_export_page_${safeIndex}.xlsx`;

    const fileContent = response.data as Blob;

    const recordsMatch = fileName.match(/(\d+)_records/);
    const totalRecords = recordsMatch ? parseInt(recordsMatch[1], 10) : 0;

    return {
      fileContent,
      fileName,
      totalRecords,
      pageNumber: safeIndex,
      contentType:
        response.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        
    };
    
  } catch (error: any) {
    if (error?.response?.status === 401) {
      window.location.href = "/";
    }

    throw error;
  }
};

export const triggerExcelDownload = (
  response: DownloadExcelResponseDto
): void => {
  const url = URL.createObjectURL(response.fileContent);
  const link = document.createElement("a");
  link.href = url;
  link.download = response.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Legacy alias for backward compatibility
export const triggerSesExcelDownload = triggerExcelDownload ;