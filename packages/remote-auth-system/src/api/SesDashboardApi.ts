import { GrnSesDashboardInstance } from "./PulseReportApi";

export interface StatusSummarySESDTO {
  summary: {
    Composing: number;
    ERPSystemDeclined: number;
    Invoiced: number;
    Processed: number;
    Rejected: number;
    SendingToExternalSystem: number;
    Submitted: number;
    Total: number;
  };
}

export interface SesRecordDTO {
  ID: number;
  UniqueName: string;
  ServiceEntryID: string;
  ERPReceiptNumber: string;
  SupplierReferenceNumber: string;
  Name: string;
  ServiceDescription: string;
  Requester: string;
  Preparer: string;
  SubmitDate: string; // ISO date string (e.g. "2025-11-09T17:06:44")
  ApprovedDate: string | null;
  Amount: number;
  Currency: string;
  StatusString: string;
}

export interface SesRecordsResponseDTO {
  index: number;
  limit: number;
  total_count: number;
  returned_count: number;
  total_pages: number;
  records: SesRecordDTO[];
}
export interface SesListParamsDTO {
  status_strings?: string[];
  unique_names?: string[];
  service_entry_ids?: string[];
  requester_filter?: string[];
  supplier_filter?:string[];
  department_filter?: string[];
  requesters?: string[];
  gl_accounts_filter?:string[];
  cost_centers_filter?:string[];
  erp_receipt_numbers?: string[];
  company_code_filter?:string[];
  from_date?: string;
  to_date?: string;
  index?: number;  // page index, minimum 1
  limit?: number;  // page size, maximum 200
}
export interface SesUniqResponse {
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
   [key: string]: string[] | any;
}

export const sesdashBoardSummary = async (filtersQuick:any): Promise<StatusSummarySESDTO | null> => {
  try {
    const response = await GrnSesDashboardInstance.post<StatusSummarySESDTO>(
      "summary/ses",
      filtersQuick // ✅ sending empty payload
    );

    return response.data;
  } catch (error) {
    return null;
  }
};

export const getSESList = async ({
  status_strings,
  requester_filter,
  department_filter,
  unique_names,
  service_entry_ids,
  requesters,
  company_code_filter,
  erp_receipt_numbers,
  cost_centers_filter,
  supplier_filter,
  gl_accounts_filter,
  from_date,
  to_date,
  index = 1,
  limit = 20,
}: SesListParamsDTO): Promise<SesRecordsResponseDTO> => {
  try {
    const safeIndex = Math.max(1, index);
    const safeLimit = Math.min(Math.max(1, limit), 200);

    // ✅ Build payload instead of query params
    const payload: Record<string, any> = {
      index: safeIndex,
      limit: safeLimit,
    };

    if (status_strings?.length) payload.status_strings = status_strings;
     if (requester_filter?.length) payload.requester_filter = requester_filter;
       if (department_filter?.length) payload.department_filter = department_filter;
     if (supplier_filter?.length) payload.supplier_filter = supplier_filter;
          if (gl_accounts_filter?.length) payload.gl_accounts_filter = gl_accounts_filter;
               if (cost_centers_filter?.length) payload.cost_centers_filter = cost_centers_filter;
             if (company_code_filter?.length) payload.company_code_filter = company_code_filter;
     
         
    if (unique_names?.length) payload.unique_names = unique_names;
    if (service_entry_ids?.length) payload.service_entry_ids = service_entry_ids;
      if (erp_receipt_numbers?.length) payload.erp_receipt_numbers = erp_receipt_numbers;
    if (requesters?.length) payload.requesters = requesters;
  if(cost_centers_filter?.length) payload.cost_centers_filter = cost_centers_filter;
    if (from_date) payload.from_date = from_date;
    if (to_date) payload.to_date = to_date;

    // 🔥 Changed GET → POST and params → data payload
    const response = await GrnSesDashboardInstance.post<SesRecordsResponseDTO | null>(
      `/details/ses`,
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

export const geFilterSes = async (
  search: string = '',
  page: number = 1,
  page_size: number = 100
): Promise<SesUniqResponse> => {
  const params: Record<string, any> = { page, page_size };

    // Only include 'search' if it's non-empty
    if (search.trim().length > 0) {
      params.search = search.trim();
    }
  try {
    const response = await GrnSesDashboardInstance.get<SesUniqResponse>('filters/ses/unique-names', 
     {params}
    );

    return {
      unique_names: response.data.unique_names || [],
      pagination: response.data.pagination || {
        page: 1,
        page_size: page_size,
        total: 0,
        total_pages: 1,
      },
    };
  } catch (error: any) {

    // Handle auth & server errors
    if (error?.response?.status === 401) {
      // navigate to login if needed
      window.location.href = '/';
    }

    if ([404, 500].includes(error?.response?.status)) {
      return {
        unique_names: [],
        pagination: { page, page_size, total: 0, total_pages: 0 },
      };
    }

    throw error; // let caller handle if needed
  }
};
// ONE FUNCTION ONLY — USE THIS FOR EVERYTHING
export const getSesFilter = async (
  endpoint: "unique-names" | "service-entry-ids" | "requesters" | "erp-receipt-numbers" | "any-new-one",
  search: string = "",
  page: number = 1,
  page_size:number = 100
): Promise<{ items: string[]; hasMore: boolean }> => {
  const params: Record<string, any> = { page, page_size};

    // Only include 'search' if it's non-empty
    if (search.trim().length > 0) {
      params.search = search.trim();
    }
  try {
    const response = await GrnSesDashboardInstance.get<SesUniqResponse>(`/filters/ses/${endpoint}`,
      {params}
    );

    // Automatically detect the correct key from response
    const keysToTry = [
      "unique_names",
      "service_entry_ids",
      "requesters",
      "erp_receipt_numbers",
      // add more if needed
    ];

    let items: string[] = [];
    for (const key of keysToTry) {
      if (response.data[key]) {
        items = response.data[key];
        break;
      }
    }

    const hasMore = response.data.pagination?.total_pages > page;

    return { items, hasMore };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      window.location.href = "/";
    }
    return { items: [], hasMore: false };
  }
};
