export const USER_ROLES = {
  MANAGER: '7fa817e2-b8ab-4e28-8a5b-09ca3aefd108',
  BUSINESS_DEVELOPMENT_USER: '55f1ba23-2c18-498f-a3a6-40520e13ebc3',
  LEAD: 'e29577d6-4213-438b-9f80-5d643713a1ee',
  CONSULTANT: '1f18e16a-826a-4ba5-969c-536b0963edf5',
  FINANCE_USER: 'e5626101-6325-4bb8-b834-e6e418f95185',
  BUSINESS_ADMIN_USER: 'b7f623f7-9564-4031-9a4a-11ab1fac81d6',
  BUSINESS_USER: 'f0db8007-a05a-4657-bc3e-5638c0d57fc5',
  LEADERSHIP_USER: '0e916217-9f4d-4371-b153-6c9deb5a6c95',
  SUPPLIER_USER: '3a4084ae-fc81-4517-94d9-5171d4b0ed6d',
  OPERATIONS_USER: 'cda1c1e5-d858-4403-8f59-1a61921591e9',
  FINANCE_OPERATION_USER: '0b0e9172-8d32-485c-9556-927f0fd63347',
};

export const ASSET_TYPES = {
  PROFILE_IMAGE: "PROFILE_IMAGE",
  UPLOADED_FILE: "UPLOADED_FILE",
  CONTRACT_FILE: 'CONTRACT_FILE', 
  ADDITIONAL_UPLOADED_FILE: "ADDITIONAL_UPLOADED_FILE",
  DOMAIN_LOGO: "DOMAIN_LOGO",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_DISPLAY_NAMES: Record<keyof typeof USER_ROLES, string> = {
  MANAGER: 'Manager',
  BUSINESS_DEVELOPMENT_USER: 'Business Development',
  LEAD: 'Lead',
  CONSULTANT: 'Consultant',
  FINANCE_USER: 'Finance User',
  BUSINESS_ADMIN_USER: 'Business Admin',
  BUSINESS_USER: 'Business User',
  LEADERSHIP_USER: 'Leadership User',
  SUPPLIER_USER: 'Supplier User',
  OPERATIONS_USER: 'Operations User',
  FINANCE_OPERATION_USER: 'Finance Operation User',
};

export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export const ENTITY_TYPE = {
  USER: 'USER',
  DOMAIN_PLAN: 'DOMAIN_PLAN',
  TICKET: 'TICKET',
  DOMAIN: 'DOMAIN',
}

// Email CC Entity Types - used for fetching email CCs
export const EMAIL_CC_ENTITY_TYPES = [
  ENTITY_TYPE.DOMAIN,
  ENTITY_TYPE.DOMAIN_PLAN,
  ENTITY_TYPE.USER,
] as const;

export const TICKET_CATEGORIES = {
  TECHNICAL_SUPPORT: 'TECHNICAL_SUPPORT',
  BILLING_PAYMENT: 'BILLING_PAYMENT',
  GENERAL_INQUIRY: 'GENERAL_INQUIRY'
};

export const TICKET_PRIORITIES = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

export const TICKET_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  IN_PROGRESS: 'IN_PROGRESS',
  APPROVED: 'APPROVED',
  RE_APPROVE: 'RE_APPROVE',
  ON_HOLD: 'ON_HOLD',
  DECLINE: 'DECLINE',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  TOTAL: 'TOTAL'
}

export type EntityType = typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE];

export const USER_DISPLAY_TEXT = {
  YOU: 'YOU'
}

export const PLAN_TYPES = {
  PAY_AS_USE: 'PAY_AS_USE',
  SUBSCRIPTION: 'SUBSCRIPTION',
  SUPPORT_TEAM: 'SUPPORT_TEAM'
} as const;

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES];

export const PAYMENT_STATUS = {
  PAID: 'PAID',
  UNPAID: 'UNPAID'
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const PAYMENT_TYPES = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
} as const;

export type PaymentType = typeof PAYMENT_TYPES[keyof typeof PAYMENT_TYPES];

export const DOMAIN_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
} as const;

export type DomainStatus = typeof DOMAIN_STATUS[keyof typeof DOMAIN_STATUS];

export const EXPIRY_TIME = {
  DAYS_15: '15',
  DAYS_30: '30'
} as const;

export type ExpiryTime = typeof EXPIRY_TIME[keyof typeof EXPIRY_TIME];

export const MODULE_TYPE = "ARIBA_MODEL";

export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthEndDate = (): string => {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const year = endOfMonth.getFullYear();
  const month = String(endOfMonth.getMonth() + 1).padStart(2, '0');
  const day = String(endOfMonth.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getResetFormState = (prev: Record<string, any>) => ({
  ...prev,
  venue: '',
  supplier: '',
  title: '',
  description: '',
  amount: '',
  costCenter: '',
  contract: null,
  glAccount: '',
  comments: '',
  invoiceId: '',
  invoiceDate: '',
  invoiceComments: '',
  vendorId: '',
  materialcode: '',
  uom: '',
  quantity: '1',
  category: '',
  percentage: '',
  autoGRN: true,
  autoInvoice: false,
  taxInclude: false,
  needBy: getTodayDate(),
  purchaseOrg: prev.purchaseOrg,
  purchaseGroup: prev.purchaseGroup,
  currency: prev.currency,
  deliveryTo: prev.deliveryTo,
  companyCode: prev.companyCode,
  shipToPlant: prev.shipToPlant,
  billTo: prev.billTo,
  taxCode: prev.taxCode,
  crossCharge: false,
  crossChargeItems: [],
  serviceStartDate: getTodayDate(),
  serviceEndDate: getMonthEndDate(),
  autoSES: true,
});