# QRBuddy Docs Index

Use this index to distinguish live operational contracts from historical audit
and session notes.

## Current Operational Docs

- [`../README.md`](../README.md) — Product overview, local dev, project
  structure, and deployment overview.
- [`../CLAUDE.md`](../CLAUDE.md) — Durable agent/developer contract: commands,
  architecture, design laws, and `v2.0.0` release seal.
- [`../GLOSSARY.md`](../GLOSSARY.md) — Component, utility, and core-concept
  glossary.
- [`../TINKER.md`](../TINKER.md) — Fast local quick reference for targeted
  edits.
- [`../supabase/README.md`](../supabase/README.md) — Current Supabase backend
  setup, Edge Functions, auth boundary, and file/analytics semantics.
- [`../tests/README.md`](../tests/README.md) — Offline unit test suite
  (`deno task test:unit`) and opt-in live integration test boundaries.
- [`QRBUDDY-HOMEWORK-AND-MONEY-PLAYBOOK.md`](./QRBUDDY-HOMEWORK-AND-MONEY-PLAYBOOK.md)
  — Launch playbook, conversion unit economics ("1 sale a day" math), 5-minute
  physical smoke checklist, and copy-paste launch posts.
- [`ETHICAL_PAYMENT_SETUP.md`](./ETHICAL_PAYMENT_SETUP.md) — Square checkout and
  QRBuddy Passport (`~$32 USD / A$49` for 365 days, no auto-renewal) operations
  contract.
- [`SUPABASE_DEPLOYMENT_GUIDE.md`](./SUPABASE_DEPLOYMENT_GUIDE.md) — Supabase
  Edge Functions deployment reference.
- [`COMPETITIVE_FEATURES.md`](./COMPETITIVE_FEATURES.md) — Competitive matrix
  and feature reference.

## Historical Archive (`docs/archive/`)

Dated audit reports, review snapshots, and session logs live in
[`./archive/`](./archive/):

- `RELEASE-2026-10-13.md`, `LAUNCH-READINESS-2026-10-13.md`,
  `FEATURE-FLOWS-2026-10-13.md`
- `COMMERCIAL-PRIORITIES-2026-10-13.md`, `OFFER-DECISION-2026-10-13.md`,
  `QRBUDDY-PLUS-OFFER-AND-BUILD-BRIEF-2026-10-13.md`,
  `PLUS-LIBRARY-RESULTS-2026-10-14.md`
- `GENERATOR-POLISH-*` (Oct 13–14 generator polish review cycle)
- `SUPABASE_AUDIT_REPORT.md`, `SUPABASE_REMEDIATION_PLAN.md`,
  `CULT-CODE-AUDIT.md`, `FABLE-AUDIT.md`
- `SESSION_2026_04_16.md`, `SESSION_2026_05_08.md`

## Current Production Footprint

- **Production Web App**: `https://qrbuddy.app` & `https://qrbuddy.app/es` (Deno
  Deploy org `pibulus`, app `qrbuddy`)
- **Production Supabase Project Ref**: `aqydpibnvlhcjcwosrti`
- **Current Sealed Release**: `v2.0.0` (2026-10-27)
