# QRBuddy Tests

## Offline unit suite

Run the deterministic, local-only tests with:

```bash
deno task test:unit
```

This explicit file list has no network permission and does not load `.env`. CI
runs this suite. It covers QR payload and file validation, license signing,
in-app browser detection, URL-peek rejection, R2 signing, durable rate-limit
logic, dynamic QR preview responses, and Square checkout/webhook logic.

## Opt-in integration and stress tests

`edge-functions_test.ts` and `remediation_test.ts` call live Supabase functions.
Use a disposable staging/test project and configure its URL and anon key in the
shell. Do not point these tests at production. The cleanup-backed checks may
also need a service-role key, which must remain outside the Fresh app.

```bash
deno test --allow-net --allow-env --allow-read \
  tests/edge-functions_test.ts tests/remediation_test.ts
```

`deno task test` scans every test file and grants network access. Use it only
with disposable test credentials after reviewing the stress suite; prefer the
explicit commands above.

`stress_test.ts` is a separate opt-in load test. Review its target and workload
before running; it is excluded from CI and `test:unit`.

## Files

- `logic_test.ts` — QR payloads, validation, file checks, and splash config.
- `license_test.ts` — supporter token signing and verification.
- `inAppBrowser_test.ts` — supported in-app browser detection and messages.
- `peek_test.ts` — rejects missing, invalid, internal, and private URLs.
- `r2_test.ts` — offline R2 path validation, file caps, and SigV4 URL shape.
- `rate_limit_test.ts` — injected-RPC rate-limit decisions and failure modes.
- `dynamic_qr_preview_test.ts` — neutral responses for link-preview bots.
- `square_test.ts` — payment configuration, amount checks, and webhook logic.
- `edge-functions_test.ts`, `remediation_test.ts` — opt-in live Supabase
  regressions.
- `stress_test.ts` — opt-in load testing.
