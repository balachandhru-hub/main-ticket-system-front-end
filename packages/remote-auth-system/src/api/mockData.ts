import sesComments from "./sesAxiosComment";
import sesPoChange from "./sesAxiosPoChange";
import quickSesInstance from "./axiosQuickSesIntance";
import sesInstance from "./sesAxiosInstance";

export interface LineItemResponse {
  purchase_order_id: string;
}
export interface PaginatedFilterPayload {
  page?: number;
  page_size?: number;
  search?: string;
}
export interface SuppliersDTO {
  suppliers: string[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
export interface TableRow {
  purchase_order_id: string;
  line_item: string;
  service_start_date: string | null;
  service_end_date: string | null;
  service_max_amount: number | null;
  Service_Description?: string;
  service_sheet_number_generated?: string;
  external_reference_id?: string;
}

export interface SingleResult {
  status: string;
  purchase_order_id: string;
  line_item: string,
  total_rows: number;
  data: TableRow[];
}
export interface GetTableDataResponse {
  status: string;
  total_requests: number;
  results: SingleResult[];
}
export interface LineItemResult {
  line_item: number;
  service_sheet_number: string;
  service_sheet_number_generated: string;
  status: string;
  processing_time_seconds: number;
  error?: string;
}

export interface PODetail {
  purchase_order_id: string;
  line_item: string | number;
  results: LineItemResult[]; // <-- Add this
  failed?: number;
  successful?: number;
}

export interface PurchaseOrderResponse {
  status: string;
  message: string;
  details: PODetail[];
}

export interface ServiceSheetResponse {
  external_reference_id: string;
  status: string;
  comments: [];
  total_comments: number;
  message: string;
}

export interface DeleteServiceSheetResult {
  service_sheet_number: string;
  status: string;
  error?: string;
  message?: string;
}

export interface DeleteServiceSheetResponse {
  batch_status: string;
  total_processed: number;
  success_count: number;
  error_count: number;
  reject_comment: string;
  results: DeleteServiceSheetResult[];
}

export interface RefreshTableItem {
  service_sheet_number_generated: string;
  service_sheet_number: string;
  purchase_order_id: string;
  line_item: number;
  Service_Description: string;
  quantity: number;
  service_start_date: string;
  service_end_date: string;
  service_max_amount: number;
  process_datetime: string;
  external_reference_id: string | null;
  comments: string | string[];
  flag: string;
  process_status: "success" | "failed";
  reject_status: string | null;
  rejected_time: string | null;
  pr_version_reference: string | null;
}

export interface RefreshTableSummary {
  success_count: number;
  failed_count: number;
  total_processed: number;
  pending_count: number;
  last_updated: string;
  current_page?: number;
  page_size?: number;
  total_pages?: number;
  total_records?: number;
  filters_applied: {
    purchase_order_ids_count: number;
    service_start_from: string | null;
    service_start_to: string | null;
    from_date: string | null;
    to_date: string | null;
    flag_filter: string | null;
    process_status: string | null;
  };
}
export interface RefreshTableResponse {
  summary: RefreshTableSummary;
  data: RefreshTableItem[];
}
export interface AutoStart {
  status: string;
  message: string;
}

export interface FetchPoDetails {
  purchase_order_id: string;
  line_item: string;
  description: string;
  quantity: number;
  commodity_code: string;
  service_max_amount: number;
  service_start_date: string;
  service_end_date: string;
  need_by_date: string;
  unit_of_measure: string;
}
interface FetchPoDetailsResponse {
  data: FetchPoDetails[];
  count?: number;
}

interface PoNumberDataResponse {
  status: string;
  count: number;
  purchase_order_ids: string[];
}

export interface PoLineItemSubmitPayload {

  items: {

    purchase_order_ids: string;

    line_item: string;

  }[];

}



export interface PoLineItemSubmitResponse {

  message: string;

}





export interface SubmissionItem {

  id: number;

  po_number: string;

  line_item: string;

  submitted_date: string;

  flag: boolean;

}



export interface ViewSubmissionsPayload {

  flag?: number;       // 0=pending, 1=success, 2=failed

  po_number?: string;

  page?: number;

  page_size?: number;

}



export interface ViewSubmissionsResponse {

  status: string;

  pagination: {

    current_page: number;

    page_size: number;

    total_items: number;

    total_pages: number;

  };

  submissions: SubmissionItem[];

}

export const getPoNumber = async (
  service_start_date: string,
  service_end_date: string,
  supplier_id: string,
): Promise<string[]> => {

  const payload: {
    service_start_date?: string;
    service_end_date?: string;
    supplier_id?: string;
  } = {};
  if (service_start_date) {
    payload.service_start_date = service_start_date;
  }
  if (service_end_date) {
    payload.service_end_date = service_end_date;
  }
  if (supplier_id) {
    payload.supplier_id = supplier_id;
  }
  try {
    const response = await quickSesInstance.post<PoNumberDataResponse>(
      `/po_number_data`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    return response.data.purchase_order_ids || [];
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching PO numbers.",
    };
  }
};
export const getLineItem = async (
  purchase_order_ids: string[],
): Promise<any> => {
  try {
    const response = await quickSesInstance.post<any>(
      `/line_item_data`,
      {
        purchase_order_ids: purchase_order_ids,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching PO numbers.",
    };
  }
};
export const getTableData = async (
  purchase_order_ids: string[],
  line_items: string[],
): Promise<GetTableDataResponse> => {
  try {
    const response = await quickSesInstance.post<GetTableDataResponse>(
      `/table_data`,
      {
        purchase_order_ids: purchase_order_ids,
        line_items: line_items,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching PO numbers.",
    };
  }
};

export const getPurchaseOrder = async (
  purchase_order_ids: string[],
  line_items: string[],
): Promise<PurchaseOrderResponse> => {
  try {
    const response = await quickSesInstance.post<PurchaseOrderResponse>(
      `/process-purchase-order`,
      {
        purchase_order_ids,
        line_items,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching PO numbers.",
    };
  }
};

export const getServiceSheetNum = async (
  service_sheet_number_generated: string[],
): Promise<ServiceSheetResponse> => {
  try {
    const response = await sesComments.post<ServiceSheetResponse>(
      `/fetch_service_sheets`,
      { service_sheet_number_generated },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching service sheet.",
    };
  }
};

export const rejectServiceSheet = async (
  service_sheet_number_generated: string[],
  reject_comment: string,
): Promise<DeleteServiceSheetResponse> => {
  try {
    const response = await sesComments.post<DeleteServiceSheetResponse>(
      `/reject_service_sheet`,
      { service_sheet_number_generated, reject_comment },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching service sheet.",
    };
  }
};
export const updatedPoTable = async (filters?: {
  purchase_order_ids?: string[];
  service_start_from?: string;
  service_start_to?: string;
  process_status?: string;
  page?: number;
  page_size?: number;
  flag_filter?: string;
}) => {
  try {
    const payload: any = {};

    if (filters?.purchase_order_ids && filters.purchase_order_ids.length > 0) {
      payload.purchase_order_ids = filters.purchase_order_ids;
    }
    if (filters?.service_start_from) {
      payload.service_start_from = filters.service_start_from;
    }
    if (filters?.service_start_to) {
      payload.service_start_to = filters.service_start_to;
    }
    if (filters?.process_status && filters.process_status !== "All Status") {
      payload.process_status = filters.process_status;
    }
    if (filters?.page) {
      payload.page = filters.page;
    }
    if (filters?.page_size) {
      payload.page_size = filters.page_size;
    }

    const response = await sesComments.post<RefreshTableResponse>("refresh-table", payload, {
      withCredentials: true,
    });

    return {
      data: response.data.data || [],
      summary: response.data.summary || {},
    };
  } catch (error: any) {
    throw error;
  }
};
export const getPoDetails = async (
  po_number: string,
  line_item: string,
): Promise<FetchPoDetails[]> => {
  try {
    const response = await sesPoChange.get<FetchPoDetailsResponse>(
      "/purchase-order-data-table",
      {
        params: {
          po_number,
          line_item,
        },
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );

    return response.data.data;
  } catch (error: any) {
    if (error.response?.data) {
      const serverMessage =
        error.response.data.message ??
        error.response.data.description ??
        error.response.data.error;

      throw new Error(serverMessage || "Failed to fetch PO details");
    }
    throw new Error(error.message || "Failed to refresh table");
  }
};
export const poChangeSavings = async (
  payload: Partial<FetchPoDetails>,
): Promise<FetchPoDetails[]> => {
  try {
    const response = await sesPoChange.post<FetchPoDetailsResponse>(
      "/api/po-lines/save",
      payload,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      },
    );

    return response.data.data;
  } catch (error: any) {
    if (error.response?.data) {
      const serverMessage =
        error.response.data.message ??
        error.response.data.description ??
        error.response.data.error;

      throw new Error(serverMessage || "Failed to save PO details");
    }
    throw new Error(error.message || "Failed to save PO details");
  }
};
export const poChange = async (
  purchase_order_id: string,
  line_item: string,
): Promise<any> => {
  try {
    const response = await sesPoChange.post(
      "/change-po",
      {
        purchase_order_id,
        line_item,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const serverMessage =
        error.response.data.message ??
        error.response.data.description ??
        error.response.data.error;

      throw new Error(serverMessage || "Failed to fetch PO details");
    }
    throw new Error(error.message || "Failed to refresh table");
  }
};

export const autoStart = async (): Promise<AutoStart> => {
  try {
    const response = await sesPoChange.get<AutoStart>(`auto-start`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    )
    return response.data

  } catch (error: any) {
    if (error.response?.data) {
      const serverMessage =
        error.response.data.message ??
        error.response.data.description ??
        error.response.data.error;

      throw new Error(serverMessage || "Failed to autostart");
    }
    throw new Error(error.message || "Failed to autostart");
  }
}

export const autoStop = async (): Promise<AutoStart> => {
  try {
    const response = await sesPoChange.get<AutoStart>(`auto-stop`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    )
    return response.data

  } catch (error: any) {
    if (error.response?.data) {
      const serverMessage =
        error.response.data.message ??
        error.response.data.description ??
        error.response.data.error;

      throw new Error(serverMessage || "Failed to autoStop");
    }
    throw new Error(error.message || "Failed to autoStop");
  }
}
export const fetchSuppliers = async (payload?: PaginatedFilterPayload): Promise<SuppliersDTO | null> => {
  try {
    const params = {
      page: payload?.page || 1,
      page_size: payload?.page_size || 100,
      ...(payload?.search && { search: payload.search }),
    };

    const response = await quickSesInstance.post<{ value: string }[]>("/suppliers", {
      params,
    });

    const supplierStrings = response.data.map((item) => item.value);

    return {
      suppliers: supplierStrings,
      pagination: {
        page: params.page,
        page_size: params.page_size,
        total: supplierStrings.length,
        total_pages: 1,
      },
    };
  } catch (error) {

    return null;
  }
};

export const missingData = async (filters?: {
  purchase_order_ids?: string[];
  service_start_from?: string;
  service_start_to?: string;
  process_status?: string;
  page_index?: number;
  page_size?: number;
  flag_filter?: string;
}) => {
  try {
    const payload: any = {};

    if (filters?.purchase_order_ids && filters.purchase_order_ids.length > 0) {
      payload.purchase_order_ids = filters.purchase_order_ids;
    }
    if (filters?.service_start_from) {
      payload.service_start_from = filters.service_start_from;
    }
    if (filters?.service_start_to) {
      payload.service_start_to = filters.service_start_to;
    }
    if (filters?.process_status && filters.process_status !== "All Status") {
      payload.process_status = filters.process_status;
    }
    if (filters?.page_index) {
      payload.page_index = filters.page_index;
    }
    if (filters?.page_size) {
      payload.page_size = filters.page_size;
    }

    const response = await sesComments.post<RefreshTableResponse>("refresh-missing-table", payload, {
      withCredentials: true,
    });

    return {
      data: response.data.data || [],
      summary: response.data.summary || {},
    };
  } catch (error: any) {
    throw error;
  }
};

export const transferDatas = async (service_sheet_number_generated: string) => {
  const payload = {
    service_sheet_number_generated: service_sheet_number_generated
  };
  try {
    const response = await sesComments.post(`/transfer-single-service-sheet`, payload, { withCredentials: true });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const serverMessage =
        error.response.data.message ??
        error.response.data.description ??
        error.response.data.error;

      throw new Error(serverMessage || "Failed to transfer data");
    }
    throw new Error(error.message || "Failed to transfer data");
  }
}

export const submitPoLineItem = async (
  payload: PoLineItemSubmitPayload
): Promise<PoLineItemSubmitResponse> => {
  try {
    const response = await sesInstance.post<PoLineItemSubmitResponse>(
      `/po-line-item-submit`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while submitting PO line item.",
    };
  }
};



export const viewSubmissions = async (
  payload: ViewSubmissionsPayload = {}
): Promise<ViewSubmissionsResponse> => {
  try {
    const response = await sesInstance.post<ViewSubmissionsResponse>(
      `/submissions/view`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching submissions.",
    };
  }
};

export const openPr = async (pr_number: string): Promise<any> => {
  try {
    const response = await sesInstance.post<any>(
      `/open-pr`,
      { pr_number },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while opening PR.",
    };
  }
};

export interface PendingServiceSheetsResponse {
  status: string;
  total_pending: number;
  pending_service_sheets: string[];
  message: string;
}

export const getPendingServiceSheets = async (): Promise<PendingServiceSheetsResponse> => {
  try {
    const response = await sesComments.get<PendingServiceSheetsResponse>(
      `/pending-service-sheets`,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    throw {
      statusCode: error.response?.data?.status_code || 500,
      message: error.response?.data?.message || "Unknown error",
      description:
        error.response?.data?.description ||
        error.message ||
        "Something went wrong while fetching pending service sheets.",
    };
  }
};