import sesInstance from './sesAxiosInstance';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { FetchTableDataResponse, TableRowData } from '../Dto/SesTableDataDto';
/**
 * API Response Types
 */
export interface PONumberResponse {
  data: string[];
  success: boolean;
  message?: string;
}

export interface LineItemResponse {
  data: Array<{
    poNumber: string;
    lineItem: string;
  }>;
  success: boolean;
  message?: string;
}

export interface LineItem {
  lineItem: string;
  unitOfMeasure: string;
  quantity: number;
  price?: number;
  receiptId: string;
  result: string;
  correctionSheet: string;
  extReferenceNo: string;
  date: string;
  materialCode?: string;
}

export interface PODetail {
  purchaseOrderId: string;
  lineItems: LineItem[];
}

export interface PODetailsResponse {
  data: PODetail[];
  success: boolean;
  message?: string;
}

/**
 * Fetch all PO Numbers
 * POST /po_number_data
 * 
 * Returns a JSON array with every distinct purchase_order_id,
 * sorted alphabetically.
 */
export const fetchPONumbers = async (): Promise<string[]> => {
  try {
    const response = await sesInstance.post<any>("/po_number_data", {});
    
    // Assuming the API returns the array directly as shown in the example
    // If it's wrapped in a data object, adjust accordingly
    if (Array.isArray(response.data?.purchase_order_ids)) {
      return response.data.purchase_order_ids;
    }
    
    // If response has a different structure, adjust here
    return [];
  } catch (error: any) {
    
    
    // Better error messages for different error types
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      throw new Error(
        "Network error: Unable to connect to the server. Please check if the backend is running and CORS is enabled."
      );
    }
    
    if (error.response?.status === 401) {
      throw new Error("Unauthorized: Please login again.");
    }
    
    if (error.response?.status === 403) {
      throw new Error("Forbidden: You don't have permission to access this resource.");
    }
    
    if (error.response?.status === 500) {
      throw new Error("Server error: Please contact support.");
    }
    
    throw new Error(
      error?.response?.data?.message || 
      error?.message ||
      "Failed to fetch PO numbers. Please try again."
    );
  }
};

/**
 * Search PO Numbers (if you have a search endpoint)
 * If not, you can filter on the client side after fetching all PO numbers
 */
export const searchPONumbers = async (searchTerm: string): Promise<string[]> => {
  try {
    // If you have a dedicated search endpoint, use it here
    // Otherwise, fetch all and filter client-side
    const allPONumbers = await fetchPONumbers();
    
    if (!searchTerm.trim()) {
      return allPONumbers;
    }
    
    return allPONumbers.filter((po) =>
      po.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error: any) {
    
    throw new Error(
      error?.response?.data?.message || 
      "Failed to search PO numbers. Please try again."
    );
  }
};

// Additional API functions will be added here as we continue
// Example structure for future endpoints:

/**
 * Fetch Line Items for a specific PO Number
 * POST /line_item_data
 * 
 * Returns a JSON array with every line_item that belongs to the
 * supplied purchase_order_id, ordered ascending.
 * 
 * @param purchaseOrderId - The PO number to fetch line items for
 * @returns Array of line item numbers (as strings or numbers)
 */
export const fetchLineItemsByPO = async (
  purchaseOrderId: string
): Promise<string[]> => {
  try {
    if (!purchaseOrderId || !purchaseOrderId.trim()) {
      throw new Error("Purchase Order ID is required");
    }

    const response = await sesInstance.post<string[]>("/line_item_data", {
      purchase_order_id: purchaseOrderId.trim()
    });
    
    // API returns array of line items directly
    if (Array.isArray(response.data)) {
      // Convert to strings if they're numbers
      return response.data.map(item => String(item));
    }
    
    return [];
  } catch (error: any) {
    
    // Handle specific error cases
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      throw new Error(
        "Network error: Unable to connect to the server. Please check your connection."
      );
    }
    
    if (error.response?.status === 404) {
      throw new Error(`No line items found for PO: ${purchaseOrderId}`);
    }
    
    if (error.response?.status === 400) {
      throw new Error("Invalid Purchase Order ID provided.");
    }
    
    if (error.response?.status === 401) {
      throw new Error("Unauthorized: Please login again.");
    }
    
    if (error.response?.status === 500) {
      throw new Error("Server error: Please contact support.");
    }
    
    throw new Error(
      error?.response?.data?.detail || 
      error?.response?.data?.message || 
      error?.message ||
      "Failed to fetch line items. Please try again."
    );
  }
};

/**
 * Fetch Line Items for multiple PO Numbers
 * This is a helper function that calls fetchLineItemsByPO for each PO
 * and combines the results.
 * 
 * @param poNumbers - Array of PO numbers
 * @returns Array of objects with poNumber and lineItem
 */
export const fetchLineItemsForMultiplePOs = async (
  poNumbers: string[]
): Promise<Array<{ poNumber: string; lineItem: string }>> => {
  try {
    if (!poNumbers || poNumbers.length === 0) {
      return [];
    }

    // Fetch line items for all POs in parallel
    const promises = poNumbers.map(async (poNumber) => {
      try {
        const lineItems = await fetchLineItemsByPO(poNumber);
        return lineItems.map(lineItem => ({
          poNumber,
          lineItem
        }));
      } catch (error) {
       
        return []; // Return empty array for failed POs
      }
    });

    const results = await Promise.all(promises);
    
    // Flatten the array of arrays
    return results.flat();
  } catch (error: any) {
    
    throw new Error(
      error?.message || 
      "Failed to fetch line items for selected PO numbers."
    );
  }
};


export const fetchTableData = async (
  purchaseOrderId: string,
  lineItem: string = "all"
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await sesInstance.post<FetchTableDataResponse>(
      '/table_data',
      {
        purchase_order_id: purchaseOrderId,
        line_item: lineItem
      }
    );

    const { data, total_rows } = response.data;

    return {
      statusCode: response.status,
      message: `${total_rows} record(s) retrieved for PO Number: ${purchaseOrderId}`,
      description: JSON.stringify(data),
    } as SuccessResponseDto;

  } catch (error: any) {
    if (error.response) {
      const errData = error.response.data;
      
      // Handle validation errors (422)
      if (error.response.status === 422) {
        return {
          statusCode: 422,
          message: 'Validation Error',
          description: (errData as any)?.detail 
            ? JSON.stringify((errData as any).detail) 
            : 'Invalid purchase order ID or line item provided',
        } as ErrorResponseDto;
      }

      return {
        statusCode: error.response.status || 500,
        message: (errData as any)?.message || 'Error fetching table data',
        description: (errData as any)?.description || (errData as any)?.detail || JSON.stringify(errData),
      } as ErrorResponseDto;
    }

    if (error.request) {
      return {
        statusCode: 503,
        message: 'Network Error',
        description: 'Could not connect to the table data service. Please check if the service is running.',
      } as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching table data.',
    } as ErrorResponseDto;
  }
};

/**
 * Fetch table data for multiple PO Numbers
 * Returns combined data with additional empty fields
 */
export const fetchMultipleTableData = async (
  purchaseOrderIds: string[]
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const allData: TableRowData[] = [];
    let totalRows = 0;

    // Fetch data for each PO
    for (const poId of purchaseOrderIds) {
      const response = await sesInstance.post<FetchTableDataResponse>(
        '/table_data',
        {
          purchase_order_id: poId,
          line_item: "all"
        }
      );

      // Transform the data to include empty fields
      const transformedData: TableRowData[] = response.data.data.map(item => ({
        ...item,
        ss_id: "", // Empty for now
        result: "", // Empty for now
        correction_sheet_no: "", // Empty for now
        external_reference_no: "" // Empty for now
      }));

      allData.push(...transformedData);
      totalRows += response.data.total_rows;
    }

    return {
      statusCode: 200,
      message: `${totalRows} record(s) retrieved for ${purchaseOrderIds.length} PO(s)`,
      description: JSON.stringify(allData),
    } as SuccessResponseDto;

  } catch (error: any) {
    if (error.response) {
      const errData = error.response.data;
      
      // Handle validation errors (422)
      if (error.response.status === 422) {
        return {
          statusCode: 422,
          message: 'Validation Error',
          description: (errData as any)?.detail 
            ? JSON.stringify((errData as any).detail) 
            : 'Invalid purchase order IDs provided',
        } as ErrorResponseDto;
      }

      return {
        statusCode: error.response.status || 500,
        message: (errData as any)?.message || 'Error fetching table data for multiple POs',
        description: (errData as any)?.description || (errData as any)?.detail || JSON.stringify(errData),
      } as ErrorResponseDto;
    }

    if (error.request) {
      return {
        statusCode: 503,
        message: 'Network Error',
        description: 'Could not connect to the table data service. Please check if the service is running.',
      } as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching table data for multiple POs.',
    } as ErrorResponseDto;
  }
};

