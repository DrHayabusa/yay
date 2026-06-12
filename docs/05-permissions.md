# Roles & Permissions

RBAC (coarse, via `@Roles()` guard) + object-level policies (fine, in services: actor must own /
be assigned to the object — IDOR protection on every read & write).

Roles: `CUSTOMER, RECOVERY_DRIVER, PROVIDER_ADMIN, GARAGE_TECHNICIAN, GARAGE_MANAGER, SUPPLIER,
DELIVERY_DRIVER, ADMIN, SUPPORT_AGENT, QC_INSPECTOR`. A user may hold multiple roles
(`UserRole` join table).

| Capability | CUST | RC-DRV | PROV-ADM | G-TECH | G-MGR | SUPPL | DLV | ADMIN | SUPPORT | QC |
|---|---|---|---|---|---|---|---|---|---|---|
| Register/manage own vehicles | ✅ | | | | | | | ✅ | | |
| Create service request | ✅ (own vehicle) | | | | | | | ✅ (on behalf) | ✅ (on behalf) | |
| View case | own | assigned | own drivers' | assigned garage | assigned garage | own orders only | assigned | all | all | assigned |
| Cancel case | own, pre-collection | | | | | | | ✅ | ✅ | |
| Accept/reject recovery job | | ✅ | ✅ | | | | | assign manually | | |
| Update recovery statuses (4–8) | | ✅ assigned | | receipt confirm | receipt confirm | | | override | | |
| Driver/truck management | | | ✅ own fleet | | | | | ✅ | | |
| Start/record inspection | | | | ✅ | ✅ | | | | | |
| Submit diagnosis & quotation | | | | draft | ✅ submit | | | | | |
| Approve/reject quote items | ✅ own | | | | | | | | | |
| Select spare part option | ✅ own | | | | | | | | | |
| Confirm part compatibility | | | | ✅ | ✅ | | | ✅ (platform verifier) | | |
| Manage catalogue/inventory | | | | | | ✅ own | | ✅ | | |
| Fulfil part orders (14–15) | | | | | receipt | ✅ | ✅ | | | |
| Update repair stages (16–17) | | | | ✅ | ✅ | | | | | |
| QC sign-off (18) | | | | | ✅ fallback | | | | | ✅ |
| Delivery statuses (19–21) | OTP confirm | ✅ if assigned | | | ✅ | | ✅ | | | |
| Pay / view own invoices | ✅ | | | | | | | | | |
| Refunds | request | | | | | | | ✅ approve | ✅ initiate | |
| Disputes | open | respond | respond | | respond | respond | | resolve | manage | |
| Chat on case | ✅ own | ✅ assigned | | | ✅ assigned | | ✅ assigned | ✅ | ✅ | |
| Verification/approval of providers, garages, suppliers | | | | | | | | ✅ | | |
| Pricing/commission/service-area config | | | | | | | | ✅ | | |
| Promotions, content, notifications mgmt | | | | | | | | ✅ | | |
| Audit logs, fraud alerts, analytics | | | | | | | | ✅ | read-limited | |
| Earnings/settlement dashboards | | own | ✅ own | | ✅ own | ✅ own | own | all | | |
| Ratings | ✅ give | receive+view | view | | receive+view | receive+view | receive | moderate | moderate | |

Notes
- SUPPORT_AGENT acts on a customer's behalf only with case-linked actions; every such action is
  audit-logged with `onBehalfOf`.
- ADMIN destructive/override actions require a reason string; stored in `AuditLog` and `StatusHistory.isOverride`.
- Object-level rule of thumb implemented in code: *“no role ever queries by ID alone; every query
  is scoped by the actor's relationship to the object.”*
