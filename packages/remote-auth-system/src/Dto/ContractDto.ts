export interface ContractEditDto {
  description: string;
  contractValue: string;

}

// ============================================
// Error Response
// ============================================
export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description: string;
}


export interface ApprovalHistoryDTO {
  id: string;
  workspaceId?: string | null;
  contractId?: string | null;
  taskId: string;
  approvalDate?: string | null;
  aribaUser?: string | null;
  comments?: string | null;
  level?: string | null; // Can be "Level 1" or null
  status: string; // "Pending", "Approved", etc.
  dateCreated: string;
  dateUpdated: string;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
  approver: string;
}

export interface ContractApprovalDto {
  contractTaskId: string;
  contractId?: string | null;
  beginDate: string; // ISO date string
  endDate?: string | null; // ISO date string
  totalAmount: number; // Changed from optional to required based on response
  currency?: string | null;
  workspaceID: string;
  attachmentID: string;
  materialCode?: string | null;
  commodityCode?: string | null;
  description: string;
  supplierID?: string | null;
  supplierName?: string | null;
  amountSpend?: number | null;
  balanceAmount?: number | null;
  department?: string | null;
  approver: string;
  fullUrl?: string; // Added - present in response
  companyUniqueName?: string | null;
  tasks: any[];
  approvalHistory: ApprovalHistoryDTO[];
  status: string | null;
  attachments: any[];
}