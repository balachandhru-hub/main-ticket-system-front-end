export interface TableDataRecord {
  purchase_order_id: string;
  line_item: string;
  service_start_date: string;
  service_end_date: string;
  service_max_amount: number;
}

export interface FetchTableDataResponse {
  status: string;
  purchase_order_id: string;
  line_item_requested: string;
  total_rows: number;
  data: TableDataRecord[];
}

export interface TableRowData extends TableDataRecord {
  ss_id: string; // To be populated from another endpoint
  result: string; // To be populated later
  correction_sheet_no: string; // To be populated later
  external_reference_no: string; // To be populated later
}