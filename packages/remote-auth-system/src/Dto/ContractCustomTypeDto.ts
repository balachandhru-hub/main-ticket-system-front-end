export interface ContractCustomTypeDto {
  customType: string;
  value: string;
}

export interface VendorDto {
  name: string;
  smVendorId: string;
}

export interface VendorOption {
  id: string;
  name: string;
  smVendorId: string;
}

export interface VendorFetchResponse {
  data: VendorOption[];
  error: null | { statusCode: number; message: string };
}