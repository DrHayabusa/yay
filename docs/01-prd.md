# Product Requirements Document — "Sanad" Vehicle Recovery & Repair Platform (working name)

**Market:** UAE (launch: Dubai & Sharjah) · **Languages:** English + Arabic (RTL) · **Currency:** AED (5% VAT)

## 1. Problem

When a vehicle breaks down in the UAE, the driver must separately find a recovery truck, a
trustworthy garage, and fairly priced spare parts — with no price transparency, no tracking, and no
recourse. The platform manages the whole journey: breakdown → recovery → garage diagnosis →
itemised quote → part selection → payment → repair → quality check → delivery back to the customer.

## 2. Core principle

> **A photograph is never a diagnosis.** Photos/videos/voice notes are used only for vehicle
> verification, number-plate verification, damage documentation, and rough triage. The binding
> technical diagnosis and quotation come **only** from an approved garage after physical inspection.

A second hard rule: **a customer can never order an incompatible part.** Every part order must pass
compatibility confirmation (garage technician or platform verifier) before it can be confirmed.

A third: **no repair work and no part purchase before explicit customer approval** of each line item.

## 3. User roles

| # | Role | Summary |
|---|------|---------|
| 1 | Customer | Owns vehicles, raises requests, approves quotes, pays, rates |
| 2 | Recovery driver / company | Accepts jobs, picks up and transports vehicles |
| 3 | Garage technician | Inspects, diagnoses, performs repair, records parts |
| 4 | Garage manager | Owns garage account, submits quotations, manages queue & settlement |
| 5 | Spare-parts supplier | Lists inventory, fulfils part orders |
| 6 | Delivery driver | Delivers parts to garages / vehicles to customers (optional in MVP) |
| 7 | Platform administrator | Verification, assignment, pricing, refunds, full oversight |
| 8 | Customer-support agent | Case visibility, complaints, disputes, limited actions |
| 9 | Quality-control inspector | Post-repair QC checklist sign-off |

All supply-side participants (recovery companies, garages, suppliers) are **curated and manually
verified** in the MVP — trade licence, identity, and vehicle checks done by admins.

## 4. Customer journey (happy path)

1. Register with phone + OTP, add vehicle(s) (make/model/year/VIN/plate).
2. Open breakdown request → app captures GPS, vehicle photos/video, plate photo, text or voice
   description, "can the vehicle move?", "are you in a safe location?".
   **Safety interstitial:** if accident / injury / fire / fuel leak / road danger → show
   "Call 999 (Police) / 997 (Fire) / 998 (Ambulance) first" before anything else.
3. Case created with recovery price estimate + ETA.
4. Recovery assigned (MVP: manually by admin; later: auto-dispatch to nearby providers).
5. Live tracking of recovery truck; OTP-verified handover at pickup.
6. Vehicle delivered to approved garage (OTP-verified delivery).
7. Garage inspects → diagnostic report (findings, photos, labour, required parts, ETA).
8. Customer sees plain-language diagnosis + itemised quote; approves/rejects **per line item**.
9. For each required part: compare Genuine OEM / premium aftermarket / standard aftermarket /
   used-refurbished (where permitted) with price, brand, condition, warranty, supplier, delivery
   time, compatibility badge.
10. Customer approves final quote → pays in-app (card via UAE gateway; held in platform ledger —
    see Payments note below).
11. Parts ordered & delivered to garage; repair progresses through defined stages with
    notifications at every stage.
12. QC inspection → delivery back to customer (OTP confirmation) → final invoice, warranty,
    service history, ratings for recovery / garage / supplier / overall.

## 5. MVP scope

**In:** customer registration, vehicle registration, breakdown request with GPS + media,
**manual** recovery assignment by admin, recovery-driver workflow with OTP handovers, garage
inspection + diagnosis, itemised quotation, per-item customer approval, limited curated parts
catalogue with compatibility gate, payment workflow (single capture, refunds), case timeline +
notifications, delivery confirmation, admin dashboard.

**Out (deliberately, architecture stays extensible):** AI diagnosis, open seller marketplace,
garage bidding, insurance integrations, predictive maintenance, autonomous nationwide dispatch,
in-app voice calls.

## 6. Payments (positioning)

The platform collects payment up-front into its merchant account via a UAE-supported gateway
(e.g. Stripe UAE / Telr / Network International / Checkout.com — final choice needs commercial +
compliance review) and settles providers after milestone completion. This is described as
**"payment held by the platform until work is confirmed"** — *not* as regulated escrow, unless the
chosen PSP and legal structure explicitly support escrow. Marked as `REQUIRES-EXTERNAL`:
gateway credentials, merchant onboarding, and legal review.

## 7. Compliance & integration points requiring external sign-off (`REQUIRES-EXTERNAL`)

- Payment gateway merchant account & webhook secrets.
- SMS OTP provider (e.g. Twilio/Unifonic) — UAE sender-ID registration.
- Emirates ID verification (UAE PASS / approved KYC vendor) — optional, post-MVP.
- Google Maps / Mapbox billing keys.
- FCM project for push notifications.
- Malware scanning for uploads (e.g. ClamAV service or cloud AV) — integration point provided.
- UAE data-protection (PDPL) review for retention/deletion policy; VAT registration for invoicing.

## 8. Success metrics (MVP)

Time-to-recovery-assignment, pickup ETA accuracy, quote approval rate, dispute rate,
NPS per role, payment success rate, % cases closed without support intervention.
