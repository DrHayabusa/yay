# API Design

Base: `/api/v1`. OpenAPI served at `/docs`. Auth: `Authorization: Bearer <access JWT>`.
All write endpoints validate DTOs (class-validator, whitelist+forbidNonWhitelisted — mass-assignment safe).

## Conventions

**Error envelope (consistent across all endpoints):**
```json
{ "statusCode": 422, "error": "VALIDATION_FAILED",
  "message": "plateNumber must match UAE plate format",
  "details": [{ "field": "plateNumber", "code": "format" }],
  "requestId": "req_01J..." }
```
Codes: `UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VALIDATION_FAILED, CONFLICT, INVALID_TRANSITION,
COMPATIBILITY_NOT_CONFIRMED, APPROVAL_REQUIRED, OTP_INVALID, OTP_EXPIRED, RATE_LIMITED,
IDEMPOTENCY_CONFLICT, PAYMENT_FAILED`.

Lists: cursor pagination `?cursor=&limit=` → `{ "data": [...], "nextCursor": "..." }`.
Money: strings with 2 decimals + currency: `{ "amount": "350.00", "currency": "AED" }`.

## Endpoint map (MVP set)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/otp/request`, `POST /auth/otp/verify` (→ tokens), `POST /auth/refresh` (rotation), `POST /auth/logout`, `POST /auth/register` |
| Profile | `GET/PATCH /me`, `DELETE /me` (privacy workflow), `GET /me/notifications` |
| Vehicles | `GET/POST /vehicles`, `GET/PATCH/DELETE /vehicles/:id`, `POST /vehicles/:id/documents` |
| Media | `POST /media/presign` → presigned PUT URL, `POST /media/:id/complete` |
| Service requests | `POST /service-requests`, `GET /service-requests`, `GET /service-requests/:id`, `GET /service-requests/:id/timeline`, `POST /service-requests/:id/cancel`, `POST /service-requests/:id/transition` (role-guarded, body: `{toStatus, notes?, lat?, lng?, evidenceMediaIds?, otp?}`) |
| Recovery | `GET /recovery/jobs` (nearby, driver), `POST /recovery/jobs/:id/accept|reject`, `POST /recovery/assignments/:id/location` (ping), `GET /service-requests/:id/tracking` (+ WS room `case:{id}`), `POST /recovery/assignments/:id/handover` (OTP + photos) |
| Garage | `GET /garage/queue`, `POST /service-requests/:id/inspection`, `POST /inspections/:id/findings`, `POST /inspections/:id/submit` |
| Quotations | `GET /service-requests/:id/quotation`, `POST /quotations/:id/items/:itemId/approve|reject`, `POST /quotations/:id/finalize` |
| Parts | `GET /parts/search?vin=&make=&model=&year=&engine=&partNumber=`, `GET /quotation-items/:id/part-options`, `POST /quotation-items/:id/select-part`, `POST /part-orders/:id/confirm` (server re-checks compatibility), supplier: `GET/PATCH /supplier/orders/:id`, `GET/POST /supplier/inventory` |
| Payments | `POST /payments/intents` (Idempotency-Key required), `GET /payments/:id`, `POST /payments/webhook` (signature-verified, raw body), `POST /refunds` |
| Chat | `GET/POST /cases/:id/messages` (+ WS) |
| Ratings | `POST /cases/:id/ratings` |
| Complaints | `GET/POST /complaints`, `POST /complaints/:id/messages` |
| Admin | `/admin/users`, `/admin/providers`, `/admin/garages`, `/admin/suppliers` (+ `/verify`), `/admin/cases` (+ `/assign-recovery`, `/assign-garage`), `/admin/pricing`, `/admin/service-areas`, `/admin/commissions`, `/admin/refunds`, `/admin/settlements`, `/admin/promos`, `/admin/analytics/overview`, `/admin/audit-logs` |

## Samples

`POST /service-requests`
```json
{ "vehicleId": "veh_01J…", "type": "BREAKDOWN",
  "location": { "lat": 25.2048, "lng": 55.2708, "address": "Sheikh Zayed Rd…" },
  "description": "Engine overheating, steam from bonnet",
  "voiceNoteMediaId": "med_01J…",
  "vehicleMediaIds": ["med_01J…"], "plateMediaId": "med_01J…",
  "canMove": false, "isSafeLocation": true, "emergencyFlags": [] }
```
→ `201`
```json
{ "id": "case_01J…", "status": "AWAITING_RECOVERY_ASSIGNMENT",
  "estimate": { "recoveryFee": {"amount":"250.00","currency":"AED"},
                "diagnosticFee": {"amount":"100.00","currency":"AED"},
                "vatRate": "0.05", "total": {"amount":"367.50","currency":"AED"},
                "etaMinutes": 35 },
  "payment": { "intentId": "pay_01J…", "clientSecret": "…" } }
```

`POST /service-requests/:id/transition` with an illegal move → `409`
```json
{ "statusCode": 409, "error": "INVALID_TRANSITION",
  "message": "Cannot move case from INSPECTION_IN_PROGRESS to REPAIR_IN_PROGRESS",
  "details": [{ "allowed": ["DIAGNOSIS_SUBMITTED"] }], "requestId": "req_…" }
```
