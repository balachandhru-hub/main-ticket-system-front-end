/**
 * InvoiceDetailDto.ts
 * 
 * This file defines the DTOs for the new GET /invoice/{pdf_id} endpoint
 * which provides detailed invoice information including bank details.
 * 
 * Location: src/Dto/InvoiceDetailDto.ts
 */

// ======================== Individual Invoice Item ========================
export interface InvoiceDetailItem {
  LineItemNumber: string;
  ItemCode: string | null;
  ItemDescription: string;
  Unit: string;
  QTY: string;
  UnitPrice: string;
  Amount: string | null;
  Discount: string | null;
  VAT: string | null;
  VATAmount: string;
  AmountInclVAT: string | null;
}

// ======================== Complete Invoice Data ========================
/**
 * Complete invoice data from GET /invoice/{pdf_id}
 * Includes all fields returned by the endpoint
 */
export interface InvoiceDetailData {
  source_file: string;
  Tax_invoice: string;
  Stamp: string;
  SupplierName: string;
  CustomerName: string;
  InvoiceNumber: string;
  PONumber: string;
  InvoiceDate: string;
  SupplierTRN: string;
  CustomerTRN: string;
  Email: string;
  Total: string;
  // Bank Details Fields
  BankAccountName: string;
  BankName: string;
  BankBranch: string | null;
  BranchCode: string | null;
  AccountNumber: string | null;
  IBAN: string;
  SwiftCode: string | null;
  // Address Fields
  Customer_address: string;
  Supplier_address: string;
  // Line Items
  Items: InvoiceDetailItem[];
}

// ======================== API Result Structure ========================
/**
 * Individual result from the API response
 * Contains metadata and invoices
 */
export interface InvoiceDetailResult {
  filename: string;
  pdf_id: string;
  status: string;
  invoices: InvoiceDetailData[];
}

// ======================== Complete API Response ========================
/**
 * Complete response from GET /invoice/{pdf_id}
 * Main DTO for the endpoint
 */
export interface InvoiceDetailApiResponse {
  results: InvoiceDetailResult[];
}

// ======================== Error Response ========================
/**
 * Standard error response format
 */
export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description: string;
}

// ======================== Type Guards ========================

/**
 * Check if data is a valid InvoiceDetailApiResponse
 */
export const isInvoiceDetailResponse = (
  data: any
): data is InvoiceDetailApiResponse => {
  return (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray(data.results) &&
    data.results.length > 0 &&
    "invoices" in data.results[0] &&
    Array.isArray(data.results[0].invoices)
  );
};

/**
 * Check if data is an error response
 */
export const isErrorResponse = (
  data: any
): data is ErrorResponseDto => {
  return (
    data &&
    typeof data === "object" &&
    "statusCode" in data &&
    "message" in data
  );
};

/**
 * Check if invoice has bank details
 */
export const hasInvoiceDetailData = (data: any): boolean => {
  return (
    data &&
    typeof data === "object" &&
    ("BankAccountName" in data || "BankName" in data || "IBAN" in data)
  );
};

// ======================== Helper Functions ========================

/**
 * Extract bank details from invoice detail data
 * Returns object compatible with BankDetailsDto from InvoiceExtractionDto
 */
export const extractBankDetailsFromDetailData = (
  invoice: InvoiceDetailData
) => {
  return {
    BankAccountName: invoice.BankAccountName || null,
    BankName: invoice.BankName || null,
    BankBranch: invoice.BankBranch || null,
    BranchCode: invoice.BranchCode || null,
    AccountNumber: invoice.AccountNumber || null,
    IBAN: invoice.IBAN || null,
    SwiftCode: invoice.SwiftCode || null,
  };
};

/**
 * Extract address details from invoice detail data
 */
export const extractAddressDetails = (invoice: InvoiceDetailData) => {
  return {
    Customer_address: invoice.Customer_address || "",
    Supplier_address: invoice.Supplier_address || "",
  };
};

/**
 * Extract document type flags from invoice detail data
 */
export const extractDocumentTypeFlags = (invoice: InvoiceDetailData) => {
  return {
    Tax_invoice: invoice.Tax_invoice || "",
    Stamp: invoice.Stamp || "",
  };
};

/**
 * Merge invoice detail data with existing invoice
 * Extracts and formats bank details, addresses, and document flags
 */
export const mergeInvoiceDetailData = (
  baseInvoice: any,
  detailInvoice: InvoiceDetailData
): any => {
  return {
    ...baseInvoice,
    // Bank Details
    BankAccountName: detailInvoice.BankAccountName,
    BankName: detailInvoice.BankName,
    BankBranch: detailInvoice.BankBranch,
    BranchCode: detailInvoice.BranchCode,
    AccountNumber: detailInvoice.AccountNumber,
    IBAN: detailInvoice.IBAN,
    SwiftCode: detailInvoice.SwiftCode,
    // Addresses
    Customer_address: detailInvoice.Customer_address,
    Supplier_address: detailInvoice.Supplier_address,
    // Document Types
    Tax_invoice: detailInvoice.Tax_invoice,
    Stamp: detailInvoice.Stamp,
  };
};