// src/Dto/UpdatePersonDto.ts
export interface CustomerMasterEditDto {
  address: string;
  country?: string;
  mobilePhone?: string;
  designation?: string;
  department?: string;
  employeeId?: string;
  name?: string;
  aribaUserName?: string;
  aribaPassword?: string;
  modelIds?: string[];
  appIds?: string[];
  requesterNames?: { name: string; department: string }[];
  orgANId?: string;
}