# Missing Requirements, Operational Risks, Technical Risks

## Missing / unclarified requirements (assumptions made for MVP)

| Topic | Assumption taken |
|---|---|
| Recovery pricing model | Flat base fee + per-km from pickup to garage, configurable per emirate zone by admin |
| Diagnostic fee | Fixed configurable fee, charged at request creation or waived into repair invoice — admin-configurable; MVP charges it with recovery payment |
| Who chooses the garage | MVP: admin assigns nearest approved garage; customer informed, not choosing |
| Cancellation fees | Free before recovery assignment; configurable fee after driver en route |
| Part returns | Supplier-level returns only via support ticket in MVP |
| Used parts legality | "Where permitted" — flag per part category, default off until legal review |
| Customer payment timing | Recovery + diagnostic paid at dispatch; repair paid in full at quote approval (deposit/partial supported in schema, disabled in MVP UI) |
| Corporate / fleet accounts | Out of MVP; schema keeps `CustomerProfile` separable for it |
| Insurance recovery cases | Out of MVP |

## Operational risks

1. **Supply density** — too few approved recovery trucks/garages in Dubai+Sharjah at launch →
   manual curation, admin manual assignment, capped service polygons.
2. **Quote inflation by garages** — mitigated by per-item approval, photo evidence required per
   finding, admin price-change approval threshold, audit trail, rating pressure.
3. **Off-platform leakage** (garage deals directly with customer) — payments through platform,
   warranty only valid for platform-paid work, provider agreements.
4. **Wrong-part deliveries** — compatibility confirmation gate + VIN-based fitment + garage
   acceptance step on delivery.
5. **Stranded-customer safety** — emergency interstitial, "safe location" question routes to
   priority queue, support escalation path.
6. **Cash culture** — MVP is cashless-only by design; revisit COD for recovery if conversion suffers.

## Technical risks

1. **Real-time tracking scale** — WebSocket gateway behind Redis pub/sub; location pings rate-limited;
   degrade to 10s polling.
2. **State-machine corruption** — single transition service, DB transaction + row lock per case,
   all mutations append `StatusHistory`.
3. **Payment double-charging** — idempotency keys on payment/order endpoints, webhook signature
   validation, ledger reconciliation job.
4. **Media abuse** — size/type validation, presigned uploads, AV-scan hook, EXIF GPS/timestamp captured
   server-side, not trusted from client.
5. **Vendor lock-in (maps, SMS, payments, push)** — every external service behind a provider
   interface with a dev/mock implementation.
6. **Arabic/RTL debt** — i18n keys from day one in Flutter and status messages stored as message
   codes, never hardcoded English strings.
