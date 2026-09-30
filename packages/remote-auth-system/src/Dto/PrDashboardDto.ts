// ============ Summary Filter DTOs ============
export interface SummaryFilterDTO {
  supplier_filter?: string[];
  requester_filter?: string[];
  department_filter?: string[];
  company_code_filter?: string[];
  gl_accounts_filter?: string[];
  cost_centers_filter?: string[];
  from_date?: string;
  to_date?: string;
}


// ============ PR Summary DTOs ============

export interface PRSummaryResponseDTO {
  Ordered: number;
  Receiving: number;
  Received: number;
  Submitted: number;
  Composing: number;
  PendingApproval: number;
  Total: number;
  LastUpdatedAt: string;
}

export interface GrnSummaryResponseDTO {
  Completed: number;
  Syncing: number;
  InApproval: number;
  Failed: number;
  InProcess: number;
  Total: number;
  LastUpdatedAt: string;
}

// ============ SES Summary DTOs ============

export interface SesSummaryDTO {
  Composing: number;
  Submitted: number;
  Approved: number;
  Rejected: number;
  Processed: number;
  PartiallyInvoiced: number;
  Invoiced: number;
  ERPSystemDeclined: number;
  SendingToExternalSystem:number
  Total: number;
  LastUpdatedAt: string;
}

// ============ Invoice Summary DTOs ============

export interface InvoiceSummaryDTO {
  "In Approval": number;
  Reconciled: number;
  Exceptions: number;
  Paid: number;
  Paying: number;
  Failed: number;
  Rejected: number;
  Total: number;
  LastUpdatedAt: string;
}


export interface StatusSummaryDTO {
  Ordered: number;
  Receiving: number;
  Received: number;
  Submitted: number;
  Composing: number;
  PendingApproval: number;
  Total: number;
  LastUpdatedAt: string;
}


// export interface StatusSummaryGRNDTO {
//   Composing: number;
//   ERPSystemDeclined: number;
//   Invoiced: number;
//   Processed: number;
//   Rejected: number;
//   SendingToExternalSystem: number;
//   Submitted: number;
//   Total: number;
// }


// export interface StatusSummarySESDTO {
//   Composing: number;
//   ERPSystemDeclined: number;
//   Invoiced: number;
//   Processed: number;
//   Rejected: number;
//   SendingToExternalSystem: number;
//   Submitted: number;
//   Total: number;
// }

// export interface SESSummaryResponseDTO extends SesSummaryDTO {}


// export interface PRSummaryResponseDTO extends StatusSummaryDTO {}
// export interface PRSummaryRequestDTO extends SummaryFilterDTO {}
// export interface GrnSummaryResponseDTO extends GrnSummaryDTO {}
// export interface SESSummaryRequestDTO extends SummaryFilterDTO {}
// export interface GrnSummaryRequestDTO extends SummaryFilterDTO {}
// export interface InvoiceSummaryResponseDTO extends InvoiceSummaryDTO {}

// export interface InvoiceSummaryRequestDTO extends SummaryFilterDTO {}

// export interface InvoiceSummaryRequestDTO extends SummaryFilterDTO {}








// ============ GRN Details DTOs ============

export interface GrnTableDataDto {
  records: GrnDetailsRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface GrnDetailsRecord {
  [key: string]: any;
}

export interface GrnDetailsQueryParams {
  processed_states?: string[];
  receipt_ids?: string[];
  po_numbers?: string[];
  from_date?: string;
  to_date?: string;
  index?: number;
  limit?: number;
}

// ============ PR List DTOs ============

export interface PRListItemDTO {
  PR_Number: string;
  PR_Title: string;
  Status: string;
  Create_Date: string;
  Submit_Date: string;
  Preparer: string;
  Requester: string;
  Company_Code: string;
  Purchase_Org: string;
  Total_Cost: number;
  Tax_Amount: number;
  Currency: string;
  Need_By_Date: string;
  Last_Modified: string;
}

export interface PRListResponseDTO {
  current_page: number;
  page_size: number;
  total_pages: number;
  total_records: number;
  data: PRListItemDTO[];
}

export interface PRListQueryDTO {
  page: number;
  page_size?: number;
  activeStatus: string[] | null;
  status_filter?: string[] | null;
  material_filter?: string[] | null;
  cost_center_filter?: string[] | null;
  gl_account_filter?: string[] | null;
  ship_to_filter?: string[] | null;
  company_code_filter?: string[] | null;
  department_filter?: string[] | null;
  from_date?: string | null;
  to_date?: string | null;
  approval_filter?: boolean | null;
}

// ============ PR Line Items DTOs ============

export interface PRLineItem {
  Line_Number: string;
  Description: string;
  Quantity: number;
  UOM: string;
  Unit_Price: number;
  Total_Cost: number;
  Commodity_Code: string;
  Requester: string;
  Company_Code: string;
  Tax_Amount: number;
  Currency: string;
  Need_By_Date: string;
}

export interface PRLineItemsResponseDTO {
  pr_number: string;
  line_items: PRLineItem[];
}

// ============ Email & Reminder DTOs ============

export interface GroupEmails {
  [groupName: string]: string[];
}

export interface GroupEmailResponseDTO {
  group_emails: GroupEmails;
  active_groups: string[];
}

export interface SendReminderRequestDTO {
  pr_number: string;
  email_addresses: string[];
}

export interface ApiResponseDTO {
  status: string;
  message: string;
}