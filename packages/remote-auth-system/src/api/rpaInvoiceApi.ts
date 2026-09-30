import rpaInstance from './rpaAxiosInstance';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

interface CustomerInvoiceRecord {
  No: number;
  po_number: number;
  supplier_invoice_no: string;
  customer_invoice_no: string;
  processed_date: string;
  flags: number;
}

interface FetchCustomerInvoicesResponse {
  status: string;
  message: string;
  data: CustomerInvoiceRecord[];
}

interface InvoiceResult {
  Purchase_Order_ID: string;
  Invoice_No: string;
  Customer_Invoice_ID: string;
  Message: string;
}

interface ExecuteInvoiceResponse {
  status: string;
  results: InvoiceResult[];
}

export const executeInvoiceProcessSync = async (pdfIds: string | number | (string | number)[]): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    // Convert array to comma-separated string if needed
    const pdfIdString = Array.isArray(pdfIds) 
      ? pdfIds.join(',') 
      : String(pdfIds);

    const response = await rpaInstance.post<ExecuteInvoiceResponse>(
      '/invoice-process/execute-pdf-sync',
      {
        pdf_id: pdfIdString,
        source: "manual"
      }
    );

    return {
      statusCode: response.status,
      message: `Invoice process executed successfully for PDF IDs: ${pdfIdString}`,
      description: JSON.stringify(response.data),
    } as SuccessResponseDto;

  } catch (error: any) {
    if (error.response) {
      const errData = error.response.data;
      return {
        statusCode: error.response.status || 500,
        message: (errData as any)?.message || 'Error executing invoice process',
        description: (errData as any)?.description || (errData as any)?.detail || JSON.stringify(errData),
      } as ErrorResponseDto;
    }

    if (error.request) {
      return {
        statusCode: 503,
        message: 'Network Error',
        description: 'Could not connect to the invoice processing service. Please check if the service is running.',
      } as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while executing the invoice process.',
    } as ErrorResponseDto;
  }
};


export const fetchCustomerInvoicesById = async (
  poNumber: number
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await rpaInstance.get<FetchCustomerInvoicesResponse>(
      '/invoice-process/fetch_Customer_Invoices_id',
      {
        params: {
          po_number: poNumber,
        },
      }
    );

    const {message, data } = response.data;

    return {
      statusCode: response.status,
      message: message || `${data.length} record(s) retrieved for PO Number: ${poNumber}`,
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
            : 'Invalid PO number provided',
        } as ErrorResponseDto;
      }

      return {
        statusCode: error.response.status || 500,
        message: (errData as any)?.message || 'Error fetching customer invoices',
        description: (errData as any)?.description || (errData as any)?.detail || JSON.stringify(errData),
      } as ErrorResponseDto;
    }

    if (error.request) {
      return {
        statusCode: 503,
        message: 'Network Error',
        description: 'Could not connect to the invoice service. Please check if the service is running.',
      } as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching customer invoices.',
    } as ErrorResponseDto;
  }
};
export const fetchSupplierInvoicesById = async (
  supplierInvoiceNo: string
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await rpaInstance.get<FetchCustomerInvoicesResponse>(
      '/invoice-process/fetch_Customer_Invoices_id',
      {
        params: {
          supplier_invoice_no: supplierInvoiceNo,
        },
      }
    );

    const {message, data } = response.data;

    return {
      statusCode: response.status,
      message: message || `${data.length} record(s) retrieved for PO Number: ${supplierInvoiceNo}`,
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
            : 'Invalid PO number provided',
        } as ErrorResponseDto;
      }

      return {
        statusCode: error.response.status || 500,
        message: (errData as any)?.message || 'Error fetching customer invoices',
        description: (errData as any)?.description || (errData as any)?.detail || JSON.stringify(errData),
      } as ErrorResponseDto;
    }

    if (error.request) {
      return {
        statusCode: 503,
        message: 'Network Error',
        description: 'Could not connect to the invoice service. Please check if the service is running.',
      } as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching customer invoices.',
    } as ErrorResponseDto;
  }
};