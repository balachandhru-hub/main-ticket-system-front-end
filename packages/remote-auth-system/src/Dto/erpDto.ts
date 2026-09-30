export interface ErpComparisonRequest {
  page?: number;
  page_size?: number;
  po_number?: string;
  status?: string;
}

export interface ErpRecord {
  po_number: string;
  line_item: string;
  PO_quantity: number;
  company_code: string;
  ariba_quantity: number;
  s4_quantity: number;
  unit_price: number;
  ariba_value: number;
  s4_value: number;
  last_modified: string;
  mismatch: boolean;
}

export interface ErpComparisonResponse {
  total_count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  records: ErpRecord[];
}

export interface FullMatchRequest {
  po_number: string;
  line_item: string;
}

export interface FullMatchRecord {
  po_number: string;
  line_item: string;
  ariba_quantity: number;
  company_code: string;
  s4_quantity: number;
  ariba_value: number;
  s4_value: number;
  s4_material_doc: string;
}

export type FullMatchResponse = FullMatchRecord[];

export interface ErpComparisonCountResponse {
  count: number;
}