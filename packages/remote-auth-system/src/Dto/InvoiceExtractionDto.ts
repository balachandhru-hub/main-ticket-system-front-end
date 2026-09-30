// ---------------------- Invoice DTOs ----------------------

export interface InvoiceItemDto {
  LineItemNumber?: number;
  ItemCode: string;
  ItemDescription: string;
  QTY: string;
  Unit: string;
  UnitPrice: string;
  Amount: string;
  Discount: string | null;
  VAT: string;
  VATAmount: string;
  AmountInclVAT: string;
}

export interface InvoiceDto {
  InvoiceNumber: string;
  SupplierName: string;
  CustomerName?: string;
  PONumber: string;
  InvoiceDate: string;
  Email: string;
  SupplierTRN: string;
  CustomerTRN?: string;
  Total: string;
  Items: InvoiceItemDto[];
  source_file: string;
  pdf_id?: string | number;
  user_id?: string;
  invoice_id: number;
  is_trusted: boolean;
  is_Submit: boolean;
  // Bank details
  BankAccountName?: string | null;
  BankName?: string | null;
  BankBranch?: string | null;
  BranchCode?: string | null;
  AccountNumber?: string | null;
  IBAN?: string | null;
  SwiftCode?: string | null;
  // Address & flags
  Customer_address?: string | null;
  Supplier_address?: string | null;
  Tax_invoice?: string | null;
}

export interface ApiInvoiceResult {
  filename: string;
  user_id: string;
  input_id: number;
  pdf_id: number;
  invoices: InvoiceDto[];
  status: string;
}

export interface ApiResponse {
  results: ApiInvoiceResult[];
}

// Transform raw invoice object to InvoiceDto
export function transformInvoice(raw: any): InvoiceDto {
  return {
    InvoiceNumber: raw.InvoiceNumber || "",
    SupplierName: raw.SupplierName || "",
    CustomerName: raw.CustomerName || "",
    PONumber: raw.PONumber || "",
    InvoiceDate: raw.InvoiceDate || "",
    Email: raw.Email || "",
    SupplierTRN: raw.SupplierTRN || "",
    CustomerTRN: raw.CustomerTRN || "",
    Total: raw.Total || "",
    source_file: raw.source_file || "",
    invoice_id: raw.invoice_id || 0,
    is_trusted: raw.is_trusted || false,
    is_Submit: false,
    // Bank details — preserved from API response
    BankAccountName: raw.BankAccountName ?? null,
    BankName: raw.BankName ?? null,
    BankBranch: raw.BankBranch ?? null,
    BranchCode: raw.BranchCode ?? null,
    AccountNumber: raw.AccountNumber ?? null,
    IBAN: raw.IBAN ?? null,
    SwiftCode: raw.SwiftCode ?? null,
    // Address & flags
    Customer_address: raw.Customer_address ?? null,
    Supplier_address: raw.Supplier_address ?? null,
    Tax_invoice: raw.Tax_invoice ?? null,
    Items: Array.isArray(raw.Items)
      ? raw.Items.map((item: any): InvoiceItemDto => ({
          LineItemNumber: item.LineItemNumber || undefined,
          ItemCode: item.ItemCode || "",
          ItemDescription: item.ItemDescription || "",
          QTY: item.QTY || "",
          Unit: item.Unit || "",
          UnitPrice: item.UnitPrice || "",
          Amount: item.Amount || "",
          Discount: item.Discount ?? null,
          VAT: item.VAT || "",
          VATAmount: item.VATAmount || "",
          AmountInclVAT: item.AmountInclVAT || "",
        }))
      : [],
  };
}

// Transform API response to InvoiceDto[]
export function transformApiResponse(apiResponse: ApiResponse, stamp?: boolean): InvoiceDto[] {
  return apiResponse.results.flatMap(result =>
    result.status === "success" && result.invoices
      ? result.invoices.map(inv => ({
          ...transformInvoice(inv),
          is_Submit: false,
          is_Stamp: stamp,
          pdf_id: result.pdf_id,
        }))
      : []
  );
}



export function isApiResponse(response: unknown): response is ApiResponse {
  if (!response || typeof response !== "object") return false;
  const obj = response as Record<string, unknown>;
  return Array.isArray(obj.results);
}

export function isErrorResponse(
  response: unknown
): response is { error?: string; message?: string } {
  if (!response || typeof response !== "object") return false;
  const obj = response as Record<string, unknown>;
  return Boolean(obj.error || obj.message);
}

export function hasValidInvoices(response: ApiResponse): boolean {
  return response.results.some(
    (result) =>
      result.status === "success" &&
      result.invoices &&
      result.invoices.length > 0 &&
      result.invoices.some(
        (invoice) => Array.isArray(invoice.Items) && invoice.Items.length > 0
      )
  );
}

// ---------------------- Purchase Order DTOs ----------------------

export interface AribaDataDTO {
  id: string;
  purchase_order_id: string;
  epid: string;
  line_item: string;
  quantity: number;
  unit_of_measure: string | null;
  material_code: string | null;
  description: string | null;
  supplier_name: string | null;
  price: number;
  tax_code: string | null;
}

export interface PurchaseOrderDTO {
  poNumber: string;
  totalRecords: number;
  ariba_data: AribaDataDTO[];
}

export function transformPurchaseOrder(raw: any): PurchaseOrderDTO {
  if (!raw) {
    return {
      poNumber: "",
      totalRecords: 0,
      ariba_data: [],
    };
  }

  return {
    poNumber: raw.po_number ?? "",
    totalRecords: raw.total_records ?? 0,
    ariba_data: Array.isArray(raw.ariba_data)
      ? raw.ariba_data.map((item: any): AribaDataDTO => ({
          id: item.id ?? "",
          purchase_order_id: item.purchase_order_id ?? "",
          epid: item.epid ?? "",
          line_item: item.line_item ?? "",
          quantity: item.quantity ?? 0,
          unit_of_measure: item.unit_of_measure ?? null,
          material_code: item.material_code ?? null,
          description: item.description ?? null,
          supplier_name: item.supplier_name ?? null,
          price: item.price ?? 0,
          tax_code: item.tax_code ?? null,
        }))
      : [],
  };
}

// ---------------------- Ariba Comparison DTOs ----------------------

export interface HeaderIssueDTO {
  field: string;
  issue: string;
  extractedValue: string | null;
  originalValue: string | null;
  comment: string;
}

export interface ComparisonIssueDTO {
  field: string;
  issue: string;
  extractedValue: string | null;
  originalValue: string | null;
  comment: string;
}

export interface ComparisonTableItemDTO {
  itemDescription: string;
  extractedData: Record<string, string | null>;
  originalData: Record<string, string | null>;
  status: string;
  issues: ComparisonIssueDTO[];
}

export interface ComparisonDTO {
  invoiceNumber: string;
  poNumber: string;
  supplierName: string;
  headerIssues: HeaderIssueDTO[];
  comparisonTable: ComparisonTableItemDTO[];
}

// // New DTOs for your modal
// export interface PoNumberComparisonDTO {
//   invoice_po_number: string;
//   ariba_po_number: string;
//   status: string;
// }

// export interface TotalComparisonDTO {
//   invoice_total: string | number;
//   ariba_total: string | number;
//   status: string;
// }

// export interface LineItemComparisonDTO {
//   line_item_comparison_number: number;
//   invoice_item: {
//     ItemCode: string;
//     ItemDescription: string;
//     QTY: string;
//     Unit: string | null;
//   };
//   ariba_item: {
//     line_item: string | null;
//     description: string | null;
//     quantity: number | null;
//     unit_of_measure: string | null;
//   };
//   comparison: {
//     ItemCode_vs_line_item: string;
//     ItemDescription_vs_description: string;
//     QTY_vs_quantity: string;
//     Unit_vs_unit_of_measure: string;
//   };
// }

// // Updated Ariba response DTO
// export interface AribaResponseDTO {
//   po_number_comparison?: PoNumberComparisonDTO;
//   total_comparison?: TotalComparisonDTO;
//   Comparision_of_lineItems?: LineItemComparisonDTO[];
//   poNumber?: string;
//   comparison?: ComparisonDTO[];
//   message?: string;
// }

// // Transform API response to match new DTO structure
// export function transformAribaResponse(response: any): AribaResponseDTO {
//   return {
//     po_number_comparison: response.po_number_comparison
//       ? {
//           invoice_po_number: response.po_number_comparison.invoice_po_number,
//           ariba_po_number: response.po_number_comparison.ariba_po_number,
//           status: response.po_number_comparison.status,
//         }
//       : undefined,
//     total_comparison: response.total_comparison
//       ? {
//           invoice_total: response.total_comparison.invoice_total,
//           ariba_total: response.total_comparison.ariba_total,
//           status: response.total_comparison.status,
//         }
//       : undefined,
//     Comparision_of_lineItems: Array.isArray(response.Comparision_of_lineItems)
//       ? response.Comparision_of_lineItems.map((item: any) => ({
//           line_item_comparison_number: item.line_item_comparison_number,
//           invoice_item: {
//             ItemCode: item.invoice_item.ItemCode,
//             ItemDescription: item.invoice_item.ItemDescription,
//             QTY: item.invoice_item.QTY,
//             Unit: item.invoice_item.Unit ?? null,
//           },
//           ariba_item: {
//             line_item: item.ariba_item.line_item ?? null,
//             description: item.ariba_item.description ?? null,
//             quantity: item.ariba_item.quantity ?? null,
//             unit_of_measure: item.ariba_item.unit_of_measure ?? null,
//           },
//           comparison: {
//             ItemCode_vs_line_item: item.comparison.ItemCode_vs_line_item,
//             ItemDescription_vs_description: item.comparison.ItemDescription_vs_description,
//             QTY_vs_quantity: item.comparison.QTY_vs_quantity,
//             Unit_vs_unit_of_measure: item.comparison.Unit_vs_unit_of_measure,
//           },
//         }))
//       : [],
//     poNumber: response.poNumber ?? undefined,
//     comparison: response.comparison ?? undefined,
//     message: response.message ?? undefined,
//   };
// }

// ---------------------- Ariba Comparison DTOs ----------------------

export interface PoNumberComparisonDTO {
  invoice_po_number: string;
  ariba_po_number: string;
  receipt_po_number: string;
  status: string;
  error_comment: string | null;
}

export interface TotalComparisonDTO {
  invoice_total: string | number;
  ariba_total: string | number;
  receipt_total: string | number;
  status: string;
  error_comment: string | null;
}

export interface LineItemComparisonDTO {
  line_item_comparison_number: number;
  invoice_item: {
     line_item: string | null;
    ItemCode: string | null;
    ItemDescription: string | null;
    QTY: string | null;
    Unit: string | null;
  };
  ariba_item: {
    line_item: string | null;
    description: string | null;
    quantity: number | null;
    unit_of_measure: string | null;
  };
  receipt_item: {
    line_item: string | null;
    description: string | null;
    quantity: number | null;
    unit_of_measure: string | null;
  };
  comparison: {
    ItemCode_vs_line_item: string;
    ItemDescription_vs_description: string;
    QTY_vs_quantity: string;
    Unit_vs_unit_of_measure: string;
    error_comments: Record<string, string>;
  };
}

export interface AribaReferenceLineItemDTO {
  line_item: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  price: number;
  tax_amount: number;
  line_total: number;
  tax_percentage: number;
}

export interface AribaReferenceDataDTO {
  ariba_po_number: string;
  ariba_total: number;
  ariba_line_items: AribaReferenceLineItemDTO[];
}

// Updated Ariba response DTO
export interface AribaResponseDTO {
  po_number_comparison?: PoNumberComparisonDTO;
  total_comparison?: TotalComparisonDTO;
  Comparision_of_lineItems?: LineItemComparisonDTO[];
  ariba_reference_data?: AribaReferenceDataDTO;
  poNumber?: string;
  comparison?: ComparisonDTO[];
  message?: string;
}

// Transform API response to match DTO
export function transformAribaResponse(response: any): AribaResponseDTO {
  return {
    po_number_comparison: response.po_number_comparison
      ? {
          invoice_po_number: response.po_number_comparison.invoice_po_number,
          ariba_po_number: response.po_number_comparison.ariba_po_number,
          receipt_po_number: response.po_number_comparison.receipt_po_number,
          status: response.po_number_comparison.status,
          error_comment: response.po_number_comparison.error_comment,
        }
      : undefined,
    total_comparison: response.total_comparison
      ? {
          invoice_total: response.total_comparison.invoice_total,
          ariba_total: response.total_comparison.ariba_total,
          receipt_total: response.total_comparison.receipt_total,
          status: response.total_comparison.status,
          error_comment: response.total_comparison.error_comment,
        }
      : undefined,
    Comparision_of_lineItems: Array.isArray(response.Comparision_of_lineItems)
      ? response.Comparision_of_lineItems.map((item: any) => ({
          line_item_comparison_number: item.line_item_comparison_number,
          invoice_item: {
            ItemCode: item.invoice_item?.line_item ?? null,
            ItemDescription: item.invoice_item?.ItemDescription ?? null,
            QTY: item.invoice_item?.QTY ?? null,
            Unit: item.invoice_item?.Unit ?? null,
          },
          ariba_item: {
            line_item: item.ariba_item?.line_item ?? null,
            description: item.ariba_item?.description ?? null,
            quantity: item.ariba_item?.quantity ?? null,
            unit_of_measure: item.ariba_item?.unit_of_measure ?? null,
          },
          receipt_item: {
            line_item: item.receipt_item?.line_item ?? null,
            description: item.receipt_item?.description ?? null,
            quantity: item.receipt_item?.quantity ?? null,
            unit_of_measure: item.receipt_item?.unit_of_measure ?? null,
          },
          comparison: {
            ItemCode_vs_line_item: item.comparison.line_item_vs_line_item,
            ItemDescription_vs_description: item.comparison.ItemDescription_vs_description,
            QTY_vs_quantity: item.comparison.QTY_vs_quantity,
            Unit_vs_unit_of_measure: item.comparison.Unit_vs_unit_of_measure,
            error_comments: item.comparison.error_comments || {},
          },
        }))
      : [],
    ariba_reference_data: response.ariba_reference_data
      ? {
          ariba_po_number: response.ariba_reference_data.ariba_po_number,
          ariba_total: response.ariba_reference_data.ariba_total,
          ariba_line_items: Array.isArray(response.ariba_reference_data.ariba_line_items)
            ? response.ariba_reference_data.ariba_line_items.map((item: any) => ({
                line_item: item.line_item,
                description: item.description,
                quantity: item.quantity,
                unit_of_measure: item.unit_of_measure,
                unit_price: item.unit_price,
                price: item.price,
                tax_amount: item.tax_amount,
                line_total: item.line_total,
                tax_percentage: item.tax_percentage,
              }))
            : [],
        }
      : undefined,
    poNumber: response.poNumber ?? undefined,
    message: response.message ?? undefined,
  };
}

// ---------------------- Bank Details DTO ----------------------

export interface BankDetailsDto {
  BankAccountName: string | null;
  BankName: string | null;
  BankBranch: string | null;
  BranchCode: string | null;
  AccountNumber: string | null;
  IBAN: string | null;
  SwiftCode: string | null;
}

// Extract bank details from invoice
export const extractBankDetailsFromInvoice = (invoice: any): BankDetailsDto => {
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

// Type guard to check if response has bank details
export const hasBankDetails = (invoice: any): boolean => {
  return !!(
    invoice.BankAccountName ||
    invoice.BankName ||
    invoice.IBAN
  );
};