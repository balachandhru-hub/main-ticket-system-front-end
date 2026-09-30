// Dto/GetUserDto.ts

export interface BotModelDto {
  id: string;
  modelName: string;
}

export interface AppModelDto {
  id: string;
  name: string;
  description?: string;
  link?: string;
  key?: string;
}

export interface GetUserDto {
  userName?: string;
  email?: string;
  mobilePhone?: string;
  address?: string;
  designation?: string;
  employeeId?: string;
  department?: string;
  country?: string;
  userRole?: string;
  name?: string;
  personName?: string;
  aribaUserName?: string;
  aribaPassword?: string;
  models?: BotModelDto[];
  apps?: AppModelDto[];
  requesterNames?: { name: string; department: string }[];
  orgANId?: string;
}