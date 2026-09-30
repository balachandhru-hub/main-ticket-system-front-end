import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.VITE_SPEND_ANALYSIS,
  timeout: 500000,
  headers: {
    'Accept': '*/*',
  },
  withCredentials: true
});

// 30-second TTL in-memory cache & in-flight request deduplication map to eliminate duplicate network calls
const apiCache = new Map<string, { timestamp: number; data: any }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 30 * 1000;

export const cachedPost = async (url: string, data: any, config?: any): Promise<any> => {
  const cacheKey = `${url}:${JSON.stringify(data || {})}`;
  const now = Date.now();
  
  // 1. Check in-memory cache
  const cached = apiCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // 2. Check if identical request is already in-flight (deduplication)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Fire request & track in-flight promise
  const requestPromise = (async () => {
    try {
      const executeRequest = async (retriesLeft: number): Promise<any> => {
        try {
          const response = await client.post(url, data, config);
          return response.data;
        } catch (error: any) {
          if (retriesLeft > 0 && error.response && error.response.status >= 500) {
            console.warn(`Server error for ${url}. Retrying in 1s...`);
            await new Promise(res => setTimeout(res, 1000));
            return executeRequest(retriesLeft - 1);
          }
          throw error;
        }
      };

      const result: any = await executeRequest(1); // 1 retry
      if (result && (result.status === 'success' || result.status === 200 || Array.isArray(result) || result.data)) {
        apiCache.set(cacheKey, { timestamp: Date.now(), data: result });
      }
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export const clearApiCache = () => {
  apiCache.clear();
  inFlightRequests.clear();
};

export const fetchOutlets = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/Outlets', params);
  } catch (err) {
    console.log("error to fetch outlets", err);
  }
};

export const fetchCostCenters = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/CostCenters', params);
  } catch (err) {
    console.log("error to fetch cost centers", err);
  }
};

export const fetchKPI = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/KPI', params);
};

export const fetchSpendMaterials = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/Materials', params);
};

export const fetchSpendSuppliers = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/Suppliers', params);
};

export const fetchAbcAnalysis = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/AbcAnalysis', params);
};

export const fetchSpendServices = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/Services', params);
};

export const fetchMonthlySpendTrend = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/MonthlySpendTrend', params);
};

export const fetchOutletSpendVariance = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/OutletSpendVariance', params);
};

export const fetchSpendForecast = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/Forecast', params);
};

export const fetchPurchaseFrequency = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/PurchaseFrequency', params);
};

export const fetchMaterialVariance = async (params: {
  type?: string;
  start_date?: string;
  end_date?: string;
  outlet?: string;
  cost_center?: string;
  supplier_name?: any;
  material_name?: any;
  material_code?: any;
  material_group?: string;
  anomaly_threshold?: number;
  page?: number;
  page_size?: number;
  baseline_month?: string;
  status?: string;
  [key: string]: any;
}): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/MaterialVariance', params);
};

export const fetchMaterialVarianceReason = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/MaterialVarianceReason', params);
  } catch (err) {
    console.log("error to fetch material variance reason", err);
  }
};

export const fetchSpendByCategory = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/SpendByCategory', params);
};

export const fetchSpendByOutlet = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/SpendByOutlet', params);
};

export const fetchSpendByType = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/SpendByType', params);
};

export const fetchUnitPriceTrend = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/UnitPriceTrend', params);
  } catch (err) {
    console.log("unit price error", err);
  }
};

export const fetchDailySpendTrend = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/DailySpendTrend', params);
  } catch (err) {
    console.log("error to fetch daily spend trend", err);
  }
};

export const fetchUnitPriceOutlierAnalysis = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/UnitPriceOutlierAnalysis', params);
  } catch (err) {
    console.log("error to fetch unit price outlier analysis", err);
  }
};

export const fetchQuantityTrend = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/QuantityTrend', params);
};

export const fetchQuantityDetails = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/QuantityDetails', params);
  } catch (err) {
    console.log("error to fetch quantity details", err);
  }
};

export const fetchSpendByMaterialDetail = async (params: any): Promise<any> => {
  return await cachedPost('api/spend_analysis/api/v1/SpendByMaterialDetail', params);
};

export const fetchMaterialGroups = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/MaterialGroups', params);
  } catch (err) {
    console.log("error to fetch material groups", err);
  }
};

export const fetchMaterialsDetails = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/MaterialsDetails', params);
  } catch (err) {
    console.log("error to fetch materials details", err);
  }
};

export const fetchSpendBySupplier = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/SpendBySupplier', params);
  } catch (err) {
    console.log("error to fetch spend by supplier", err);
  }
};

export const fetchSupplierDetails = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/SupplierDetails', params);
  } catch (err) {
    console.log("error to fetch supplier details", err);
  }
};

export const fetchCategoryDetails = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/CategoryDetails', params);
  } catch (err) {
    console.log("error to fetch category details", err);
  }
};

export const fetchOutletDetails = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/OutletDetails', params);
  } catch (err) {
    console.log("error to fetch outlet details", err);
  }
};

export const saveSavingsMode = async (params: {
  type?: string;
  material_name: string;
  supplier_name: string;
  flag: number;
}): Promise<any> => {
  try {
    clearApiCache();
    const response = await client.post('api/spend_analysis/api/v1/SavingsMode', {
      type: 'PROCUREMENT_PERFORMANCE',
      ...params
    });
    return response.data;
  } catch (err) {
    console.log("error in saveSavingsMode", err);
  }
};

export const saveBulkSavingsMode = async (params: {
  type?: string;
  material_name: string;
  supplier_name: string[];
  flag: number;
  outlet?: string;
  cost_center?: string;
  material_group?: string;
  start_date?: string;
  end_date?: string;
}): Promise<any> => {
  try {
    clearApiCache();
    const response = await client.post('api/spend_analysis/api/v1/BulkSavingsMode', {
      type: 'PROCUREMENT_PERFORMANCE',
      ...params
    });
    return response.data;
  } catch (err) {
    console.log("error in saveBulkSavingsMode", err);
  }
};

export const fetchFrequencyMonthlyAnalysis = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/FrequencyMonthlyAnalysis', params);
  } catch (err) {
    console.log("error to fetch frequency monthly analysis", err);
  }
};

export const fetchKraljicMatrixAnalysis = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/KraljicMatrixAnalysis', {
      type: 'PROCUREMENT_PERFORMANCE',
      ...params
    });
  } catch (err) {
    console.log("error in fetchKraljicMatrixAnalysis", err);
  }
};

export const fetchSavingsModeHistory = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/SavingsModeHistory', {
      type: 'PROCUREMENT_PERFORMANCE',
      ...params
    });
  } catch (err) {
    console.log("error in fetchSavingsModeHistory", err);
  }
};

export const fetchUnitPriceDetails = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/unitpriceDetails', {
      type: 'PROCUREMENT_PERFORMANCE',
      ...params
    });
  } catch (err) {
    console.log("error in fetchUnitPriceDetails", err);
  }
};

export interface RaiseTicketPayload {
  type?: string;
  message_id?: number | string;
  from: string;
  to: string;
  title: string;
  message: string;
  supplier_name?: string;
  material_name?: string;
}

export const raiseTicket = async (payload: RaiseTicketPayload): Promise<any> => {
  try {
    const response = await client.post('api/spend_analysis/api/v1/raiseTicket', payload);
    return response.data;
  } catch (err) {
    console.log("error in raiseTicket", err);
    throw err;
  }
};

export interface GetAllMessagesPayload {
  message_id?: number | string;
  from?: string;
  to?: string;
  created_from?: string;
  created_to?: string;
}

export const getAllMessages = async (payload: GetAllMessagesPayload): Promise<any> => {
  try {
    const cleanPayload: any = {};
    if (payload) {
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 0) {
          cleanPayload[k] = v;
        }
      });
    }
    return await cachedPost('api/spend_analysis/api/v1/GetAllMessages', cleanPayload);
  } catch (err) {
    console.log("error in getAllMessages", err);
    throw err;
  }
};

export interface UpdateTicketPayload {
  message_id: number | string;
  from?: string;
  to?: string;
  add?: string;
  message?: string;
  status?: string;
}

export const updateTicket = async (payload: UpdateTicketPayload): Promise<any> => {
  try {
    const response = await client.post('api/spend_analysis/api/v1/UpdateTicket', payload);
    return response.data;
  } catch (err) {
    console.log("error in updateTicket", err);
    throw err;
  }
};

export const fetchLookupRequesters = async (params: any): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/lookupRequesters', params);
  } catch (err) {
    console.log("error in fetchLookupRequesters", err);
  }
};

export const fetchMaterialComparison = async (params: {
  type?: string;
  material_name: string[];
  [key: string]: any;
}): Promise<any> => {
  try {
    return await cachedPost('api/spend_analysis/api/v1/material_comparison', params);
  } catch (err) {
    console.log("error in fetchMaterialComparison", err);
    throw err;
  }
};
