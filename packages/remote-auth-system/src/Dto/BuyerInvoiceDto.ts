// DTO (Data Transfer Object) interfaces for Invoice API

// ==========================================
// STATUS COUNTS & FILTERS
// ==========================================

export interface StatusCountsDto {
  pending: number;
  processed: number;
  failed: number;
  "OCR-Success": number;
  rpa_pending: number;
  total_invoices: number;
  Queued?: number;
}

export interface FiltersAppliedDto {
  po_number: string | null;
  supplier: string | null;
  company_code: string | null;
  status: string | null;
  invoice_start_date: string | null;
  invoice_end_date: string | null;
  process_start_date: string | null;
  process_end_date: string | null;
}

// ==========================================
// CUSTOMER GRAPH ENDPOINT
// ==========================================

export interface CustomerRecord {
  id: number;
  user_id: string;
  SupplierName: string;
  filename: string;
  pdf_id: number;
  status: string;
  PONumber: string;
  CUSTOMER_INVOICE_ID: string | null;
  invoice_date: string;      
  processed_date: string;   
  Total: string;
  comments: string;
  Company_Code: string;
  Ariba_comments?: string | null;
  InvoiceNumber?: string | null;
  ERPPayableNumber?: string | null;
}
export interface CustomerGraphRequestDto {
  page?: number;
  page_size?: number;
  Field?: string;
  po_number?: string;
  supplier?: string;
  company_code?: string;
  status?: string;
  invoice_start_date?: string;
  invoice_end_date?: string; 
}

export interface CustomerGraphResponseDto {
  Field: string;
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  records: CustomerRecord[];
  status_counts: StatusCountsDto;
  filters_applied: FiltersAppliedDto;
}

// ==========================================
// PDF ENDPOINTS
// ==========================================

export interface PdfBase64ResponseDto {
  status: string;
  file_base64?: string;
  base64?: string;
  pdf_base64?: string;
  message?: string;
}

export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description: string;
}

// ==========================================
// DISTINCT VALUES ENDPOINTS
// ==========================================

export interface DistinctPoNumbersRequestDto {
  source?: "email" | "sharepoint" | "manual" | null;
}

export interface DistinctPoNumbersResponseDto {
  status: string;
  count: number;
  po_numbers: string[];
  source: string;
}

export interface DistinctSuppliersRequestDto {
  source?: "email" | "sharepoint" | "manual" | null;
}

export interface DistinctSuppliersResponseDto {
  status: string;
  count: number;
  suppliers: string[];
  source: string;
}

export interface DistinctCompanyCodesRequestDto {
  source?: "email" | "sharepoint" | "manual" | null;
}

export interface DistinctCompanyCodesResponseDto {
  status: string;
  count: number;
  company_codes: string[];
}

// ==========================================
// TRUSTED SUPPLIERS ENDPOINTS
// ==========================================

export interface TrustedSupplier {
  TRN: string;
  SupplierName: string;
  created_at: string;
}

export interface TrustedSuppliersResponseDto {
  trusted_suppliers: TrustedSupplier[];
}

export interface TrustedSupplierRequestDto {
  SupplierName: string;
  SupplierTRN: string;
}

export interface TrustedSupplierResponseDto {
  message?: string;
  detail?: string;
  status?: string;
}

// ==========================================
// INVOICE EXECUTION ENDPOINTS
// ==========================================

export interface ExecutePdfRequestDto {
  pdf_id: string;
}

export interface ExecutePdfResultDto {
  Purchase_Order_ID: string;
  Invoice_No: string;
  Customer_Invoice_ID: string;
  Message: string;
  pdf_id: string;
}

export interface ExecutePdfResponseDto {
  status: string;
  results: ExecutePdfResultDto[];
}

// ==========================================
// COMPONENT STATE INTERFACES
// ==========================================

export interface InvoiceItem {
  id: string;
  userId: string;
  buyerName: string;
  filename: string;
  pdfId: string;
  status: "processed" | "pending" | "failed" | "queued";
  PONumber?: string;
  customerInvoiceId?: string | null;
  createdAt: string;
  processedDate: string;
  totalAmount: number;
  receivedAmount: number;
  comments?: string | null;
  aribaComments?: string | null;
  companyCode?: string;
  invoiceId?: string;
  erpPayableNumber?: string;
  folderName?: string;   
  brand?: string; 
}

export interface FilterState {
  activeFilter: string;
  sourceFilter: string;
  selectedSupplier: string;
  selectedPoNumber: string;
  selectedCompanyCode: string;
  searchQuery: string;
}

// ==========================================
// CONSTANTS (Replaces Enums)
// ==========================================

export const SOURCE_TYPES = {
  ALL: "All Sources",
  MANUAL: "Manual",
  EMAIL: "Email",
  SHAREPOINT: "SharePoint",
} as const;

export type SourceType =
  (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];

export const INVOICE_STATUS = {
  PROCESSED: "processed",
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
  REPROCESS: "reprocess",
  QUEUED: "queued",
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const FILTER_TYPES = {
  STATUS: "status",
  SOURCE: "source",
  SUPPLIER: "supplier",
  PO_NUMBER: "poNumber",
  COMPANY_CODE: "companyCode",
  SEARCH: "search",
} as const;

export type FilterType =
  (typeof FILTER_TYPES)[keyof typeof FILTER_TYPES];

// ==========================================
// PO RECEIPTS SUMMARY (RC DETAILS) ENDPOINT
// ==========================================

export interface PoReceiptLineItemDto {
  line_item: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  amount_accepted: number;
  gross_amount_accepted: number;
}

export interface PoReceiptDto {
  receipt_id: string;
  total_line_items: number;
  total_gross_amount: number;
  items: PoReceiptLineItemDto[];
}

export interface PoReceiptsSummaryResponseDto {
  po_number: string;
  total_rc_count: number;
  receipts: PoReceiptDto[];
}