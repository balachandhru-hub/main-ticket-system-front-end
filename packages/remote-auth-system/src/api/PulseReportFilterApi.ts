import axios from "axios";

export const PrDashboardInstance = axios.create({
  baseURL: import.meta.env.VITE_PR_FILTER_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// ============ DTOs ============

export interface DepartmentsDTO {
  departments: string[];
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

export interface RequestorsDTO {
  requesters: string[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface PropertyOption {
  label: string;
  value: string;
}

export interface PropertiesDTO {
  properties: PropertyOption[];
}

export interface GLAccountsDTO {
  total: number;
  data: never[];
  gl_accounts: string[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface CostCentersDTO {
  cost_centers: string[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface RequestorsPayload {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface PaginatedFilterPayload {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface SupplierSearchRequest {
  suppliername?: string;
  page: number;
  page_size: number;
}

export interface SupplierItem {
  value: string;
}

export interface SupplierSearchResponse {
  data: SupplierItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export type SuppliersPostDTO = SupplierSearchResponse;

// ============ Fetch Functions ============

export const fetchDepartments = async (): Promise<DepartmentsDTO | null> => {
  try {
    const response = await PrDashboardInstance.get<DepartmentsDTO>("/filters/departments");
    return response.data;
  } catch (error) {
   
    return null;
  }
};


export const fetchSuppliers = async (payload?: PaginatedFilterPayload): Promise<SuppliersDTO | null> => {
  try {
    const params = {
      page: payload?.page || 1,
      page_size: payload?.page_size || 100,
      ...(payload?.search && { search: payload.search }),
    };

    const response = await PrDashboardInstance.get<SuppliersDTO>("/filters/suppliers", {
      params,
    });
    return response.data;
  } catch (error) {
   
    return null;
  }
};

export const fetchRequestors = async (payload?: RequestorsPayload): Promise<RequestorsDTO | null> => {
  try {
    const requestBody: RequestorsPayload = {
      page: payload?.page || 1,
      page_size: payload?.page_size || 100,
      search: payload?.search || "",
    };
    
    const response = await PrDashboardInstance.post<RequestorsDTO>("/filters/requesters", requestBody);
    return response.data;
  } catch (error) {
   
    return null;
  }
};

export const fetchProperties = async (): Promise<PropertiesDTO | null> => {
  try {
    const response = await PrDashboardInstance.get<PropertyOption[]>("/filters/property");
    return { properties: response.data };
  } catch (error) {
   
    return null;
  }
};

export const fetchGLAccounts = async (payload?: PaginatedFilterPayload): Promise<GLAccountsDTO | null> => {
  try {
    const params = {
      page: payload?.page || 1,
      page_size: payload?.page_size || 100,
      ...(payload?.search && { search: payload.search }),
    };

    const response = await PrDashboardInstance.get<GLAccountsDTO>("/filters/gl-accounts", {
      params,
    });
    return response.data;
  } catch (error) {
   
    return null;
  }
};

export const fetchCostCenters = async (payload?: PaginatedFilterPayload): Promise<CostCentersDTO | null> => {
  try {
    const params = {
      page: payload?.page || 1,
      page_size: payload?.page_size || 100,
      ...(payload?.search && { search: payload.search }),
    };

    const response = await PrDashboardInstance.get<CostCentersDTO>("/filters/cost-centers", {
      params,
    });
    return response.data;
  } catch (error) {
   
    return null;
  }
};


export const searchSuppliers = async (
  suppliername?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<SuppliersPostDTO | null> => {
  try {
    const payload: SupplierSearchRequest = {
      page,
      page_size: pageSize,
      ...(suppliername && { suppliername }),
    };

    const response = await PrDashboardInstance.post<SuppliersPostDTO>(
      "/suppliers",
      payload
    );

    return response.data;
  } catch (error) {

    return null;
  }
};