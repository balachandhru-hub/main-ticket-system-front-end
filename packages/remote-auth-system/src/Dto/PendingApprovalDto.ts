export interface ApprovalHistoryDto {
  dateCreated: string;
  dateUpdated: string;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
  id: string;
  invoiceID: string;
  aribaTaskId: string;
  approvalDate: string;
  aribaUser: string;
  comments: string;
  level: string;
  status: string;
}

export interface PendingApprovalDto {
  invoiceId: string;
  requisitionId: string;
  invoiceNumber: string;
  poNumber: string;
  epid: string;
  supplierName: string;
  companyUniqueName: string;
  invoiceAmount: number;
  currency: string;
  aribaTaskId: string;
  contractId: string;
  workSpaceId: string;
  attachmentId: string;
  description: string;
  department: string;
  totalAmount: string;
  contractValue: string;
  valueAlreadyPaid: string;
  remainingBalance: string;
  invoiceTaxAmount: number;
  invoiceNetAmount: number;
  dueDate: string;
  hasAttachment: boolean;
  contractCurrency: string;
  approver: string;
  approvalHistory: ApprovalHistoryDto[];
  status: string;
  fullUrl: string;
  glAccount?: string;
  paymentStatus?: string;
  costCenter?: string;
}

// File: Dto/RequisitionDetailsDto.ts

export interface AmountDto {
  amountInReportingCurrency: number;
  approxAmountInBaseCurrency: number;
  amount: number;
  conversionDate: string;
  currency: {
    uniqueName: string;
  };
}

export interface SupplierLocationDto {
  state: string;
  phone: string;
  country: {
    uniqueName: string;
  };
  postalCode: string;
  city: string;
  fax: string;
  uniqueName: string;
  name: string;
  lines: string;
}

export interface LineItemDto {
  invoiceLineNumber: number;
  description: string;
  amount: AmountDto;
  quantity: number;
}

export interface ApprovalRequestDto {
  state: string;
  approver: {
    uniqueName: string;
    passwordAdapter: string;
  };
  approvedBy: {
    uniqueName: string;
    passwordAdapter: string;
  };
  ruleName: string;
  activationDate: string;
}

export interface AttachmentDto {
  extension: string;
  contentType: string;
  uniqueAttachmentId: string;
  filename: string;
  id: string;
  contentLength: number;
}

export interface RequisitionDetailsDto {
  isNonPO: boolean;
  approvedState: string;
  initialUniqueName: string;
  submitDate: string;
  supplierLocation: SupplierLocationDto;
  createDate: string;
  name: string;
  remitToAddress: SupplierLocationDto;
  lastModified: string;
  timeCreated: string;
  totalCost: AmountDto;
  taxAmount: AmountDto;
  requester: {
    uniqueName: string;
    passwordAdapter: string;
  };
  invoiceNumber: string;
  totalInvoicedLessTax: AmountDto;
  remitToID: string;
  invoiceExternalStatusString: string;
  order: {
    uniqueName: string;
  };
  lineItems: LineItemDto[];
  totalWithholdingTax: AmountDto;
  invoiceOrigin: string;
  signed: boolean;
  previousApprovalRequestsVersion: number;
  purchaseOrg: {
    uniqueName: string;
  };
  isTaxInLine: boolean;
  approvalRequests: ApprovalRequestDto[];
  active: boolean;
  invoiceStatusString: string;
  invoiceSourceDocument: string;
  taxExchangeRate: number;
  headerLevel: boolean;
  uniqueName: string;
  totalInvoiced: AmountDto;
  category: number;
  invoiceSubmissionMethod: string;
  projectID: string;
  invoicePurpose: string;
  paymentTerms: {
    uniqueName: string;
  };
  attachments: AttachmentDto[];
  accountReceivableID: string;
  totalTax: AmountDto;
  supplier: {
    uniqueName: string;
    name: string;
  };
  invoiceDate: string;
  statusString: string;
  fullURL: string;
  approvalRequestsVersion: number;
  upperCaseInvoiceNumber: string;
  timeUpdated: string;
  versionNumber: number;
  type: string;
  projectTitle: string;
  invoiceOriginType: number;
  supplierName: string;
  requisitionID: string;
  approvableId: string;
  invoiceState: string;
  preparer: {
    uniqueName: string;
    passwordAdapter: string;
  };
  companyCode: {
    uniqueName: string;
  };
}

export interface InvoiceApprovalCommentDto {
  text: string;
  visibleToSupplier: boolean;
}

export interface InvoiceApprovalDto {
  state: string;
  comment: InvoiceApprovalCommentDto;
  approvedInvoiceAmount: number;
}

export interface PendingApprovalPRDto {
  amount: number;
  supplierName: string;
  requisitionId: string;
  companyUniqueName: string | null;
  department: string;
  description: string | null;
  glAccount?: string; 
  costCenter?: string;
  dueDate: string;
  contractId: string | null;
  contractValue: number | null;
  valueAlreadyPaid: number | null;
  remainingBalance: number | null;
  contractCurrency: string | null;
  currency: string;
  needBYDate: string;
  status: string;
  approvalHistory: ApprovalHistoryDto[];
  requisitionsId: string;
  requisitionsDate: string;
  aribaTaskId: string;
  hasAttachment: boolean;
  attachmentId: string | null;
  approver: string | null;
  fullUrl?: string;
  prNetAmount?: number;
  prTaxAmount?: number;
  requesterName?: string;
  totalAmount?: number | null;
  workSpaceId?: string | null;
}