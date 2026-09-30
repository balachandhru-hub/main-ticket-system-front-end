// src/dtos/updateMaterialPR.dto.ts

/**
 * @interface UpdateMaterialPRDto
 * @description Defines the structure for the request body when updating a single 
 * line item (or the PR itself, depending on API implementation) using the PUT /MaterialPR/{prNumber} endpoint.
 * * Note: Since the endpoint uses {prNumber} in the path and the body seems to contain Line Item details, 
 * this structure represents the data for the item being updated.
 */
export interface UpdateMaterialPRDto {
    purchaseOrg: string;
    vendor: string;
    description: string;
    commodity: string;
    contract: string;
    purchaseGroup: string;
    quantity: number;
    uom: string;
    // Assuming 'amount' is 'Price' or 'unitPrice' in your context
    amount: number; 
    deliveryDate: string; // ISO 8601 format date string (e.g., "YYYY-MM-DDThh:mm:ss.sssZ")
    deliverTo: string;
    glAccount: string;
    costCenter: string;
    materialCode: string;
}

// Optional: If the API sends a simple success response
export interface UpdateMaterialPRResponse {
    success: boolean;
    message: string;
    prNumber?: string;
    // Add other fields you expect in a successful response
}