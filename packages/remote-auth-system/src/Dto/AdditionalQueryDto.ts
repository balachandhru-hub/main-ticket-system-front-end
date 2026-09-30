export interface AdditionalQueryDto {
  name: string;
  email: string;
  phone: string;
  organization: string;
  message: string;
}

export interface AdditionalQueryListDto {
  id: string; // GUID as string
  name: string;
  email: string;
  phone: string;
  organization: string;
  message: string;
  status: string;
  dateCreated: string; // ISO string
}

export interface AdditionalQueryFilterDto {
  SearchQuery?: string;
  Status?: string;
  FromDate?: string; // ISO date
  ToDate?: string;   // ISO date
  Index?: number;
  Limit?: number;
}

export interface AdditionalQueryStatusDto {
  status: string;
}