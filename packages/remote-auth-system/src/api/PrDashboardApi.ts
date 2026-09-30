import axios from "axios";
import type { ApiResponseDTO, GroupEmailResponseDTO, PRLineItemsResponseDTO, SendReminderRequestDTO, StatusSummaryDTO } from "../Dto/PrDashboardDto";
import { PrDashboardInstance } from "./PulseReportApi";

const PeDashboardinstance = axios.create({
  baseURL:import.meta.env.VITE_PR_URL,
//   timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
//   withCredentials: true
});
interface FilterResponse<T = string[]> {
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
   [key: string]: T | any;
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
export const dashBoardSummary = async (
  payload: any
): Promise<StatusSummaryDTO | null> => {
  try {
    const response = await PeDashboardinstance.post<StatusSummaryDTO>(
      "summary/pr",
      payload  // ✅ send payload as body
    );

    return response.data;
  } catch (error) {
    return null;
  }
};


export const getPRList = async ({
  page,
  page_size = 20,
  status_filter,
  material_filter,
  cost_center_filter,
  gl_account_filter,
  ship_to_filter,
  company_code_filter,
  department_filter,
  supplier_filter,
  requester_filter,
  from_date,
  to_date,
  approval_filter = false,
}: any): Promise<any> => {
  try {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, page_size), 100);

    const payload: Record<string, any> = {
      page: safePage,
      page_size: safePageSize,
      approval_filter,
    };

    if (status_filter?.length) payload.status_filter = status_filter;
    if (material_filter?.length) payload.material_filter = material_filter;
    if (cost_center_filter?.length) payload.cost_center_filter = cost_center_filter;
    if (gl_account_filter?.length) payload.gl_account_filter = gl_account_filter;
    if (ship_to_filter?.length) payload.ship_to_filter = ship_to_filter;
    if (company_code_filter?.length) payload.company_code_filter = company_code_filter;
    if (department_filter?.length) payload.department_filter = department_filter;
 if (supplier_filter?.length) payload.supplier_filter = supplier_filter;
  if (requester_filter?.length) payload.requester_filter = requester_filter;
    if (from_date) payload.from_date = from_date;
    if (to_date) payload.to_date = to_date;

    const response = await PeDashboardinstance.post<any | null>(
      `api/pr_list`,
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


export const fetchPRLineItems = async (pr_number: string) => {
  try {
    const response = await PeDashboardinstance.post<PRLineItemsResponseDTO>(
      `api/pr_line_items`,
      {
        pr_number,   // sending in body instead of query param
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};


 export const getGroupEmails = async (pr_number: string): Promise<GroupEmailResponseDTO> => {
  try {
    const response = await PeDashboardinstance.post<GroupEmailResponseDTO>(
      "/api/get_group_emails",
      { pr_number } // ✅ send as body
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

 export const sendReminders = async (
  payload: SendReminderRequestDTO
): Promise<ApiResponseDTO> => {
  try {
    const response = await PeDashboardinstance.post<ApiResponseDTO>(
      "api/send_reminder",
      payload
    );
    return response.data;
  } catch (error: any) {
     throw error;
  }
};


export const getPrFilter = async (
  endpoint:
    | "commodity_codes"
    | "deliver_to"
    | "company_codes"
    | "cost_centers"
    | "gl_accounts"
    | "departments"
    | "/filters/suppliers"
    |"/filters/ses/requesters",
  search = "",
  page = 1
): Promise<{ items: string[]; hasMore: boolean }> => {
  try {
      const noParamsEndpoints = [
        "/filters/suppliers",
        "/filters/ses/requesters",
      ];
      const skipParams = noParamsEndpoints.some(ep => endpoint.includes(ep));
    if(skipParams){
       const params: Record<string, any> = { page, page_size: 50 };
            if (search.trim()) params.search = search.trim();
      
            const { data } = await PrDashboardInstance.get<FilterResponse>(endpoint, { params });
            const arrayKey = Object.keys(data).find(key => 
              key !== "pagination" && Array.isArray(data[key])
            );
      
            const array = arrayKey ? data[arrayKey] : [];
            const items = array.map((item: any) => {
              if (typeof item === "string") return item;
              return item.name || item.id || item.code || String(item);
            });
      
            const hasMore = data.pagination
              ? data.pagination.page < data.pagination.total_pages
              : false;
      
            return { items, hasMore };
    }
    const response = await PeDashboardinstance.get<any>(`/api/filter/${endpoint}`);

    const items = response.data.values || [];

    return { items, hasMore: false };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      window.location.href = "/";
    }    return { items: [], hasMore: false };
  }
};