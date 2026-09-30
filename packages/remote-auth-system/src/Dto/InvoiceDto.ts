export interface InvoiceItem {
  id: number;
  user_id: string;
  SupplierName: string | null;
  filename: string;
  pdf_id: number;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export interface CustomerGraphResponseDto {
  records: InvoiceItem[];
  status_counts: {
    pending: number;
    success: number;
    failed: number;
  };
}

export interface PdfBase64ResponseDto {
  file_base64?: string;
  base64?: string;
  pdf_base64?: string;
  [key: string]: any;
}

export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description: string;
}
