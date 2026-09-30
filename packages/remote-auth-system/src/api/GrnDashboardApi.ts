import { GrnSesDashboardInstance } from "./PulseReportApi";

export interface RecordDto {
  id: string;
  domain_id: string;
  purchase_order_id: string;
  epid: string;
  line_item: string;
  unit_of_measure: string | null;
  material_code: string | null;
  quantity: number;
  previous_accepted_quantity: number;
  date_created: string; // ISO date string
  date_updated: string; // ISO date string
  erpreceipt_id: string;
  processed_receipt_id: string;
  success_cloud_erpid: string | null;
  status: string;
  processed_state: number;
}

export interface RecordsResponseGRNDto {
  index: number;
  limit: number;
  total_count: number;
  returned_count: number;
  records: RecordDto[];
  total_pages?: number;
}
export interface SesListParamsDTO {
  status?: string[];
  supplier_filter?: string[];
  requester_filter?: string[];
  company_code_filter?: string[];
  department_filter?: string[];
  cost_centers_filter?: string[];
  gl_accounts_filter?: string[];
  receiptIds?: string[];
  poNumbers?: string[];
  from_date?: string | null;
  to_date?: string | null;
  page?: number;
  page_size?: number;
}
export const getGRNList = async ({
  status,
  supplier_filter,
  requester_filter,
  company_code_filter,
  department_filter,
  cost_centers_filter,
  gl_accounts_filter,
  receiptIds,
  poNumbers,
  from_date,
  to_date,
  page = 1,
  page_size = 20,
}: SesListParamsDTO): Promise<RecordsResponseGRNDto> => {
  try {
    const safeIndex = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, page_size), 200);

    // Build request payload (POST body)
    const payload: Record<string, any> = {
      index: safeIndex,
      limit: safeLimit,
    };

    if (status?.length) payload.status = status;
    if (supplier_filter?.length) payload.supplier_filter = supplier_filter;
    if (requester_filter?.length) payload.requester_filter = requester_filter;
    if (company_code_filter?.length) payload.company_code_filter = company_code_filter;
    if (department_filter?.length) payload.department_filter = department_filter;
    if (cost_centers_filter?.length) payload.cost_centers_filter = cost_centers_filter;
    if (gl_accounts_filter?.length) payload.gl_accounts_filter = gl_accounts_filter;
    if (receiptIds?.length) payload.receiptIds = receiptIds;
    if (poNumbers?.length) payload.poNumbers = poNumbers;
    if (from_date) payload.from_date = from_date;
    if (to_date) payload.to_date = to_date;

    // Proper POST request
    const response = await GrnSesDashboardInstance.post<RecordsResponseGRNDto>(
      `/details/grn`,
      payload
    );

    if (!response.data) {
      throw new Error("No data received from server");
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};
interface PONumbersResponse {
  po_numbers: string[],
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
interface PONumbersReceiptResponse {
  receipt_ids: string[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
export const getPONumbers = async (poInputValue: string, indexPo: number) => {
  try {
    const payload = {
      page: indexPo,
      page_size: 100,
      search: poInputValue
    };

    const response = await GrnSesDashboardInstance.post<PONumbersResponse>(
      "/grn/filters/po-numbers",
      payload
    );

    return response?.data ?? null;
  } catch (error) {
    throw error;
  }
};
export const getReceiptId = async (receiptInputValue: string, indexReceipt: number) => {
  try {
    const payload = {
      page: indexReceipt,
      page_size: 100,
      search: receiptInputValue
    };

    const response = await GrnSesDashboardInstance.post<PONumbersReceiptResponse>(
      "/grn/filters/receipt-ids",
      payload
    );

    return response?.data ?? null;
  } catch (error) {
    throw error;
  }
};
