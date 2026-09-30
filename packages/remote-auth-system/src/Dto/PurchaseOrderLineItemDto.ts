// Dto/PurchaseOrderLineItemDto.ts
export interface PurchaseOrderLineItemDto {
    lineItem: string;
    unitOfMeasure: string;
    materialCode: string;
    quantity: number;
    acceptedQuantity: number | null;
    previousAcceptedQuantity: number | null;
    receiptId: string;
    processedReceiptId: string | null;
    erpReceiptId: string | null;
    errorComment: string | null;
}