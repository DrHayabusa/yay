# System Architecture

## Overview

Modular monorepo, single deployable backend (modular monolith) — correct choice at MVP scale;
modules are bounded so they can be split into services later.

```
┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│ Flutter app │  │ Flutter app │  │  Next.js     │
│ (customer)  │  │ (provider/  │  │  admin web   │
│             │  │  garage)*   │  │              │
└──────┬──────┘  └──────┬──────┘  └──────┬───────┘
       │   HTTPS REST + WebSocket        │
       └──────────────┬──────────────────┘
              ┌───────▼────────┐
              │  NestJS API    │  modules: auth, users, vehicles,
              │ (modular mono) │  service-requests, recovery, garage,
              │                │  quotations, parts, orders, payments,
              │                │  notifications, chat, admin, audit
              └───┬───────┬────┘
          ┌───────▼──┐ ┌──▼──────┐ ┌────────────┐
          │ Postgres │ │  Redis  │ │ S3-compat  │
          │ (Prisma) │ │ cache + │ │ objects    │
          │          │ │ queues +│ │ (MinIO dev)│
          │          │ │ pub/sub │ └────────────┘
          └──────────┘ └─────────┘
   External (behind provider interfaces, mock impls in dev):
   SMS-OTP · Payment gateway · FCM push · Maps/geocoding · AV scan
```

\* MVP ships one Flutter codebase with role-aware navigation (customer first; driver/garage
flows added in later milestones — shared design system and API client).

## Key decisions

| Concern | Decision | Rationale |
|---|---|---|
| Backend | NestJS 11 + TypeScript, modular monolith | Required stack; module boundaries = future service seams |
| DB | PostgreSQL 16 + Prisma | Relational integrity for money/state; Prisma migrations |
| Money | `Decimal(12,2)` columns, integer-fils arithmetic in services | No floats, ever |
| State machine | Single `CaseStateMachine` service; transition table = data; every change in a transaction with `SELECT … FOR UPDATE` and a `StatusHistory` append | One authority, auditable |
| Real-time | Socket.IO gateway, Redis adapter; rooms per case (`case:{id}`) | Tracking + status pushes |
| Queues | BullMQ on Redis | Notifications, webhook processing, settlement jobs |
| Files | Presigned PUT to S3-compatible store (MinIO in dev); server records metadata, AV-scan hook before media becomes "verified" | Backend never proxies bytes |
| Maps | `GeoService` interface → Google Maps impl + Haversine dev impl | Abstraction layer requirement |
| AuthN | Phone OTP → JWT access (15 min) + refresh (30 d, rotated, hashed at rest, family-revocation on reuse) | Spec |
| AuthZ | Role guard (RBAC) + object-level policy checks in every service (IDOR protection) | Spec |
| i18n | API returns message **codes**; clients localise (en/ar) | RTL from day one |
| API docs | OpenAPI via Nest Swagger at `/docs` | Spec |
| Idempotency | `Idempotency-Key` header on POST /payments, /orders; key+hash stored, replay returns cached response | Spec |

## Environments

`docker compose up` → Postgres, Redis, MinIO, API (watch mode), admin (dev).
Mock providers (SMS, payments, push) log to console and expose dev-only inspection endpoints.
Secrets via `.env` (never committed); `.env.example` documents every variable.
