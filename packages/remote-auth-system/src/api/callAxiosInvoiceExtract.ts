import { toast } from "react-toastify";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import {
  transformAribaResponse,
  transformPurchaseOrder,
  isApiResponse,
  type AribaResponseDTO,
  type InvoiceDto,
  type PurchaseOrderDTO,
  type ApiResponse
} from "../Dto/InvoiceExtractionDto";
import {
  isInvoiceDetailResponse,
  type InvoiceDetailApiResponse,
} from "../Dto/InvoiceDetailDto";
import { instanceInvoiceExtraction } from "./axiosInvoiceExtract";


export interface SaveSuccessDto {
  InvoiceNumber: string;
  PONumber: string;
  Status: string;
}

interface LineItemDraft {
  lineItemIndex: string;
  itemCode: string;
  itemDescription: string;
  qty: string;
  unit: string;
}

interface DataToPushDraft {
  poNumber: string;
  invoiceNumber: string;
  total: string;
  lineItems: LineItemDraft[];
}
interface lineItemData{
  Line_item: string;
  Item_description: string;
  QTY: string;
  Unit: string;
}

export interface SaveDraftPayload {
  pdfId: string;
  poNumber: string;
  Invoice_Number: string;
  total: string;
  items: lineItemData[];
}

export interface GetDraftResponse {
  pdfId: string;
  originalPoNumber: string;
  timestamp: string;
  dataToPush: DataToPushDraft;
}

export interface ReprocessedInvoiceItem {
  LineItemNumber: number;
  ItemCode: string;
  ItemDescription: string;
  QTY: string;
  Unit: string | null;
  UnitPrice: string;
  Amount: string;
  Discount: string | null;
  VAT: string;
  VATAmount: string;
  AmountInclVAT: string | null;
}

export interface ReprocessedInvoiceData {
  InvoiceNumber: string;
  SupplierName: string;
  CustomerName: string;
  PONumber: string;
  InvoiceDate: string;
  SupplierTRN: string;
  CustomerTRN: string;
  Email: string;
  Total: string;
  Items: ReprocessedInvoiceItem[];
  user_id: string;
  pdf_id: number;
  source_file: string;
  invoice_id: number;
  is_trusted: boolean;
}

export interface ReprocessedResult {
  filename: string;
  user_id: string;
  input_id: number;
  pdf_id: number;
  invoices: ReprocessedInvoiceData[];
  status: string;
}

export interface ReprocessedData {
  message: string;
  results: ReprocessedResult[];
}


export interface ProcessedInvoiceItem {
  LineItemNumber: number;
  ItemCode: string;
  ItemDescription: string;
  QTY: string;
  Unit: string | null;
  UnitPrice: string;
  Amount: string;
  Discount: string | null;
  VAT: string;
  VATAmount: string;
  AmountInclVAT: string | null;
}

// Interface for individual invoice data
export interface ProcessedInvoiceData {
  InvoiceNumber: string;
  SupplierName: string;
  CustomerName: string;
  PONumber: string;
  InvoiceDate: string;
  SupplierTRN: string | null;
  CustomerTRN: string | null;
  Email: string;
  Total: string;
  Items: ProcessedInvoiceItem[];
  user_id: string;
  pdf_id: number;
  source_file: string;
  invoice_id: number;
  is_trusted: boolean;
}

// Interface for individual result
export interface ProcessedResult {
  filename: string;
  user_id: string;
  input_id: number;
  pdf_id: number;
  invoices: ProcessedInvoiceData[];
  status: string;
}

// Interface for the complete API response
export interface ProcessLocalPdfsResponse {
  message: string;
  results: ProcessedResult[];
}

export const saveDraftReviewData = async (
  payload: SaveDraftPayload
): Promise<any | ErrorResponseDto> => {
  try {
    const response = await instanceInvoiceExtraction.post<any>(
      "/save-draft",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error during draft save",
        description:
          err.detail ||
          err.description ||
          (err.errors ? JSON.stringify(err.errors) : "") ||
          "No details provided",
      };
    }
    
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Draft submission failed.",
    };
  }
};

export const getInvoiceData = async (
  payload: FormData
): Promise<any> => {
  try {
    const response = await instanceInvoiceExtraction.post<any>(
      "extract-invoice",
      payload,
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Submission failed.",
    };
  }
};
export const getInvoiceDataFromPdfId = async (
  pdf_id: number | string
): Promise<ApiResponse | ErrorResponseDto> => {
  try {
    const response = await instanceInvoiceExtraction.get<ApiResponse>(
      `invoice/${pdf_id}`,
    );

    if (isApiResponse(response.data)) {
      // Add is_Submit: false to all invoices in results
      const modifiedData: ApiResponse = {
        ...response.data,
        results: response.data.results.map(result => ({
          ...result,
          invoices: result.invoices.map(inv => ({
            ...inv,
            is_Submit: false, // add the extra flag
          })),
        })),
      };
      return modifiedData;
    } else {
      const legacyData = response.data as any;
      return {
        results: [{
          filename: "unknown",
          user_id: "unknown",
          input_id: 0,
          pdf_id: 0,
          invoices: (Array.isArray(legacyData) ? legacyData : [legacyData]).map((inv: any) => ({
            ...inv,
            is_Submit: false, // add the extra flag
          })),
          status: "success"
        }]
      };
    }
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Submission failed.",
    };
  }
};


export const aribaData = async (
  poNumber: string
): Promise<PurchaseOrderDTO | ErrorResponseDto> => {
  try {
    const response = await instanceInvoiceExtraction.get<PurchaseOrderDTO>(
      `/fetch-ariba-data/${poNumber}`
    );

    const [rawInvoice] = Array.isArray(response?.data)
      ? response.data
      : [response.data];

    return transformPurchaseOrder(rawInvoice);
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Submission failed.",
    };
  }
};

export const aribaDataCompare = async (
  poNumber: string,
  pdfId?: string | number
): Promise<AribaResponseDTO | ErrorResponseDto> => {
  try {
    const url = pdfId
      ? `/compare-invoice-ariba-receipt_id/${poNumber}?pdf_id=${pdfId}`
      : `/compare-invoice-ariba-receipt_id/${poNumber}`;

    const response = await instanceInvoiceExtraction.get<AribaResponseDTO>(url);

    if (!response.data) {
      return {
        statusCode: 404,
        message: "No Data Found",
        description: "The API returned empty data",
      };
    }

    const transformedData = transformAribaResponse(response.data);
    return transformedData;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "API Error",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Network Error",
      description: error.message || "Failed to connect to API",
    };
  }
};

export const uploadUpdateAribaData = async (
  payload: any
): Promise<InvoiceDto | ErrorResponseDto | SaveSuccessDto> => {
  try {
    const response = await instanceInvoiceExtraction.post<InvoiceDto>(
      "/save-edited-invoice/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    toast.success("Edited invoices saved successfully");
    return response?.data;
  } catch (error: any) {
    toast.error("Submission failed.");
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Submission failed.",
    };
  }
};

export interface InvoiceDtoSaveResponse {
  message: string;
}

export const saveChangesData = async(
  payload: any
): Promise<InvoiceDtoSaveResponse | ErrorResponseDto> => {
  try {
    const response = await instanceInvoiceExtraction.post<InvoiceDtoSaveResponse>(
      "/save-pre-rpa-data/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    return response?.data;
  } catch (error: any) {
    toast.error("Submission failed.");
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Unknown error",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Submission failed.",
    };
  }
}

interface PdfResponse {
  file_base64: string;
}

export const viewPdf = async (payload: number | string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
  setLoading(true);

  try {
    const response = await instanceInvoiceExtraction.get<PdfResponse>(
      `/base64-for-view-icon/${payload}`,
      { headers: { Accept: "application/json" } }
    );

    const base64Data = response.data.file_base64;

    if (!base64Data) throw new Error("No base64 data received");

    const detectMimeType = (base64: string): string => {
      const signatures: Record<string, string> = {
        JVBERi: "application/pdf",
        iVBORw: "image/png",
        "/9j/":  "image/jpeg",
        UEsDB:  "application/zip",
        R0lGOD: "image/gif",
      };
      for (const [signature, mimeType] of Object.entries(signatures)) {
        if (base64.startsWith(signature)) return mimeType;
      }
      return "application/octet-stream";
    };

    const mimeType = detectMimeType(base64Data);

    // ✅ Convert to blob instead of data URL (browsers block data: URLs in new tab)
    const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    if (mimeType === "application/zip") {
      // ✅ ZIP — force download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "download.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // ✅ PDF / image — open in new tab
      window.open(blobUrl, "_blank");
    }

    // ✅ Clean up after 30s
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

  } catch (error) {
    throw error;
  } finally {
    setLoading(false);
  }
};
export const fetchReprocessedInvoices = async (
  pdfIds: number[]
): Promise<ReprocessedData | ErrorResponseDto> => {
  try {
    const queryParams = pdfIds.map((id) => `pdf_ids=${id}`).join("&");
    
    const response = await instanceInvoiceExtraction.post<ReprocessedData>(
      `/process-failed-files-pdf_id/?${queryParams}`,
      {},
      {
        headers: {
          accept: "application/json",
        },
      }
    );

    if (!response.data) {
      return {
        statusCode: 404,
        message: "No Data Found",
        description: "The API returned empty data for reprocessed invoices",
      };
    }

    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Reprocess failed",
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Failed to reprocess invoices.",
    };
  }
};


export const processLocalPdfs = async (): Promise<
  ProcessLocalPdfsResponse | ErrorResponseDto
> => {
  try {
    const response = await instanceInvoiceExtraction.post<ProcessLocalPdfsResponse>(
      "/process-uploads-pdfs/",
      {},
      {
        headers: {
          accept: "application/json",
        },
      }
    );

    if (!response.data) {
      return {
        statusCode: 404,
        message: "No Data Found",
        description: "The API returned empty data",
      };
    }

    return response.data;
  } catch (error: any) {
    // Show error toast
    toast.error("Failed to process local PDFs");

    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Processing failed",
        description:
          err.detail ||
          err.description ||
          (err.errors ? JSON.stringify(err.errors) : "") ||
          "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Failed to process local PDFs.",
    };
  }
};

export const fetchInvoiceDetailsByPdfId = async (
  pdfId: string | number
): Promise<InvoiceDetailApiResponse | ErrorResponseDto> => {
  try {
    if (!pdfId) {
      return {
        statusCode: 400,
        message: "Invalid PDF ID",
        description: "PDF ID is required to fetch invoice details",
      };
    }

    const response = await instanceInvoiceExtraction.get<InvoiceDetailApiResponse>(
      `/invoice/${pdfId}`,
      {
        headers: {
          accept: "application/json",
        },
      }
    );

    if (!response.data) {
      return {
        statusCode: 404,
        message: "No Data Found",
        description: "The API returned empty data for the provided PDF ID",
      };
    }

    if (!isInvoiceDetailResponse(response.data)) {
      return {
        statusCode: 400,
        message: "Invalid Response Format",
        description: "The API response format is not as expected",
      };
    }

    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data;
      return {
        statusCode: err.status || error.response.status || 500,
        message: err.title || err.message || "Failed to fetch invoice details",
        description:
          err.detail ||
          err.description ||
          (err.errors ? JSON.stringify(err.errors) : "") ||
          "No details provided",
      };
    }

    return {
      statusCode: 500,
      message: "Network Error",
      description: error.message || "Failed to fetch invoice details",
    };
  }
};

export const updateInvoiceData = async (
  pdfId: string | number,
  payload: any
): Promise<any | ErrorResponseDto> => {
  try {
    const response = await instanceInvoiceExtraction.put(
      `/update-invoice/${pdfId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
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
        description:
          err.detail ||
          err.description ||
          JSON.stringify(err.errors) ||
          "No details provided",
      };
    }
    
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || "Failed to update invoice data.",
    };
  }
};