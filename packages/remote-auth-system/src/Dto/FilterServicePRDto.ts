
export interface FilterServicePRRequest {
    index: number;
    limit: number;
    searchTerm?: string;
    fromDate?: string;
    toDate?: string;
    serviceStartDate?: string;
    serviceEndDate?: string;
    status?: string;
    glAccount?: string[];
    commodity?: string[];
    costCenter?: string[];
    companyCode?: string;
}

export interface GetServiceLineItemDto {
    numberInCollection: number;
    quantity: number;
    lineItemNumber: number;
    deliverTo: string;
    needBy: string;
    type: string;
    description: string;
    manPartNumber: string;
    vendor: string;
    contract: string;
    supplierPartAuxiliaryID: string;
    uom: string;
    price: number;
    currency: string;
    commodityDomain: string;
    commodityCode: string;
    preparerPasswordAdapter: string;
    requesterPasswordAdapter: string;
    materialCode: string;
    itemCategory: string;
    purchaseOrg: string;
    purchaseGroup: string;
    shipTo: string;
    billingAddress: string;
    supplier: string;
    supplierLocation: string;
    costCenter: string;
    companyCode: string;
    glAccount: string;
    procurementUnit: string;
    glAccountCompanyCode: string;
    costCenterCompanyCode: string;
    accountType: string;
    amount: number;
    expectedAmount?: number;
    maxAmount?: number;
    serviceStartDate?: string;
    serviceEndDate?: string;
    title: string;
    shipToPlant: string;
    billTo: string;
    taxCode: string;
    deliveryDate: string;
    status: string;
}

export interface FilterServicePRDto {
    domainId: string;
    prNumber: string;
    server: string;
    variant: string;
    userId: string;
    partition: string;
    prUniqueName: string;
    uniqueName: string;
    name: string;
    preparer: string;
    passwordAdapter: string;
    aribaUserName: string;
    requester: string;
    requesterPasswordAdapter: string;
    companyCode: string;
    title: string;
    purchaseGroup: string;
    shipToPlant: string;
    deliverTo: string;
    defaultDeliverTo: string;
    needBy: string;
    aribaEndPoint: string;
    username: string;
    password: string;
    lineItems: GetServiceLineItemDto[];
}