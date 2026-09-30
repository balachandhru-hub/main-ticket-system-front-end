// src/Dto/PlanConfigDto.ts

export interface PlanConfigDto {
  id?: string;
  planType: 'PAY_AS_USE' | 'SUBSCRIPTION' | 'SUPPORT_TEAM';
  engagementType: 'BUSINESS_HOURS' | '24_7_HOURS';
  chargePerTicket?: number;
  crBeyond8Hours?: number;
  startDate?: string;
  endDate?: string;
  discountCode?: string;
  noOfConsultants?: number;
  monthlyHours?: number;
  additionalCR?: number;
  paymentType?: string;
  resourceCost?: number;
  resources?: number;
  crCost?: number;
  manager?: number;
  managerCost?: number;
  crHours?: string;
  crChargesForAdditionalHours?: string;
  contractStartDate: string;
  contractEndDate: string;
}

export type PlanType = 'PAY_AS_USE' | 'SUBSCRIPTION' | 'SUPPORT_TEAM';
export type EngagementType = 'BUSINESS_HOURS' | '24_7_HOURS';