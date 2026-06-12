export const ROLES = [
  'CUSTOMER',
  'RECOVERY_DRIVER',
  'PROVIDER_ADMIN',
  'GARAGE_TECHNICIAN',
  'GARAGE_MANAGER',
  'SUPPLIER',
  'DELIVERY_DRIVER',
  'ADMIN',
  'SUPPORT_AGENT',
  'QC_INSPECTOR',
] as const;

export type Role = (typeof ROLES)[number];
