import invoiceAxios from './axiosInvoice';
import type {
  CustomerGraphRequestDto,
  CustomerGraphResponseDto,
  PdfBase64ResponseDto,
  ErrorResponseDto,
  DistinctPoNumbersResponseDto,
  DistinctSuppliersResponseDto,
  DistinctCompanyCodesResponseDto,
  ExecutePdfResponseDto,
  TrustedSuppliersResponseDto,
  TrustedSupplierResponseDto,
  PoReceiptsSummaryResponseDto,
} from '../Dto/BuyerInvoiceDto';
import invoiceInstance from "../api/axiosInvoice";
import rpaBuyerInstance from "../api/rpaBuyerInstance";

// ==========================================
// CUSTOMER GRAPH API - UPDATED
// ==========================================

/**
 * Fetch invoice data with pagination and filtering
 * @param page - Page number (starts at 1)
 * @param page_size - Number of records per page
 * @param Field - Filter field (e.g., source: 'email', 'sharepoint', 'manual')
 * @param supplier - Filter by supplier name
 * @param po_number - Filter by PO number
 * @param company_code - Filter by company code
 * @param status - Filter by status
 * @returns Customer graph response with invoice records
 */
export const getCustomerGraph = async (
  page: number = 1,
  page_size: number = 10,
  Field?: string,
  supplier?: string,
  po_number?: string,
  company_code?: string,
  status?: string,
  invoice_start_date?: string,
  invoice_end_date?: string   
): Promise<CustomerGraphResponseDto> => {
  try {
    const payload: CustomerGraphRequestDto = {
      page,
      page_size,
      ...(Field && { Field }),
      ...(supplier && supplier !== "All Suppliers" && { supplier }),
      ...(po_number && po_number !== "All PO Numbers" && { po_number }),
      ...(company_code && company_code !== "All Company Codes" && { company_code }),
      ...(status && status !== "All" && { status }),
      ...(invoice_start_date && { invoice_start_date }),
      ...(invoice_end_date && { invoice_end_date }),
    };

    const response = await invoiceAxios.post<CustomerGraphResponseDto>(
      '/customer_graph',
      payload,
      { headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to fetch invoices",
        description: error.response.data?.detail || "Error occurred while fetching invoices",
      };
    }
    throw { message: "Unexpected error", description: "An unexpected error occurred while fetching invoices" };
  }
};

// ==========================================
// PDF BASE64 API
// ==========================================

export const getPdfBase64 = async (
  pdfId: number | string
): Promise<PdfBase64ResponseDto | ErrorResponseDto> => {
  try {
    const response = await invoiceAxios.get<PdfBase64ResponseDto>(
      `/base64-for-view-icon/${pdfId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error",
        description: err.detail || err.description || "No details provided",
      } as ErrorResponseDto;
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Failed to fetch PDF.",
    } as ErrorResponseDto;
  }
};

// ==========================================
// DISTINCT VALUES APIs (FOR FILTERS)
// ==========================================

/**
 * Fetch all distinct PO numbers
 * @param source - Optional source filter ('email', 'sharepoint', 'manual')
 */
export const getDistinctPoNumbers = async (
  source?: string
): Promise<DistinctPoNumbersResponseDto> => {
  try {
    const params = new URLSearchParams();
    if (source && source !== "All Sources") {
      const sourceMap: Record<string, string> = {
        "Manual": "manual",
        "Email": "email",
        "SharePoint": "sharepoint",
      };
      const mappedSource = sourceMap[source];
      if (mappedSource) params.append("source", mappedSource);
    }

    const queryString = params.toString();
    const url = `/distinct-po-numbers/${queryString ? "?" + queryString : ""}`;

    const response = await invoiceAxios.get<DistinctPoNumbersResponseDto>(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to fetch PO numbers",
        description: error.response.data?.detail || "Error occurred while fetching PO numbers",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while fetching PO numbers",
    };
  }
};

/**
 * Fetch all distinct suppliers
 * @param source - Optional source filter ('email', 'sharepoint', 'manual')
 */
export const getDistinctSuppliers = async (
  source?: string
): Promise<DistinctSuppliersResponseDto> => {
  try {
    const params = new URLSearchParams();
    if (source && source !== "All Sources") {
      const sourceMap: Record<string, string> = {
        "Manual": "manual",
        "Email": "email",
        "SharePoint": "sharepoint",
      };
      const mappedSource = sourceMap[source];
      if (mappedSource) params.append("source", mappedSource);
    }

    const queryString = params.toString();
    const url = `/distinct-suppliers/${queryString ? "?" + queryString : ""}`;

    const response = await invoiceAxios.get<DistinctSuppliersResponseDto>(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to fetch suppliers",
        description: error.response.data?.detail || "Error occurred while fetching suppliers",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while fetching suppliers",
    };
  }
};

/**
 * Fetch all distinct company codes
 * @param source - Optional source filter ('email', 'sharepoint', 'manual')
 */
export const getDistinctCompanyCodes = async (
  source?: string
): Promise<DistinctCompanyCodesResponseDto> => {
  try {
    const params = new URLSearchParams();
    if (source && source !== "All Sources") {
      const sourceMap: Record<string, string> = {
        "Manual": "manual",
        "Email": "email",
        "SharePoint": "sharepoint",
      };
      const mappedSource = sourceMap[source];
      if (mappedSource) params.append("source", mappedSource);
    }

    const queryString = params.toString();
    const url = `/distinct-company-codes/${queryString ? "?" + queryString : ""}`;

    const response = await invoiceAxios.get<DistinctCompanyCodesResponseDto>(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to fetch company codes",
        description: error.response.data?.detail || "Error occurred while fetching company codes",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while fetching company codes",
    };
  }
};

// ==========================================
// TRUSTED SUPPLIERS APIs
// ==========================================

export const getTrustedSuppliers = async (): Promise<TrustedSuppliersResponseDto> => {
  try {
    const response = await invoiceAxios.get<TrustedSuppliersResponseDto>(
      '/trusted-suppliers-table/',
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || "Failed to fetch trusted suppliers",
        description: errorData?.detail || "Error occurred while fetching suppliers",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while fetching suppliers",
    };
  }
};

export const addTrustedSupplier = async (
  data: { SupplierName: string; SupplierTRN: string }
): Promise<TrustedSupplierResponseDto> => {
  try {
    const response = await invoiceInstance.post<TrustedSupplierResponseDto>(
      "/add-trusted-supplier/",
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response;
    }
    throw error;
  }
};

export const deleteTrustedSupplier = async (
  data: { SupplierName: string; SupplierTRN: string }
): Promise<TrustedSupplierResponseDto> => {
  try {
    const response = await invoiceInstance.post(
      "/delete-trusted-supplier/",
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data as TrustedSupplierResponseDto;
  } catch (error: any) {
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || "Failed to delete supplier",
        description: errorData?.detail || "Supplier not found or error occurred",
      } as TrustedSupplierResponseDto;
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred",
    } as TrustedSupplierResponseDto;
  }
};

// ==========================================
// INVOICE PROCESSING APIs
// ==========================================

export const executeInvoicePdf = async (
  pdfId: string | number | (string | number)[]
): Promise<ExecutePdfResponseDto> => {
  try {
    const pdfIdString = Array.isArray(pdfId) 
      ? pdfId.join(',') 
      : String(pdfId);

    const firstChar = pdfIdString.trim().charAt(0).toUpperCase();
    let source = "manual";
    if (firstChar === 'S') source = "sharepoint";
    else if (firstChar === 'E') source = "email";
    else if (firstChar === 'M') source = "manual";

    const response = await rpaBuyerInstance.post<ExecutePdfResponseDto>(
      '/invoice-process/execute-pdf-sync',
      {
        pdf_id: pdfIdString,
        source: source
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || "Failed to execute invoice process",
        description: errorData?.detail || "Error occurred while processing PDF",
      };
    }

    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while executing invoice process",
    };
  }
};

export const updateInvoiceComment = async (
  pdfId: string | number,
  comment: string
): Promise<any> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    status: "success",
    message: "Comment updated successfully",
    data: {
      pdf_id: String(pdfId),
      comments: comment,
      updated_at: new Date().toISOString(),
    },
  };
};

export const addAribaComment = async (
  pdf_id: string,
  ariba_comment: string
): Promise<any> => {
  try {
    const payload = {
      pdf_id: String(pdf_id),
      Ariba_Comments: ariba_comment,
    };
 
    const response = await invoiceAxios.post(
      '/Ariba-comments/',
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to add Ariba comment",
        description: error.response.data?.detail || "Error occurred while saving comment",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while saving comment",
    };
  }
};

export const updateInvoicePONumber = async (
  pdf_id: string | number,
  poNumber: string
): Promise<any> => {
  try {
    const payload = {
      PONumber: poNumber,
    };

    const response = await invoiceAxios.put(
      `/update-invoice/${pdf_id}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to update PO number",
        description: error.response.data?.detail || "Error occurred while updating PO number",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while updating PO number",
    };
  }
};

// ==========================================
// EXPORT INVOICES EXCEL API
// ==========================================

export interface ExportInvoicesFilters {
  Field?: string;
  supplier?: string;
  po_number?: string;
  company_code?: string;
  status?: string;
  invoice_start_date?: string;
  invoice_end_date?: string;
}

export const exportInvoicesExcel = async (
  filters: ExportInvoicesFilters = {}
): Promise<{ blob: Blob; filename?: string }> => {
  try {
    const payload = {
      ...(filters.Field && { Field: filters.Field }),
      ...(filters.supplier && { supplier: filters.supplier }),
      ...(filters.po_number && { po_number: filters.po_number }),
      ...(filters.company_code && { company_code: filters.company_code }),
      ...(filters.status && { status: filters.status }),
      ...(filters.invoice_start_date && { invoice_start_date: filters.invoice_start_date }),
      ...(filters.invoice_end_date && { invoice_end_date: filters.invoice_end_date }),
    };

    const response = await invoiceAxios.post(
      '/export_invoices_excel',
      payload,
      {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        responseType: "blob",
      }
    );

    let filename: string | undefined;
    const disposition = response.headers?.["content-disposition"] || response.headers?.["Content-Disposition"];
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^;"]+)"?/i);
      if (match?.[1]) filename = decodeURIComponent(match[1].trim());
    }

    return { blob: response.data as Blob, filename };
  } catch (error: any) {
    if (error.response) {
      throw {
        message: error.response.data?.message || "Failed to export invoices",
        description: error.response.data?.detail || "Error occurred while exporting invoices",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while exporting invoices",
    };
  }
};

export const pushInvoiceToAribaQueue = async (
  pdfId: string | number
): Promise<any> => {
  try {
    const response = await rpaBuyerInstance.post(
      "/insertPdfId",
      {
        pdf_id: String(pdfId),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message: "Failed to add invoice to queue",
        description: "Error occurred while adding invoice to queue",
      };
    }

    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while adding invoice to queue",
    };
  }
};

export interface ReuploadSingleFileResponseDto {
  status?: string;
  message?: string;
  [key: string]: any;
}

export const reuploadSingleFile = async (
  filename: string,
  folder: string,
  brand: string
): Promise<ReuploadSingleFileResponseDto> => {
  try {
    const response = await invoiceInstance.post<ReuploadSingleFileResponseDto>(
      '/test-single-file/',
      null,
      {
        params: { filename, folder, brand },
        headers: {
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message:
          error.response.data?.detail ||
          error.response.data?.message ||
          "Failed to re-upload file",
        description:
          error.response.data?.detail || "Error occurred while re-uploading the file",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while re-uploading the file",
    };
  }
};

export const getPoReceiptsSummary = async (
  po_number: string
): Promise<PoReceiptsSummaryResponseDto> => {
  try {
    const response = await invoiceInstance.get<PoReceiptsSummaryResponseDto>(
      `/po-receipts-summary/${po_number}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw {
        message:
          error.response.data?.detail ||
          error.response.data?.message ||
          "Failed to fetch RC details",
        description:
          error.response.data?.detail || "Error occurred while fetching RC details",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while fetching RC details",
    };
  }
};

export const getAllReasons = async ():Promise<string[]> => {
  try{
    const response = await invoiceInstance.get<{ reasons: string[] }>(
      `/all_reasons`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    return response.data.reasons;
  }
  catch(error: any){
    if (error.response) {
      throw {
        message:
          error.response.data?.detail ||
          error.response.data?.message ||
          "Failed to fetch reasons",
        description:
          error.response.data?.detail || "Error occurred while fetching reasons",
      };
    }
    throw {
      message: "Unexpected error",
      description: "An unexpected error occurred while fetching reasons",
    };
  }
};
