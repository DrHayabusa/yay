# Sanad — Vehicle Breakdown Recovery & Repair Platform (UAE)

End-to-end platform for the breakdown → recovery → garage diagnosis → itemised quote →
spare-parts selection → payment → repair → quality check → delivery journey.
Launch market: Dubai & Sharjah. English + Arabic.

**Core product rules (enforced in code, not just policy):**
1. A photograph is never a diagnosis — binding diagnosis comes only from an approved garage
   after physical inspection (state machine blocks repair before `DIAGNOSIS_SUBMITTED`).
2. A customer can never order an incompatible part — selection is filtered by verified
   fitment data, re-verified server-side, and orders carry a DB `CHECK` that they cannot be
   confirmed without a recorded compatibility confirmation.
3. No repair work and no part purchase before explicit per-item customer approval.

## Repository layout

| Path | What |
|---|---|
| `docs/` | PRD, risks, architecture, data model, state machine, permissions, API design, milestones |
| `apps/api` | NestJS + Prisma backend (the platform core) |
| `apps/admin` | Next.js operations dashboard |
| `apps/mobile` | Flutter app (customer-first, role-aware; needs the Flutter SDK to build) |
| `packages/shared` | Case statuses, en/ar status copy, money helpers (integer fils) |

## Running locally

Prerequisites: Node 22+, pnpm 10+, Docker (or local PostgreSQL 16), Flutter SDK (mobile only).

```bash
pnpm install

# 1. Infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d
# — or use a local Postgres and create db/user matching apps/api/.env.example

# 2. Backend
cp apps/api/.env.example apps/api/.env     # dev defaults; set real secrets outside source
pnpm db:migrate                             # apply Prisma migrations
pnpm db:seed                                # demo provider/garage/supplier + pricing
pnpm dev:api                                # http://localhost:3000  (Swagger at /docs)

# 3. Admin dashboard
pnpm dev:admin                              # http://localhost:3001

# 4. Mobile (requires Flutter SDK)
cd apps/mobile && flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

**Dev login:** request an OTP for a seeded phone (e.g. admin `+971500000001`) —
the mock SMS provider prints the code in the API console.

## Quality gates

```bash
pnpm typecheck   # all workspaces
pnpm lint
pnpm test        # 60+ unit tests: state machine, OTP, money, webhook signatures
pnpm build
```

## Simulating a payment webhook (dev)

The mock gateway verifies a real HMAC-SHA256 signature over the raw body:

```bash
BODY='{"providerIntentId":"<intent-id>","type":"payment.captured"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" -r | cut -d' ' -f1)
curl -X POST localhost:3000/api/v1/payments/webhook \
  -H "Content-Type: application/json" -H "x-webhook-signature: $SIG" -d "$BODY"
```

## Integrations requiring external credentials / approval (`REQUIRES-EXTERNAL`)

These are real interfaces with working dev/mock implementations — they are **not**
placeholder security. Production adapters need:

- **Payments:** UAE-supported PSP (Stripe UAE / Telr / Network International / Checkout.com),
  merchant onboarding, legal review of the funds-holding model (do not describe as escrow
  without PSP + legal support).
- **SMS OTP:** UAE-registered sender ID (Unifonic/Twilio).
- **Push:** Firebase Cloud Messaging project.
- **Maps:** Google Maps or Mapbox keys (dev uses haversine distances).
- **Malware scanning:** AV service wired to the media `scanStatus` hook.
- **Emirates ID / KYC:** approved provider (post-MVP).

## Design language

Both UIs share a bespoke identity — **"job ticket / road"** — built by hand, no component
library: asphalt darks with a signal-amber accent, hazard-stripe brand strip, UAE number
plates rendered as physical objects, case history drawn as a road with a dashed centerline,
ticket-style cards with perforated stub edges, Space Grotesk + IBM Plex Mono typography
(web), and tight radii throughout. The Flutter app implements the same system with custom
painters (`lib/widgets/`): `HazardStrip`, `SanadLogo`, `PlateChip`, `RoadTimeline`, and the
notched `BigAction` hero.

## Status

Milestones M0–M4 complete, M5–M7 substantially complete (see `docs/08-milestones.md`):
backend core, auth + RBAC, full state machine, recovery/garage/quotation/parts/payments
flows; admin console with live case board, case detail (road timeline, quotation, payments),
verification queues and pricing config; Flutter app with custom design system, home, login,
breakdown wizard, vehicles, and timeline. Next: WebSocket tracking, chat/ratings endpoints,
notification fan-out via BullMQ, Flutter camera/GPS/voice wiring.
