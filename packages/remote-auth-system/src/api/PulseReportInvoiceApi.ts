import axios from "axios";
import type {
  InvoiceDetailsResponse,
  InvoiceRecordExtended,
  InvoiceDetailsConsolidated,
  InvoicePaginationInfo,
} from "../Dto/PulseReportDashboardDto";
import { PrDashboardInstance } from "./PulseReportApi";

interface FilterResponse<T = string[]> {
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
   [key: string]: T | any;
}

const GrnSesDashboardInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_DASHBOARD_GRN_SES_URLS,
  headers: { "Content-Type": "application/json" },
});

const InvoiceDetailsInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_DASHBOARD_GRN_SES_URLS,
  headers: { "Content-Type": "application/json" },
});

const fetchFilter = async <T extends string[]>(
  endpoint: string,
  search: string = '',
  page: number = 1,
  pageSize: number = 100,
): Promise<{ items: T; hasMore: boolean }> => {
  try {
    const params: any = {
      page,
      page_size: pageSize,
    };

    // add search only if user typed something
    if (search.trim().length > 0) {
      params.search = search.trim();
    }
    const response = await GrnSesDashboardInstance.get<FilterResponse<T>>(
      `/filters/invoice/${endpoint}`,
     {params}
    );

  const dataKey = Object.keys(response.data).find(k => k !== 'pagination');
    const items = dataKey ? response.data[dataKey] || [] : [];
    const hasMore = response.data.pagination.page < response.data.pagination.total_pages;

    return { items, hasMore };
  } catch (error: any) {
    if (error?.response?.status === 401) window.location.href = '/';
    return { items: [] as unknown as T, hasMore: false };
  }
};

export const getInvoiceIds = (s: string, p: number) => fetchFilter('invoice-ids', s, p);
export const getRequesters = (s: string, p: number) => fetchFilter('requesters', s, p);
export const getCompanyCodes = (s: string, p: number) => fetchFilter('company-codes', s, p);
export const getInvoiceOrderIds = (s: string, p: number) => fetchFilter('invoice-order-ids', s, p);
export const getCommodityCodes = (s: string, p: number) => fetchFilter('commodity-codes', s, p);
export const getCostCenters = (s: string, p: number) => fetchFilter('cost-centers', s, p);

export const fetchInvoiceSummary = async (payload:any): Promise<any | null> => {
  try {
    const response = await GrnSesDashboardInstance.post<any>(
      "/summary/invoices",
      payload // ✅ sending empty payload
    );

    return response.data;
  } catch {
    return null;
  }
};


export const fetchInvoiceDetails = async (
  params: any
): Promise<InvoiceDetailsResponse | null> => {
  try {
    const payload = {
      invoice_ids: params.invoice_ids ?? [],
      supplier_filter: params.supplier_filter ?? [],
      requester_filter: params.requester_filter ?? [],
      company_code_filter: params.company_code_filter ?? [],
      department_filter: params.department_filter ?? [],
      cost_centers_filter: params.cost_centers_filter ?? [],
      gl_accounts_filter: params.gl_accounts_filter ?? [],
      invoice_order_ids: params.ir_ids ?? [],
      payment_ids: params.payment_ids ?? [],
      erp_payment_ids: params.erp_payment_ids ?? [],
      erp_payable_numbers: params.erp_payable_numbers ?? [],
      CommodityCodes:params?.CommodityCode ?? [],
      from_date: params.from_date ?? null,
      to_date: params.to_date ?? null,
      index: Math.max(1, params.index || 1),
      limit: Math.min(params.limit || 20, 200),
       ...(params.status && params.status.length > 0 && params.status[0] !== ""
    ? { status: params.status }
    : {}), 
    };

    const response = await InvoiceDetailsInstance.post<InvoiceDetailsResponse>(
      `/details/invoice`,
      payload
    );

    return response.data ?? null;
  } catch {
    return null;
  }
};


export const fetchInvoicesByIds = async (invoiceIds: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ invoice_ids: invoiceIds, index, limit });

export const fetchInvoicesByStatus = async (statuses: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ status: statuses, index, limit });

export const fetchInvoicesByRequester = async (requesters: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ requesters, index, limit });

export const fetchInvoicesByCompanyCode = async (companyCodes: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ company_codes: companyCodes, index, limit });

export const fetchInvoicesByDateRange = async (fromDate: string, toDate: string, index = 1, limit = 20) =>
  fetchInvoiceDetails({ from_date: fromDate, to_date: toDate, index, limit });

export const fetchInvoicesByCostCenter = async (costCenters: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ cost_centers: costCenters, index, limit });

export const fetchInvoicesByGLAccount = async (glAccounts: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ gl_accounts: glAccounts, index, limit });

export const fetchInvoicesByCommodityCode = async (commodityCodes: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ commodity_codes: commodityCodes, index, limit });

export const fetchInvoicesByOrderId = async (invoiceOrderIds: string[], index = 1, limit = 20) =>
  fetchInvoiceDetails({ invoice_order_ids: invoiceOrderIds, index, limit });

export const consolidateInvoiceResponse = (response: InvoiceDetailsResponse): InvoiceDetailsConsolidated => {
  const totalPages = Math.ceil(response.total_count / response.limit);
  const paginationInfo: InvoicePaginationInfo = {
    index: response.index,
    limit: response.limit,
    total_count: response.total_count,
    returned_count: response.returned_count,
    total_pages: totalPages,
    has_next: response.index < totalPages,
    has_previous: response.index > 1,
  };
  const amounts = response.records.map((r) => r.Amount);
  const summary = {
    total_amount: amounts.reduce((sum, a) => sum + a, 0),
    average_amount: amounts.length ? amounts.reduce((s, a) => s + a, 0) / amounts.length : 0,
    min_amount: amounts.length ? Math.min(...amounts) : 0,
    max_amount: amounts.length ? Math.max(...amounts) : 0,
  };
  return { pagination: paginationInfo, records: response.records, summary };
};

export const enrichInvoiceRecords = (records: any[]): InvoiceRecordExtended[] =>
  records.map((r) => {
    const submitDate = new Date(r.SubmitDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - submitDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...r,
      formatted_amount: formatCurrency(r.Amount),
      formatted_date: formatDate(r.SubmitDate),
      days_since_submit: daysDiff,
      is_recent: daysDiff <= 7,
    };
  });

export const formatCurrency = (amount: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

export const formatDateToISO = (date: Date): string => date.toISOString().split("T")[0];

export const calculatePaginationInfo = (
  totalCount: number,
  currentPage: number,
  pageSize: number
): InvoicePaginationInfo => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const returnedCount = Math.min(pageSize, totalCount - (currentPage - 1) * pageSize);
  return {
    index: currentPage,
    limit: pageSize,
    total_count: totalCount,
    returned_count: returnedCount > 0 ? returnedCount : 0,
    total_pages: totalPages,
    has_next: currentPage < totalPages,
    has_previous: currentPage > 1,
  };
};

export const filterInvoicesByAmountRange = (records: any[], min: number, max: number) =>
  records.filter((r) => r.Amount >= min && r.Amount <= max);

export const filterInvoicesByDateRangeInMemory = (records: any[], fromDate: string, toDate: string) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return records.filter((r) => {
    const d = new Date(r.SubmitDate);
    return d >= from && d <= to;
  });
};

export const groupInvoicesByStatus = (records: any[]) =>
  records.reduce((acc, r) => {
    const s = r.InvoiceStatusString;
    if (!acc[s]) acc[s] = [];
    acc[s].push(r);
    return acc;
  }, {} as Record<string, any[]>);

export const groupInvoicesByCompanyCode = (records: any[]) =>
  records.reduce((acc, r) => {
    const c = r.CompanyCode;
    if (!acc[c]) acc[c] = [];
    acc[c].push(r);
    return acc;
  }, {} as Record<string, any[]>);

export const groupInvoicesByRequester = (records: any[]) =>
  records.reduce((acc, r) => {
    const req = r.Requester;
    if (!acc[req]) acc[req] = [];
    acc[req].push(r);
    return acc;
  }, {} as Record<string, any[]>);

export const calculateTotalByStatus = (records: any[]) =>
  records.reduce((acc, r) => {
    const s = r.InvoiceStatusString;
    acc[s] = (acc[s] || 0) + r.Amount;
    return acc;
  }, {} as Record<string, number>);

export const calculateTotalByCompany = (records: any[]) =>
  records.reduce((acc, r) => {
    const c = r.CompanyCode;
    acc[c] = (acc[c] || 0) + r.Amount;
    return acc;
  }, {} as Record<string, number>);

export const getDefaultInvoiceSummary = () => ({
  "In Approval": 0,
  Reconciled: 0,
  Exceptions: 0,
  Paid: 0,
  Paying: 0,
  Failed: 0,
  Rejected: 0,
  Total: 0,
});


const createFilter = (endpoint: string) =>
  async (search = "", page = 1): Promise<{ items: string[]; hasMore: boolean }> => {
    try {
      const noParamsEndpoints = [
        "departments",
      ];
      const skipParams = noParamsEndpoints.some(ep => endpoint.includes(ep));

      if (endpoint.includes("requesters")) {
  const params: Record<string, any> = { page, page_size: 50 };
  if (search.trim()) params.search = search.trim();

  // ❗ Change GET → POST here
  const { data } = await GrnSesDashboardInstance.post<FilterResponse>(endpoint, params);

  const arrayKey = Object.keys(data).find(
    key => key !== "pagination" && Array.isArray(data[key])
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



      if (skipParams) {
        const { data } = await PrDashboardInstance.get<Record<string, any>>(endpoint);
        const array = Object.values(data).find(Array.isArray) || [];
        const items = array.filter((item): item is string => typeof item === "string");

        const filtered = search.trim()
          ? items.filter(item => item.toLowerCase().includes(search.toLowerCase()))
          : items;

        return { items: filtered, hasMore: false };
      }
         if (endpoint.includes("property")) {
        const { data } = await PrDashboardInstance.get<Record<string, any>>(endpoint);
      
        const array = Object.values(data) || [];
      
        const items = array.map((item: any) => item.value || "");
        const filtered = search.trim()
          ? items.filter(label => label.toLowerCase().includes(search.toLowerCase()))
          : items;
      
        return { items: filtered, hasMore: false };
      }

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
    } catch (error) {
      return { items: [], hasMore: false };
    }
  };


export const fetchSuppliers   = createFilter("/filters/suppliers"); 
export const fetchDepartments = createFilter("/filters/departments");  
export const fetchGLAccounts  = createFilter("/filters/gl-accounts");
export const fetchProperty  = createFilter("/filters/property");
export const fetchCostCenter  = createFilter("/filters/cost-centers");
export const fetchRequesters = createFilter("/filters/requesters"); 