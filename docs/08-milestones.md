# Implementation Plan — Milestones

Each milestone is independently runnable and tested before the next begins.

| M | Deliverable | Contents | Exit criteria |
|---|-------------|----------|---------------|
| **M0** | Planning docs | PRD, risks, architecture, data model, state machine, permissions, API, repo structure | docs reviewed |
| **M1** | Monorepo + infra | pnpm workspaces, docker-compose (Postgres, Redis, MinIO), shared package, lint/format/tsconfig baseline | `docker compose up` works; `pnpm lint` green |
| **M2** | Backend core | NestJS app, Prisma schema (all entities) + initial migration, config, health, Swagger, error envelope, request-id, rate limiting | API boots; migration applies; unit tests green |
| **M3** | Auth + RBAC | OTP request/verify (mock SMS provider), JWT access/refresh with rotation + reuse detection, roles guard, object-policy helpers, audit log | auth e2e/unit tests green |
| **M4** | Case engine | Vehicles, media presign, service-request creation (safety questions, estimate), state machine + StatusHistory, timeline endpoint, manual admin assignment | state-machine unit tests cover every legal/illegal transition |
| **M5** | Recovery & garage flows | Driver job accept, location pings + WS tracking, OTP handovers, inspection → findings → quotation, per-item approval | flow integration tests green |
| **M6** | Parts & payments | Catalogue, search, compatibility gate, part selection, orders; payment intents (mock provider + gateway interface), webhook signature validation, idempotency, refunds, invoices | payment idempotency + compatibility-gate tests green |
| **M7** | Admin dashboard (Next.js) | Login, verification queues, live case board, manual assignment, pricing config, refunds | runs locally against API |
| **M8** | Flutter customer app | Onboarding/OTP, vehicles, breakdown wizard (GPS, camera, voice, safety), timeline, approval & parts comparison screens, payments, en/ar | builds with Flutter SDK (not available in this CI env — source complete) |
| **M9** | Provider & garage mobile flows + notifications | Driver and garage roles in Flutter app, FCM integration point, BullMQ notification fan-out | end-to-end demo script passes |
| **M10**| Hardening | AV-scan hook, data-retention jobs, account deletion, settlement job, fraud alert rules, load test on tracking | security checklist in PRD §7 closed |

Post-MVP phases: auto-dispatch, garage choice/bidding, open marketplace, Emirates-ID KYC,
insurance, predictive maintenance — schema already accommodates them.
