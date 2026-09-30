// ============================================

export interface DomainRealm {
  realmId: string;
  aribaWebsiteUrl: string;
}

export interface DomainModel {
  domainId?: string; 
  modelName: string;
}

export interface CompanyRegistrationPayload {
  id?: string; 
  name: string;
  websiteUrl: string;
  registrationNumber: string;
  headquartersLocation: string;
  countriesOfOperation: string;
  businessType: string;
  industryType: string;
  billingAddress: string;
  gst: string;
  vat: string;
  tan: string;
  pan: string;
  taxRegistration: string;
  otherLocalTaxId: string;
  taxApplicable: boolean;
  nda: boolean;
  numberOfUser: number;
  supportAdminName: string;
  supportAdminEmail: string;
  supportAdminTimeZone: string;
  supportAdminPhoneNo: string;
  connectERPSystem: string;
  aribaNetworkId: string;
  designation: string;
  domainRealms: DomainRealm[];
  domainModels: DomainModel[];
}