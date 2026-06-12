# Data Model

Source of truth: `apps/api/prisma/schema.prisma`. Highlights and conventions:

- IDs: `cuid()` strings. All tables: `createdAt`, `updatedAt`. Soft delete (`deletedAt`) on
  User, Vehicle, Garage, Supplier, ProviderProfile, SparePart, SupplierInventory.
- Money: `Decimal @db.Decimal(12, 2)` + `currency` (default `AED`). Never floats.
- Enums for all statuses/conditions/roles (Postgres enums via Prisma).
- Every state change → `StatusHistory` (immutable, append-only). Every privileged mutation →
  `AuditLog`.

## Entity groups

**Identity & parties:** `User` (phone unique, email optional, passwordHash optional —
phone-OTP-first), `UserRole` (user↔role, unique pair), `RefreshToken` (hashed, rotation
family, revocation), `OtpCode` (hashed code, purpose, expiry, attempts), `CustomerProfile`,
`ProviderProfile` (recovery company; trade licence, verification status), `Driver`
(belongs to provider, licence, availability), `RecoveryVehicle` (plate, type, capacity,
verification), `Garage` (trade licence, geo, capacity, verification), `Technician`
(belongs to garage), `Supplier` (trade licence, verification).

**Vehicles:** `Vehicle` (customer-owned: make/model/year/VIN unique-per-active/plate
emirate+code+number, engine), `VehicleDocument` (registration card etc.).

**Case core:** `ServiceRequest` (customer, vehicle, type, status, safety answers, canMove,
description, garage?, currency totals), `Location` (polymorphic point: case pickup, driver ping,
garage; lat/lng + recordedAt + source), `ServiceRequestMedia` (kind: VEHICLE_PHOTO / PLATE_PHOTO /
VOICE_NOTE / DAMAGE_VIDEO / EVIDENCE; S3 key, mime, size, scanStatus), `StatusHistory`
(from/to, actor, role, lat/lng, notes, isOverride, evidence media link).

**Recovery:** `RecoveryAssignment` (case↔driver↔truck, offered/accepted/rejected timestamps,
distances, fee), `VehicleHandover` (PICKUP | GARAGE_DELIVERY | CUSTOMER_DELIVERY; otpHash,
verifiedAt, photos, signature key, gps).

**Garage flow:** `Inspection` (case, technician, checklist JSON, startedAt/submittedAt),
`DiagnosticFinding` (inspection, title, plainLanguageSummary, severity, evidence media),
`RepairItem` (finding→work unit: labour description, hours, status:
PENDING/APPROVED/REJECTED/IN_PROGRESS/DONE), `QualityInspection` (checklist, result, inspector).

**Commerce:** `Quotation` (case, version, status DRAFT/PUBLISHED/PARTIALLY_APPROVED/APPROVED/
REJECTED/SUPERSEDED; totals incl. VAT, platform fee), `QuotationItem` (LABOUR | PART | FEE;
qty, unitPrice, lineTotal, repairItem?, requiresPart), `CustomerApproval` (item-level decision,
actor, ip/device, immutable), `SparePart` (canonical part: OEM number, name, category),
`PartCompatibility` (part↔make/model/year-range/engine, verifiedBy), `SupplierInventory`
(supplier×part: condition OEM_GENUINE/AFTERMARKET_PREMIUM/AFTERMARKET_STANDARD/USED_REFURBISHED,
price, stockQty, warrantyMonths, deliveryEtaHours), `PartOrder` (case, supplier, status,
compatibilityConfirmedBy/At — **NOT NULL before CONFIRMED**, enforced in service + DB check),
`PartOrderItem`.

**Money:** `Payment` (case, kind RECOVERY/DIAGNOSTIC/REPAIR/PARTS/DELIVERY/FEE, provider,
intent id, status, idempotencyKey unique, amounts: subtotal/vat/platformFee/total),
`Refund`, `Invoice` (sequential number, pdf key, line snapshot JSON), `Settlement`
(payee party, period, gross/commission/net, status), `Warranty` (case/items, months, terms).

**Engagement & ops:** `Notification` (user, messageCode, params JSON, channels, readAt),
`ChatConversation`/`ChatMessage` (case-scoped), `Rating` (case, ratee party type, stars,
comment, one per rater↔ratee↔case), `Complaint`, `Dispute` (case freeze flag),
`AuditLog` (actor, action, entity, before/after JSON, ip, onBehalfOf).

## Key indexes & constraints

- `ServiceRequest(status, createdAt)`, `ServiceRequest(customerId)`, `ServiceRequest(garageId, status)` — queues.
- `Location(serviceRequestId, recordedAt)` — tracking playback; lat/lng `Decimal(9,6)`.
- `RecoveryAssignment(driverId, status)`, partial-unique: one ACTIVE assignment per case.
- `Payment(idempotencyKey)` unique; `Payment(providerIntentId)` unique.
- `Quotation(serviceRequestId, version)` unique. `CustomerApproval(quotationItemId)` unique.
- `UserRole(userId, role)` unique. `Vehicle(vin)` unique where `deletedAt IS NULL` (partial).
- `SupplierInventory(supplierId, sparePartId, condition)` unique.
- FK `onDelete: Restrict` on money/state tables (no cascading loss of audit data).
