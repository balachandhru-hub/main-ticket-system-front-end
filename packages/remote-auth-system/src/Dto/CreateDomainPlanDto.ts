// Updated DTO to match API requirements
export interface CreateDomainPlanDto {
  domainId: string;
  planName: string;
  engagementType: string;
  startDate: string;
  endDate?: string;
  discountCouponId?: string;
  paymentType: string;  
  // PAYG specific fields
  crHoursBeyondLimit?: number;
  ticketCharge?: number;
  
  // Subscription specific fields
  numberOfConsult?: number;
  monthlyHours?: number;
  additionalCRHoursCharge?: number;
  resourceCost?: number;
  
  // Support team specific fields
  numberOfResources?: number;
  crCost?: number;
  numberOfManager?: number;
  managerCost?: number;
  
  contractStartDate: string;
  contractEndDate: string;
  expiryTime: number
  
  // Asset object for file upload (PAYG only)
  asset?: {
    entityType: string;
    entityId: string;
    assetType: string;
    fileBytes: string;
    fileName: string;
    contentType: string;
    isSingletonAsset: boolean;
  };
  
  // Additional calculated fields
  totalChargeOfConsult?: number;
  totalChargeOfManager?: number;
  totalCost?: number;
}

// Keep the old interface for form data compatibility
export interface PlanFormData {
  domainId?: string;
  planName?: string;
  engagementType?: string;
  planType?: string;
  startDate?: string;
  endDate?: string;
  discountCode?: string;
  paymentType?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  
  // PAYG
  crBeyond8Hours?: number;
  chargePerTicket?: number;
  contractId?: string;

  // Subscription
  numberOfConsultants?: number;
  noOfConsultants?: number; 
  monthlyHours?: number;
  additionalCR?: number;
  resourceCost?: number;

  // Support
  resources?: number;
  crCost?: number;
  manager?: number;
  managerCost?: number;
}