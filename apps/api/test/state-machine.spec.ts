import { Role, CaseStatus } from '@prisma/client';
import {
  checkTransition,
  allowedTargetsFor,
  TRANSITIONS,
  SYSTEM,
  CANCELLABLE_BEFORE_COLLECTION,
} from '../src/modules/service-requests/state-machine';

describe('Case state machine', () => {
  describe('happy path', () => {
    const path: [CaseStatus, CaseStatus, (Role | typeof SYSTEM)[]][] = [
      ['REQUEST_CREATED', 'AWAITING_RECOVERY_ASSIGNMENT', [SYSTEM]],
      ['AWAITING_RECOVERY_ASSIGNMENT', 'RECOVERY_ASSIGNED', [Role.ADMIN]],
      ['RECOVERY_ASSIGNED', 'RECOVERY_EN_ROUTE', [Role.RECOVERY_DRIVER]],
      ['RECOVERY_EN_ROUTE', 'RECOVERY_ARRIVED', [Role.RECOVERY_DRIVER]],
      ['RECOVERY_ARRIVED', 'VEHICLE_COLLECTED', [Role.RECOVERY_DRIVER]],
      ['VEHICLE_COLLECTED', 'VEHICLE_IN_TRANSIT', [Role.RECOVERY_DRIVER]],
      ['VEHICLE_IN_TRANSIT', 'VEHICLE_AT_GARAGE', [Role.GARAGE_MANAGER]],
      ['VEHICLE_AT_GARAGE', 'INSPECTION_IN_PROGRESS', [Role.GARAGE_TECHNICIAN]],
      ['INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED', [Role.GARAGE_MANAGER]],
      ['DIAGNOSIS_SUBMITTED', 'AWAITING_CUSTOMER_APPROVAL', [SYSTEM]],
      ['AWAITING_CUSTOMER_APPROVAL', 'PARTS_SELECTION_REQUIRED', [Role.CUSTOMER]],
      ['PARTS_SELECTION_REQUIRED', 'PARTS_ORDERED', [SYSTEM]],
      ['PARTS_ORDERED', 'PARTS_DISPATCHED', [Role.SUPPLIER]],
      ['PARTS_DISPATCHED', 'PARTS_DELIVERED', [Role.GARAGE_MANAGER]],
      ['PARTS_DELIVERED', 'REPAIR_IN_PROGRESS', [Role.GARAGE_TECHNICIAN]],
      ['REPAIR_IN_PROGRESS', 'QUALITY_CHECK_IN_PROGRESS', [Role.GARAGE_MANAGER]],
      ['QUALITY_CHECK_IN_PROGRESS', 'REPAIR_COMPLETED', [Role.QC_INSPECTOR]],
      ['REPAIR_COMPLETED', 'DELIVERY_SCHEDULED', [Role.GARAGE_MANAGER]],
      ['DELIVERY_SCHEDULED', 'VEHICLE_OUT_FOR_DELIVERY', [Role.DELIVERY_DRIVER]],
      ['VEHICLE_OUT_FOR_DELIVERY', 'VEHICLE_DELIVERED', [Role.DELIVERY_DRIVER]],
      ['VEHICLE_DELIVERED', 'CASE_CLOSED', [SYSTEM]],
    ];

    it.each(path)('%s → %s is allowed for the right actor', (from, to, actors) => {
      expect(checkTransition(from, to, actors).ok).toBe(true);
    });
  });

  describe('actor restrictions', () => {
    it('rejects a customer driving recovery statuses', () => {
      const res = checkTransition('RECOVERY_ASSIGNED', 'RECOVERY_EN_ROUTE', [Role.CUSTOMER]);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('ACTOR_NOT_ALLOWED');
    });

    it('rejects a garage technician submitting a diagnosis (manager-only)', () => {
      expect(
        checkTransition('INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED', [Role.GARAGE_TECHNICIAN]).ok,
      ).toBe(false);
    });

    it('rejects a supplier closing a case', () => {
      expect(checkTransition('VEHICLE_DELIVERED', 'CASE_CLOSED', [Role.SUPPLIER]).ok).toBe(false);
    });

    it('rejects SYSTEM performing driver moves', () => {
      expect(checkTransition('RECOVERY_ASSIGNED', 'RECOVERY_EN_ROUTE', [SYSTEM]).ok).toBe(false);
    });
  });

  describe('illegal jumps', () => {
    it('cannot skip from inspection straight to repair', () => {
      const res = checkTransition('INSPECTION_IN_PROGRESS', 'REPAIR_IN_PROGRESS', [
        Role.GARAGE_MANAGER,
      ]);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('NO_RULE');
    });

    it('cannot move backwards from repair to recovery', () => {
      expect(checkTransition('REPAIR_IN_PROGRESS', 'RECOVERY_EN_ROUTE', [Role.ADMIN]).ok).toBe(false);
    });

    it('terminal states are frozen', () => {
      expect(checkTransition('CASE_CLOSED', 'REPAIR_IN_PROGRESS', [Role.ADMIN]).ok).toBe(false);
      expect(checkTransition('CANCELLED', 'REQUEST_CREATED', [Role.ADMIN]).ok).toBe(false);
      expect(
        checkTransition('CASE_CLOSED', 'REPAIR_IN_PROGRESS', [Role.ADMIN], { isAdminOverride: true })
          .ok,
      ).toBe(false);
    });
  });

  describe('cancellation', () => {
    it.each(CANCELLABLE_BEFORE_COLLECTION)('customer may cancel from %s', (from) => {
      expect(checkTransition(from, 'CANCELLED', [Role.CUSTOMER]).ok).toBe(true);
    });

    it('customer cannot cancel after collection', () => {
      expect(checkTransition('VEHICLE_IN_TRANSIT', 'CANCELLED', [Role.CUSTOMER]).ok).toBe(false);
      expect(checkTransition('REPAIR_IN_PROGRESS', 'CANCELLED', [Role.CUSTOMER]).ok).toBe(false);
    });

    it('customer may cancel by rejecting the whole quotation', () => {
      expect(checkTransition('AWAITING_CUSTOMER_APPROVAL', 'CANCELLED', [Role.CUSTOMER]).ok).toBe(true);
    });

    it('driver cannot cancel a case', () => {
      expect(checkTransition('RECOVERY_ASSIGNED', 'CANCELLED', [Role.RECOVERY_DRIVER]).ok).toBe(false);
    });
  });

  describe('disputes', () => {
    it('customer can dispute mid-flow', () => {
      expect(checkTransition('REPAIR_IN_PROGRESS', 'DISPUTED', [Role.CUSTOMER]).ok).toBe(true);
    });

    it('garage cannot raise a dispute', () => {
      expect(checkTransition('REPAIR_IN_PROGRESS', 'DISPUTED', [Role.GARAGE_MANAGER]).ok).toBe(false);
    });

    it('only admin may move a case out of DISPUTED', () => {
      expect(checkTransition('DISPUTED', 'REPAIR_IN_PROGRESS', [Role.ADMIN]).ok).toBe(true);
      expect(checkTransition('DISPUTED', 'REPAIR_IN_PROGRESS', [Role.CUSTOMER]).ok).toBe(false);
      expect(checkTransition('DISPUTED', 'CASE_CLOSED', [Role.SUPPORT_AGENT]).ok).toBe(false);
    });
  });

  describe('admin override', () => {
    it('allows an explicit override between non-terminal states', () => {
      expect(
        checkTransition('REPAIR_IN_PROGRESS', 'VEHICLE_AT_GARAGE', [Role.ADMIN], {
          isAdminOverride: true,
        }).ok,
      ).toBe(true);
    });

    it('non-admin cannot use override', () => {
      expect(
        checkTransition('REPAIR_IN_PROGRESS', 'VEHICLE_AT_GARAGE', [Role.GARAGE_MANAGER], {
          isAdminOverride: true,
        }).ok,
      ).toBe(false);
    });
  });

  describe('allowedTargetsFor', () => {
    it('lists driver moves from RECOVERY_ASSIGNED', () => {
      expect(allowedTargetsFor('RECOVERY_ASSIGNED', [Role.RECOVERY_DRIVER])).toEqual([
        'RECOVERY_EN_ROUTE',
      ]);
    });

    it('includes CANCELLED and DISPUTED for customers pre-collection', () => {
      const targets = allowedTargetsFor('AWAITING_RECOVERY_ASSIGNMENT', [Role.CUSTOMER]);
      expect(targets).toContain('CANCELLED');
      expect(targets).toContain('DISPUTED');
    });

    it('returns nothing from terminal states', () => {
      expect(allowedTargetsFor('CASE_CLOSED', [Role.ADMIN])).toEqual([]);
    });
  });

  it('transition table has no duplicate (from, to, actor) rules', () => {
    const seen = new Set<string>();
    for (const t of TRANSITIONS) {
      for (const a of t.actors) {
        const key = `${t.from}->${t.to}@${a}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});
