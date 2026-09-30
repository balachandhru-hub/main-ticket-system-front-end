export interface UpdateUserPayload {
  name: string;
  email: string;
  address: string;
  mobilePhone: string;
  domainId: string;
  realmId: string | null;
  tenantId: string | null;
  tempTenantId: string | null;
  roleId: string | null;
  userName: string;
  userSecret: string;
  designation: string | null;
  employeeId: string | null;
  department: string | null;
}
