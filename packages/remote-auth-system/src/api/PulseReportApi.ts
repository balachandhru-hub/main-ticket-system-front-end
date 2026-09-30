import axios from "axios";
import type {
  SesSummaryDTO,
  InvoiceSummaryDTO,
  SummaryFilterDTO,
  PRSummaryResponseDTO,
  GrnSummaryResponseDTO,
} from "../Dto/PrDashboardDto";
import type { GrnTableDataDto, GrnDetailsQueryParams } from "../Dto/GrnTableDataDto";
import { toast } from "react-toastify";

// ============ Axios Instances ============

export const GrnSesDashboardInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_DASHBOARD_GRN_SES_URLS,
  headers: {
    "Content-Type": "application/json",
  },
});

export const PrDashboardInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_FILTER_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
export const PrDashboardInstancePr = axios.create({
  baseURL: import.meta.env.VITE_PR_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
// ============ Summary APIs ============

export const fetchPRSummary = async (
  filters?: SummaryFilterDTO
): Promise<PRSummaryResponseDTO | null> => {
  try {
    const body = filters ?? {};
    const response = await PrDashboardInstancePr.post<PRSummaryResponseDTO>(
      "/summary/pr",
      body
    );

    return response.data;
  } catch (error) {
     toast.error("Error fetching PR Summary");
    return null;
  }
};

export const fetchGRNSummary = async (
  filters?: SummaryFilterDTO
): Promise<GrnSummaryResponseDTO | null> => {
  try {
    const body = filters ?? {};
    const response = await PrDashboardInstance.post<GrnSummaryResponseDTO>(
      "/summary/grn",
      body
    );

    return response.data;
  } catch (error: any) {
    toast.error("Error fetching GRN Summary");
    return null;
  }
};

export const fetchSesSummary = async (
  filters?: SummaryFilterDTO
): Promise<SesSummaryDTO | null> => {
  try {
    const body = filters ?? {};
    const response = await PrDashboardInstance.post<SesSummaryDTO>(
      "/summary/ses",
      body
    );

    return response.data;
  } catch (error: any) {
     toast.error("Error fetching SES Summary");
    return null;
  }
};

export const fetchInvoiceSummary = async (
  filters?: SummaryFilterDTO
): Promise<InvoiceSummaryDTO | null> => {
  try {
    const body = filters ?? {};
    const response = await PrDashboardInstance.post<InvoiceSummaryDTO>(
      "/summary/invoices",
      body
    );

    return response.data;
  } catch (error: any) {
     toast.error("Error fetching Invoice Summary");
    return null;
  }
};

// ============ GRN Details API ============

export const fetchGrnDetails = async (
  params: GrnDetailsQueryParams
): Promise<GrnTableDataDto | null> => {
  try {
    const queryParams = new URLSearchParams();

    if (params.processed_states?.length) {
      params.processed_states.forEach((state) => {
        if (state && state !== "") {
          queryParams.append("processed_states", state);
        }
      });
    }

    if (params.receipt_ids?.length) {
      params.receipt_ids.forEach((id) => {
        if (id && id.trim()) {
          queryParams.append("receipt_ids", id.trim());
        }
      });
    }

    if (params.po_numbers?.length) {
      params.po_numbers.forEach((po) => {
        if (po && po.trim()) {
          queryParams.append("po_numbers", po.trim());
        }
      });
    }

    if (params.from_date && params.to_date) {
      queryParams.append("from_date", params.from_date);
      queryParams.append("to_date", params.to_date);
    }

    queryParams.append("index", String(params.index || 1));
    queryParams.append("limit", String(params.limit || 20));

    const finalUrl = `/details/grn?${queryParams.toString()}`;

    const response = await GrnSesDashboardInstance.get<GrnTableDataDto>(
      finalUrl
    );

    return response.data;
  } catch (error: any) {
      toast.error("Error fetching GRN details");
    if (error.response) {
      toast.error('Failed to fetch GRN details');
    }
    return null;
  }
};

// ============ Default Values ============

export const getDefaultPRSummary = (): PRSummaryResponseDTO => {
  return {
    Ordered: 0,
    Receiving: 0,
    Received: 0,
    Submitted: 0,
    Composing: 0,
    PendingApproval: 0,
    Total: 0,
    LastUpdatedAt: "",
  };
};

export const getDefaultGrnSummary = (): GrnSummaryResponseDTO => {
  return {
    Completed: 0,
    Syncing: 0,
    InApproval: 0,
    Failed: 0,
    InProcess: 0,
    Total: 0,
    LastUpdatedAt: "",
  };
};

export const getDefaultSesSummary = (): SesSummaryDTO => {
  return {
    Composing: 0,
    Submitted: 0,
    Approved: 0,
    Rejected: 0,
    Processed: 0,
    PartiallyInvoiced: 0,
    Invoiced: 0,
    ERPSystemDeclined: 0,
    SendingToExternalSystem: 0,
    Total: 0,
    LastUpdatedAt: "",
  };
};

export const getDefaultInvoiceSummary = (): InvoiceSummaryDTO => {
  return {
    "In Approval": 0,
    Reconciled: 0,
    Exceptions: 0,
    Paid: 0,
    Paying: 0,
    Failed: 0,
    Rejected: 0,
    Total: 0,
    LastUpdatedAt: "",
  };
};