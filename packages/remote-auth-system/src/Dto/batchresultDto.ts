export interface BatchResultDto {
  id: string;               // UUID
  purchaseOrderId: string;  // PO id
  lineItemId: string;       // Line item id
  result: string;           // Blocked/Unblocked
}
