# QRBuddy Docs Index

Use this index to avoid treating old audit/session notes as current operating
instructions.

## Current Operational Docs

- [`../README.md`](../README.md) - Product overview, local dev, project map, and
  deployment overview.
- [`../CLAUDE.md`](../CLAUDE.md) - Durable agent/developer contract: commands,
  architecture, patterns, and current deployment notes.
- [`../GLOSSARY.md`](../GLOSSARY.md) - Component, utility, and core-concept
  glossary.
- [`../TINKER.md`](../TINKER.md) - Fast local quick reference for future edits.
- [`../supabase/README.md`](../supabase/README.md) - Current Supabase backend
  setup, functions, auth boundary, and file semantics.
- [`../tests/README.md`](../tests/README.md) - Current integration test files
  and caveats.

## Reference / Historical Docs

- [`SUPABASE_DEPLOYMENT_GUIDE.md`](./SUPABASE_DEPLOYMENT_GUIDE.md) - Generic
  Supabase Edge Functions guide plus historical QRBuddy hardening notes.
- [`SUPABASE_REMEDIATION_PLAN.md`](./SUPABASE_REMEDIATION_PLAN.md) - Historical
  remediation punch list with current status annotations.
- [`SUPABASE_AUDIT_REPORT.md`](./SUPABASE_AUDIT_REPORT.md) - Historical audit
  snapshot; verify against current code before acting on old findings.
- [`COMPETITIVE_FEATURES.md`](./COMPETITIVE_FEATURES.md) - Product/market
  feature ideas.
- [`ETHICAL_PAYMENT_SETUP.md`](./ETHICAL_PAYMENT_SETUP.md) - Payment setup
  notes; not part of the current free QR/file flow.
- `SESSION_*.md` - Time-stamped session notes. Useful archaeology, not live
  instructions.

## Current Repo Shape

- Fresh routes: 11 TSX route modules plus 1 API route.
- Islands: 40 registered Preact islands.
- Supabase edge functions: 13.
- Test files: 3 (two integration, one offline pure-logic suite).
- Production app: https://qrbuddy.app.
- Production Supabase project ref: `aqydpibnvlhcjcwosrti`.
