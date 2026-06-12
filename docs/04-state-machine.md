# Service-Request State Machine

Single source of truth: `apps/api/src/modules/service-requests/state-machine.ts`.
Every transition is executed inside a DB transaction with a row lock on the case, and appends a
`StatusHistory` row: `{ fromStatus, toStatus, actorUserId, actorRole, lat, lng, notes, evidenceMediaIds[], createdAt }`.

## States and allowed transitions

| # | From | To | Allowed actors | Guard / evidence |
|---|------|----|----------------|------------------|
| 1 | — | REQUEST_CREATED | CUSTOMER | safety questions answered; ≥1 vehicle photo + plate photo |
| 2 | REQUEST_CREATED | AWAITING_RECOVERY_ASSIGNMENT | SYSTEM | estimate generated; recovery+diagnostic payment authorised (MVP: paid) |
| 3 | AWAITING_RECOVERY_ASSIGNMENT | RECOVERY_ASSIGNED | ADMIN (MVP), SYSTEM (later auto-dispatch), RECOVERY_DRIVER (accept) | driver + truck verified & available |
| 4 | RECOVERY_ASSIGNED | RECOVERY_EN_ROUTE | RECOVERY_DRIVER | — |
| 5 | RECOVERY_EN_ROUTE | RECOVERY_ARRIVED | RECOVERY_DRIVER | GPS within 300 m of pickup (soft-warn otherwise) |
| 6 | RECOVERY_ARRIVED | VEHICLE_COLLECTED | RECOVERY_DRIVER | pickup OTP from customer **or** customer-absent override w/ admin approval; before-pickup photos required |
| 7 | VEHICLE_COLLECTED | VEHICLE_IN_TRANSIT | RECOVERY_DRIVER | — |
| 8 | VEHICLE_IN_TRANSIT | VEHICLE_AT_GARAGE | RECOVERY_DRIVER + GARAGE_TECHNICIAN/MANAGER (dual confirm) | garage receipt confirmation; condition photos |
| 9 | VEHICLE_AT_GARAGE | INSPECTION_IN_PROGRESS | GARAGE_TECHNICIAN, GARAGE_MANAGER | — |
| 10 | INSPECTION_IN_PROGRESS | DIAGNOSIS_SUBMITTED | GARAGE_MANAGER | report has ≥1 finding, each finding has evidence media; quotation drafted |
| 11 | DIAGNOSIS_SUBMITTED | AWAITING_CUSTOMER_APPROVAL | SYSTEM | quotation published to customer |
| 12 | AWAITING_CUSTOMER_APPROVAL | PARTS_SELECTION_REQUIRED | CUSTOMER | ≥1 approved item requires a part |
| 12b| AWAITING_CUSTOMER_APPROVAL | REPAIR_IN_PROGRESS | CUSTOMER → SYSTEM | all approved items are labour-only; repair payment captured |
| 12c| AWAITING_CUSTOMER_APPROVAL | CANCELLED | CUSTOMER | rejects everything; storage/return fee rules apply |
| 13 | PARTS_SELECTION_REQUIRED | PARTS_ORDERED | SYSTEM | every selected part **compatibility-confirmed**; repair payment captured |
| 14 | PARTS_ORDERED | PARTS_DISPATCHED | SUPPLIER | — |
| 15 | PARTS_DISPATCHED | PARTS_DELIVERED | SUPPLIER/DELIVERY_DRIVER + GARAGE (receipt confirm) | garage confirms parts received & correct |
| 16 | PARTS_DELIVERED | REPAIR_IN_PROGRESS | GARAGE_TECHNICIAN, GARAGE_MANAGER | customer approval exists for every item being worked |
| 17 | REPAIR_IN_PROGRESS | QUALITY_CHECK_IN_PROGRESS | GARAGE_MANAGER | replaced parts recorded |
| 18 | QUALITY_CHECK_IN_PROGRESS | REPAIR_COMPLETED | QC_INSPECTOR, GARAGE_MANAGER (where QC role unavailable, flagged) | QC checklist passed; failure loops back to REPAIR_IN_PROGRESS |
| 19 | REPAIR_COMPLETED | DELIVERY_SCHEDULED | GARAGE_MANAGER, ADMIN | delivery slot agreed with customer |
| 20 | DELIVERY_SCHEDULED | VEHICLE_OUT_FOR_DELIVERY | DELIVERY_DRIVER, RECOVERY_DRIVER, GARAGE_MANAGER (customer self-pickup skips to 21 with OTP) | — |
| 21 | VEHICLE_OUT_FOR_DELIVERY | VEHICLE_DELIVERED | DELIVERY_DRIVER + CUSTOMER OTP | delivery OTP; after photos |
| 22 | VEHICLE_DELIVERED | CASE_CLOSED | SYSTEM (after invoice issued + rating window) , ADMIN | final invoice + warranty issued |
| any pre-VEHICLE_COLLECTED | CANCELLED | CUSTOMER, ADMIN, SUPPORT_AGENT | cancellation fee rules |
| any | DISPUTED | CUSTOMER, SUPPORT_AGENT, ADMIN | dispute record created; case frozen for provider actions |
| DISPUTED | previous status or CASE_CLOSED | ADMIN | resolution recorded |

`SYSTEM` = automatic transition performed by the backend when its guard becomes true (e.g. payment
webhook confirms capture). Admins can force-correct any transition; forced transitions are flagged
`isOverride=true` in `StatusHistory` and alert the audit channel.

## Plain-language status messages (message codes → en/ar copies)

E.g. `RECOVERY_ASSIGNED → "A recovery driver has been assigned."`,
`VEHICLE_AT_GARAGE → "Your vehicle has reached the garage."`,
`DIAGNOSIS_SUBMITTED → "The garage has completed its inspection."`,
`AWAITING_CUSTOMER_APPROVAL → "Your approval is required."` — full table lives in
`packages/shared/src/status-messages.ts` and is the only copy source for all clients.
