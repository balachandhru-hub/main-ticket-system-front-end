export interface createPurchaseOrderDto{
    purchaseOrderId: string,
    lineItems: lineItemDto[]
}

export interface lineItemDto{
    lineItem: string,
    acceptedQuantity: string,
}