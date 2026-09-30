// src/Dto/CustomerListResponseDto.ts
import type { AssetDto } from './AssetDto';

export interface CustomerListResponseDto {
  id: string;
  companyDetails: {
    companyName: string;
    companyRegistrationNo?: string;
    location?: string;
    aribaRealmId?: string;
    aribaNetworkId?: string;
    billingAddress?: string;
  };
  planDetails: {
    planType?: string;
    engagementType?: string;
    paymentMethod?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    paymentAmount?: string;
    planStartDate?: string;
    planEndDateOrRenewalDate?: string;
    planStatus?: string;
    paymentType?: string;
    crChargesForAdditionalHours?: string;
    noOfConsultants?: string;
    monthlyHours?: string;
    ticketCharge?: number;
    crHoursBeyondLimit?: number;
  };
  taxDetails: {
    gst?: string;
    pan?: string;
    vat?: string;
    tan?: string;
    taxRegistration?: string;
    otherLocalTaxId?: string;
    cinNumber?: string;
    lutNumber?: string;
  };
  asset?: AssetDto;
}