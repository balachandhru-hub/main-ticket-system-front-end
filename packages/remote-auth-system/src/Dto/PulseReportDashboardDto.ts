// ==================== FILE 1: src/Dto/InvoiceDetailsDto.ts ====================

/**
 * Invoice record from /details/invoice endpoint
 */
export interface InvoiceRecord {
  Invoice_ID: string;
  Requester: string;
  CompanyCode: string;
  Invoice_Order_ID: string;
  CommodityCode: string;
  CostCenter_Account: string;
  GL_Account: string;
  IR_ID: string | null;
  Payment_ID: string | null;
  ERPPaymentID: string | null;
  ERPPayableNumber: string | null;
  InvoiceStatusString: string;
  IR_StatusString: string | null;
  Payment_StatusString: string | null;
  SubmitDate: string;
  Amount: number;
}

/**
 * Query parameters for /details/invoice endpoint
 */
export interface InvoiceDetailsQueryParams {
  invoice_ids?: string[];
  requesters?: string[];
  company_codes?: string[];
  invoice_order_ids?: string[];
  commodity_codes?: string[];
  cost_centers?: string[];
  gl_accounts?: string[];
  ir_ids?: string[];
  payment_ids?: string[];
  erp_payment_ids?: string[];
  erp_payable_numbers?: string[];
  status?: string[];
  from_date?: string;
  to_date?: string;
  index?: number;
  limit?: number;
  supplier_filter?: string[];
}

/**
 * Response from /details/invoice endpoint
 */
export interface InvoiceDetailsResponse {
  index: number;
  limit: number;
  total_count: number;
  returned_count: number;
  records: InvoiceRecord[];
}

/**
 * Pagination info
 */
export interface InvoicePaginationInfo {
  index: number;
  limit: number;
  total_count: number;
  returned_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Extended invoice record with computed fields
 */
export interface InvoiceRecordExtended extends InvoiceRecord {
  formatted_amount?: string;
  formatted_date?: string;
  days_since_submit?: number;
  is_recent?: boolean;
}

/**
 * Consolidated invoice response with pagination info
 */
export interface InvoiceDetailsConsolidated {
  pagination: InvoicePaginationInfo;
  records: InvoiceRecord[];
  summary?: {
    total_amount: number;
    average_amount: number;
    min_amount: number;
    max_amount: number;
  };
}

/**
 * Invoice filter options for UI
 */
export interface InvoiceFilterOptions {
  invoiceIds: string[];
  requesters: string[];
  companyCodes: string[];
  invoiceOrderIds: string[];
  commodityCodes: string[];
  costCenters: string[];
  glAccounts: string[];
  statuses: string[];
}

/**
 * User-friendly filter state
 */
export interface InvoiceFilterState {
  invoiceId: string;
  requester: string;
  companyCode: string;
  invoiceOrderId: string;
  commodityCode: string;
  costCenter: string;
  glAccount: string;
  status: string;
  startDate: string;
  endDate: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  status: number;
  message: string;
  error?: string;
  details?: any;
}