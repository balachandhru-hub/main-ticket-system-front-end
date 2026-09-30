// src/Dto/PRSyncDto.ts

export interface PRSyncResponseDto {
  statusCode: number;
  message: string;
  description?: string;
  data?: PRSyncDataDto[];
}

// DTO for individual PR records returned by sync
export interface PRSyncDataDto {
  requisitionsId: string;
  supplierName: string;
  currency: string;
  dueDate: string;
  requisitionsDate: string;
  amount: number;
  needBYDate: string;
  description: string;
  department: string;
  aribaTaskId: string;
  prTaxAmount: number;
  prNetAmount: number;
  contractId: string;
  companyUniqueName: string;
  requesterName: string;
  tasks: PRSyncTaskDto[];
  approvalHistory: PRSyncApprovalHistoryDto[];
  contract: PRSyncContractDto | null;
  attachments: string[];
  contractCurrency: string;
  contractValue: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
  workSpaceId: string;
  attachmentId: string;
  hasAttachment: boolean;
}

export interface PRSyncTaskDto {
  approvableId: string;
  approver: string;
  description: string;
  assignedDate: string;
  email: string;
  status: string;
  fullUrl: string;
  dueDate: string;
  approvableType: string;
  approvableUniqueName: string;
  attachments: string[];
}

export interface PRSyncApprovalHistoryDto {
  dateCreated: string;
  dateUpdated: string;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
  id: string;
  requisitionsId: string;
  aribaTaskId: string;
  approvalDate: string;
  aribaUser: string;
  comments: string;
  level: string;
  status: string;
}

export interface PRSyncContractDto {
  contractName: string;
  description: string;
  contractId: string;
  workspaceID: string;
  attachmentID: string;
  beginDate: string;
  endDate: string;
  totalAmount: string;
  amount: string;
  amountSpend: string;
  balanceAmount: string;
}