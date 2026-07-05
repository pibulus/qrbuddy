# QRBuddy Tests

Integration tests for QRBuddy Supabase Edge Functions.

## Running Tests

Configure environment variables first:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional, only used by cleanup helpers. Do not expose this to the Fresh app.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run all tests:

```bash
deno task test
```

Run a specific file:

```bash
deno test --allow-net --allow-env --allow-read tests/edge-functions_test.ts
deno test --allow-net --allow-env --allow-read tests/remediation_test.ts
```

## Test Files

- `edge-functions_test.ts` - Dynamic QR validation, upload-file validation, and
  basic redirect/get-dynamic checks. Tests auto-skip when `SUPABASE_URL` or
  `SUPABASE_ANON_KEY` is missing.
- `remediation_test.ts` - Locker security regression flow: password bucket
  creation, owner-token upload, invalid-token rejection, blocked file upload,
  POST-only protected download, and metadata redaction. If functions are not
  reachable, the setup step logs and exits early.
- `logic_test.ts` - 23 offline pure-logic tests (QR payload formatting,
  validation, file checks, splash config) — no network or env needed.

## Notes

- These are integration tests against real edge functions, not unit tests.
- Rate limiting tests are marked ignored because remote/serverless timing makes
  them flaky.
- Be careful running cleanup-backed tests against production projects; prefer a
  test Supabase project when service-role cleanup is enabled.

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add unit tests for utility functions
- [ ] Add full destructible file lifecycle tests, including finite multi-file
      zip behavior
- [ ] Mock Supabase for faster unit tests
- [ ] Add CI/CD integration with GitHub Actions
