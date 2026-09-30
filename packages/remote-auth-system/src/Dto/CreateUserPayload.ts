// src/dto/CreateUserPayload.ts
export interface CreateUserPayload {
  name: string;
  email: string;
  address: string;
  mobilePhone: string;
  domainId: string;
  realmId: string | null;
  tenantId: string | null;
  tempTenantId: string | null;
  aribaUserName: string | null;
  aribaPassword: string | null;
  roleId: string | null;
  userName: string;
  userSecret: string;
  designation: string | null;
  employeeId: string | null;
  department: string | null;
  requesterNames?: { name: string; department: string }[] | null;
  ModelIds?: string[] | null;
  AppIds?: string[] | null;
  orgANId?: string | null;
}