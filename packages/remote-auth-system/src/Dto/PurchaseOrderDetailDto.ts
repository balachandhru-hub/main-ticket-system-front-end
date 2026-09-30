import type { PurchaseOrderLineItemDto } from "./PurchaseOrderLineItemDto";
export interface PurchaseOrderDetailDto {
    purchaseOrderId: string;
    lineItems: PurchaseOrderLineItemDto[];
}
