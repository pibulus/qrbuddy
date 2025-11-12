# QRBuddy Tests

Basic integration tests for QRBuddy edge functions.

## Running Tests

### Prerequisites

1. Configure your `.env` file with Supabase credentials:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Run All Tests

```bash
deno test --allow-net --allow-env --allow-read
```

### Run Specific Test File

```bash
deno test --allow-net --allow-env --allow-read tests/edge-functions_test.ts
```

### Watch Mode (for development)

```bash
deno test --allow-net --allow-env --allow-read --watch
```

## Test Coverage

Current test coverage includes:

### Edge Functions
- ✅ **create-dynamic-qr**
  - Rate limiting enforcement
  - Required field validation
  - Successful QR creation

- ✅ **upload-file**
  - Executable file blocking
  - File size limit enforcement

- ✅ **redirect-qr**
  - Missing code parameter handling

- ✅ **get-dynamic-qr**
  - Token requirement validation

## Notes

- Tests will be skipped automatically if `SUPABASE_URL` is not configured
- Rate limiting tests may affect your actual edge function usage temporarily
- Tests use real edge functions (not mocked) for integration testing

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add unit tests for utility functions
- [ ] Add tests for destructible file flow
- [ ] Mock Supabase for faster unit tests
- [ ] Add CI/CD integration with GitHub Actions
