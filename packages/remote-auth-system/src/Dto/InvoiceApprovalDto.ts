// ============================================
// Invoice Approval Options DTO
// ============================================
export interface InvoiceApprovalOptions {
  comment: string;
}

// ============================================
// Invoice Approval DTO
// ============================================
export interface InvoiceApprovalDto {
  actionableType: string; // "Task"
  uniqueName: string; // Contract ID / Task ID
  actionName: string; // "Approve" or "Reject"
  options: InvoiceApprovalOptions;
}

// ============================================
// Error Response DTO
// ============================================
export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description: string;
}

// ============================================
// Success Response DTO
// ============================================
export interface SuccessResponseDto {
  statusCode?: number;
  message?: string;
  description?: string;
  data?: any;
  success?: boolean;
}