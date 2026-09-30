// Data Transfer Objects for GRN Dashboard

export interface GrnDetailRecord {
  id: string;
  domain_id: string;
  purchase_order_id: string;
  epid: string;
  line_item: string;
  unit_of_measure: string | null;
  material_code: string | null;
  quantity: number;
  previous_accepted_quantity: number;
  date_created: string;
  date_updated: string;
  receipt_id: string;
  processed_state: number | null; // null = "Not Yet Processed", 1 = "Submitted", 2 = "In Process", 4 = "Completed"
}

export interface GrnTableDataDto {
  index: number;
  limit: number;
  total_count: number;
  returned_count: number;
  records: GrnDetailRecord[];
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

/**
 * Mapping for processed_state values:
 * null = "Not Yet Processed"
 * 1 = "Submitted"
 * 2 = "In Process"
 * 4 = "Completed"
 */
export const PROCESSED_STATE_MAP: Record<number | string, string> = {
  "null": "Not Yet Processed",
  0: "Not Yet Processed",
  1: "Submitted",
  2: "In Process",
  4: "Completed"
};

/**
 * Get human-readable label for processed state
 * Handles both null values and numeric values from backend
 */
export const getProcessedStateLabel = (state: number | null): string => {
  if (state === null) {
    return PROCESSED_STATE_MAP["null"];
  }
  return PROCESSED_STATE_MAP[state] || "Unknown";
};

/**
 * Get badge class name based on processed state
 * Used for styling status badges in the UI
 */
export const getStatusBadgeClass = (state: number | null): string => {
  if (state === null) {
    return "not-yet-processed";
  }
  
  switch (state) {
    case 1:
      return "submitted";
    case 2:
      return "in-process";
    case 4:
      return "completed";
    default:
      return "unknown";
  }
};

/**
 * Get CSS color class for status
 */
export const getStatusColorClass = (state: number | null): string => {
  if (state === null) {
    return "status-badge status-badge-purple";
  }
  
  switch (state) {
    case 1:
      return "status-badge status-badge-blue";
    case 2:
      return "status-badge status-badge-yellow";
    case 4:
      return "status-badge status-badge-green";
    default:
      return "status-badge status-badge-gray";
  }
};