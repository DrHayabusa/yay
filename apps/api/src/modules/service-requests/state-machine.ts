import { CaseStatus, Role } from '@prisma/client';

/**
 * The single authority for case-status transitions.
 * `SYSTEM` transitions are performed by the backend itself when a guard
 * becomes true (payment captured, quotation published, …) — never directly
 * via the public transition endpoint.
 */
export const SYSTEM = 'SYSTEM' as const;
export type Actor = Role | typeof SYSTEM;

export interface TransitionRule {
  from: CaseStatus;
  to: CaseStatus;
  actors: Actor[];
  /** Documented guard — enforced in ServiceRequestsService before commit. */
  guard?: string;
}

const R = Role;

export const TRANSITIONS: TransitionRule[] = [
  { from: 'REQUEST_CREATED', to: 'AWAITING_RECOVERY_ASSIGNMENT', actors: [SYSTEM], guard: 'estimate generated' },
  { from: 'AWAITING_RECOVERY_ASSIGNMENT', to: 'RECOVERY_ASSIGNED', actors: [R.ADMIN, R.RECOVERY_DRIVER, SYSTEM], guard: 'driver accepted / admin assigned' },
  { from: 'RECOVERY_ASSIGNED', to: 'RECOVERY_EN_ROUTE', actors: [R.RECOVERY_DRIVER] },
  { from: 'RECOVERY_EN_ROUTE', to: 'RECOVERY_ARRIVED', actors: [R.RECOVERY_DRIVER] },
  { from: 'RECOVERY_ARRIVED', to: 'VEHICLE_COLLECTED', actors: [R.RECOVERY_DRIVER], guard: 'pickup handover OTP verified + before-pickup photos' },
  { from: 'VEHICLE_COLLECTED', to: 'VEHICLE_IN_TRANSIT', actors: [R.RECOVERY_DRIVER] },
  { from: 'VEHICLE_IN_TRANSIT', to: 'VEHICLE_AT_GARAGE', actors: [R.RECOVERY_DRIVER, R.GARAGE_TECHNICIAN, R.GARAGE_MANAGER], guard: 'garage receipt confirmation' },
  { from: 'VEHICLE_AT_GARAGE', to: 'INSPECTION_IN_PROGRESS', actors: [R.GARAGE_TECHNICIAN, R.GARAGE_MANAGER] },
  { from: 'INSPECTION_IN_PROGRESS', to: 'DIAGNOSIS_SUBMITTED', actors: [R.GARAGE_MANAGER], guard: 'inspection submitted with ≥1 finding + evidence' },
  { from: 'DIAGNOSIS_SUBMITTED', to: 'AWAITING_CUSTOMER_APPROVAL', actors: [SYSTEM], guard: 'quotation published' },
  { from: 'AWAITING_CUSTOMER_APPROVAL', to: 'PARTS_SELECTION_REQUIRED', actors: [R.CUSTOMER, SYSTEM], guard: '≥1 approved item requires a part' },
  { from: 'AWAITING_CUSTOMER_APPROVAL', to: 'REPAIR_IN_PROGRESS', actors: [SYSTEM], guard: 'labour-only approval + repair payment captured' },
  { from: 'AWAITING_CUSTOMER_APPROVAL', to: 'CANCELLED', actors: [R.CUSTOMER, R.ADMIN, R.SUPPORT_AGENT], guard: 'customer rejected all items' },
  { from: 'PARTS_SELECTION_REQUIRED', to: 'PARTS_ORDERED', actors: [SYSTEM], guard: 'all parts compatibility-confirmed + payment captured' },
  { from: 'PARTS_ORDERED', to: 'PARTS_DISPATCHED', actors: [R.SUPPLIER] },
  { from: 'PARTS_DISPATCHED', to: 'PARTS_DELIVERED', actors: [R.SUPPLIER, R.DELIVERY_DRIVER, R.GARAGE_MANAGER, R.GARAGE_TECHNICIAN], guard: 'garage confirms receipt' },
  { from: 'PARTS_DELIVERED', to: 'REPAIR_IN_PROGRESS', actors: [R.GARAGE_TECHNICIAN, R.GARAGE_MANAGER], guard: 'customer approval exists for every worked item' },
  { from: 'REPAIR_IN_PROGRESS', to: 'QUALITY_CHECK_IN_PROGRESS', actors: [R.GARAGE_MANAGER] },
  { from: 'QUALITY_CHECK_IN_PROGRESS', to: 'REPAIR_IN_PROGRESS', actors: [R.QC_INSPECTOR, R.GARAGE_MANAGER], guard: 'QC failed — rework' },
  { from: 'QUALITY_CHECK_IN_PROGRESS', to: 'REPAIR_COMPLETED', actors: [R.QC_INSPECTOR, R.GARAGE_MANAGER], guard: 'QC checklist passed' },
  { from: 'REPAIR_COMPLETED', to: 'DELIVERY_SCHEDULED', actors: [R.GARAGE_MANAGER, R.ADMIN] },
  { from: 'DELIVERY_SCHEDULED', to: 'VEHICLE_OUT_FOR_DELIVERY', actors: [R.DELIVERY_DRIVER, R.RECOVERY_DRIVER, R.GARAGE_MANAGER] },
  { from: 'DELIVERY_SCHEDULED', to: 'VEHICLE_DELIVERED', actors: [R.GARAGE_MANAGER], guard: 'customer self-pickup with OTP' },
  { from: 'VEHICLE_OUT_FOR_DELIVERY', to: 'VEHICLE_DELIVERED', actors: [R.DELIVERY_DRIVER, R.RECOVERY_DRIVER], guard: 'delivery handover OTP verified' },
  { from: 'VEHICLE_DELIVERED', to: 'CASE_CLOSED', actors: [SYSTEM, R.ADMIN], guard: 'final invoice + warranty issued' },
];

/** Statuses from which a customer/admin cancellation is allowed. */
export const CANCELLABLE_BEFORE_COLLECTION: CaseStatus[] = [
  'REQUEST_CREATED',
  'AWAITING_RECOVERY_ASSIGNMENT',
  'RECOVERY_ASSIGNED',
  'RECOVERY_EN_ROUTE',
  'RECOVERY_ARRIVED',
];

const TERMINAL: CaseStatus[] = ['CASE_CLOSED', 'CANCELLED'];

/** Roles allowed to cancel (pre-collection) or raise a dispute. */
const ESCALATION_ROLES: Actor[] = [Role.CUSTOMER, Role.SUPPORT_AGENT, Role.ADMIN];

export interface TransitionCheck {
  ok: boolean;
  reason?: 'TERMINAL' | 'NO_RULE' | 'ACTOR_NOT_ALLOWED';
  allowedTargets: CaseStatus[];
}

/**
 * Pure decision function — no I/O, fully unit-testable.
 * Cancellation and dispute rules are evaluated alongside the table:
 *  - CANCELLED: customer/admin/support from any pre-collection status (+ table rules).
 *  - DISPUTED: customer/support/admin from any non-terminal status.
 *  - ADMIN override: any transition between non-terminal statuses (flagged upstream).
 */
export function checkTransition(
  from: CaseStatus,
  to: CaseStatus,
  actors: Actor[],
  opts: { isAdminOverride?: boolean } = {},
): TransitionCheck {
  const allowedTargets = allowedTargetsFor(from, actors);

  if (TERMINAL.includes(from)) {
    return { ok: false, reason: 'TERMINAL', allowedTargets: [] };
  }

  if (opts.isAdminOverride && actors.includes(Role.ADMIN) && !TERMINAL.includes(from)) {
    return { ok: true, allowedTargets };
  }

  if (to === 'DISPUTED') {
    const ok = actors.some((a) => ESCALATION_ROLES.includes(a));
    return ok
      ? { ok: true, allowedTargets }
      : { ok: false, reason: 'ACTOR_NOT_ALLOWED', allowedTargets };
  }

  if (to === 'CANCELLED' && CANCELLABLE_BEFORE_COLLECTION.includes(from)) {
    const ok = actors.some((a) => ESCALATION_ROLES.includes(a));
    return ok
      ? { ok: true, allowedTargets }
      : { ok: false, reason: 'ACTOR_NOT_ALLOWED', allowedTargets };
  }

  if (from === 'DISPUTED') {
    // Only admins may unfreeze a disputed case (to any non-terminal status or closure).
    const ok = actors.includes(Role.ADMIN);
    return ok
      ? { ok: true, allowedTargets }
      : { ok: false, reason: 'ACTOR_NOT_ALLOWED', allowedTargets };
  }

  const rules = TRANSITIONS.filter((t) => t.from === from && t.to === to);
  if (rules.length === 0) {
    return { ok: false, reason: 'NO_RULE', allowedTargets };
  }
  const ok = rules.some((rule) => rule.actors.some((a) => actors.includes(a)));
  return ok ? { ok: true, allowedTargets } : { ok: false, reason: 'ACTOR_NOT_ALLOWED', allowedTargets };
}

export function allowedTargetsFor(from: CaseStatus, actors: Actor[]): CaseStatus[] {
  if (TERMINAL.includes(from)) return [];
  const fromTable = TRANSITIONS.filter(
    (t) => t.from === from && t.actors.some((a) => actors.includes(a)),
  ).map((t) => t.to);
  const extra: CaseStatus[] = [];
  if (
    CANCELLABLE_BEFORE_COLLECTION.includes(from) &&
    actors.some((a) => ESCALATION_ROLES.includes(a))
  ) {
    extra.push('CANCELLED');
  }
  if (actors.some((a) => ESCALATION_ROLES.includes(a))) {
    extra.push('DISPUTED');
  }
  return [...new Set([...fromTable, ...extra])];
}
