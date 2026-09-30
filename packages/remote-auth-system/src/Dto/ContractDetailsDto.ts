export interface ContractDetailsDto {
  id: string;
  domainId: string;
  uniqueName: string;
  name: string;
  contractDomain: string | null;
}

export interface DropdownOption {
  id: string;
  name: string;
  value: string;
  uniqueName: string;  
}

export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  description?: string;
}

//ContractCreateDTO
export interface CreateContractPayload {
  title: string;
  description: string;
  commodities: CommodityItem[];
  regions: RegionItem[];
  departments: DepartmentItem[];
  owner: OwnerInfo;
  supplier: SupplierInfo;
  effectiveDate: string;
  expirationDate: string;
  contractAmount: ContractAmount;
  templateId: string;
  hierarchicalType: string;
  expirationTermType: string;
  isTestProject: boolean;
  autoRenewalInterval?: string;
  maximumNumberOfRenewals?: string;
  parentAgreement?: string;
}
 
export interface CommodityItem {
  uniqueName: string;
  domain: string;
  name: string;
}
 
export interface RegionItem {
  uniqueName: string;
  name: string;
}
 
export interface DepartmentItem {
  uniqueName: string;
  name: string;
}
 
export interface OwnerInfo {
  uniqueName: string;
  passwordAdapter: string;
  name: string;
  emailAddress: string;
  orgANId: string;
}
 
export interface SupplierInfo {
  name: string;
  smVendorID: string;
}
 
export interface ContractAmount {
  amount: number;
  currency: string;
}
 
export interface CreateContractResponse {
  statusCode: number;
  message: string;
  description?: string;
  id?: string;
  isSuccess?: boolean;
}
 
export interface ContractCreateError {
  statusCode: number;
  message: string;
  description?: string;
  isSuccess: boolean;
}
 
export type CreateContractResult = CreateContractResponse | ContractCreateError;