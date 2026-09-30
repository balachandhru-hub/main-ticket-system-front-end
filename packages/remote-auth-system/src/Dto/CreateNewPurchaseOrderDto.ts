export interface CreateNewPurchaseOrderDto {
    purchaseOrderId: string,
    lineItem: string,
    epid: string,
    quantity: Number,
    prevQunatity: Number | null,
    recieptId: string,
    unitOfMeasure: string | null,
    materialCode: string | null
}