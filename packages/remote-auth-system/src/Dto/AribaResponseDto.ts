export interface PoNumberComparisonDTO {
  [key: string]: string | number | null | undefined;
}

export interface AribaResponseDTO {
  po_number?: string;
  invoice_number?: string;
  vendor_name?: string;
  invoice_date?: string;
  total_amount?: string | number;
  po_number_comparison?: PoNumberComparisonDTO[] | null;
  [key: string]: any;
}
