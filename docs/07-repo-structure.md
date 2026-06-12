# Repository Structure

pnpm workspaces monorepo.

```
.
├── docs/                       # PRD, architecture, state machine, permissions, API, milestones
├── docker-compose.yml          # postgres, redis, minio
├── package.json                # workspace root (lint/test/build scripts fan out)
├── pnpm-workspace.yaml
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── main.ts, app.module.ts
│   │   │   ├── common/         # guards, decorators, filters, interceptors, pipes, money utils
│   │   │   ├── infra/          # prisma, redis, storage(S3), providers (sms, payments, push, geo) — interface + mock + real impls
│   │   │   └── modules/
│   │   │       ├── auth/  users/  vehicles/  media/
│   │   │       ├── service-requests/   # controller, service, state-machine.ts, pricing
│   │   │       ├── recovery/  garage/  quotations/  parts/  payments/
│   │   │       ├── notifications/  chat/  ratings/  admin/  audit/
│   │   └── test/               # unit + e2e
│   ├── admin/                  # Next.js (TypeScript) dashboard
│   └── mobile/                 # Flutter app (customer-first, role-aware)
└── packages/
    └── shared/                 # status enums, message codes (en/ar), API types, money helpers
```

Rules: apps may depend on `packages/*`, never on each other. External services only via
`apps/api/src/infra/providers/*` interfaces. No secrets in the repo — `.env.example` only.
