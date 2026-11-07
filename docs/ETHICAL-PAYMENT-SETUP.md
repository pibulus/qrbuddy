# QRBuddy Supporter Pass operations

This file documents the implemented Square path. It does not claim that live
checkout is configured or ready; see the dated
[release record](./RELEASE-2026-10-13.md) for the latest verified payment state.

## Product contract

- One **Supporter Pass**, priced at **A$49 AUD**.
- Access lasts **365 days**. There is no automatic renewal or recurring charge.
- It raises selected upload/creation limits and removes QRBuddy branding on
  supported note and locker pages. Free QRs, editable links, file sharing, and
  PNG/SVG exports remain free within their stated limits.
- The Square merchant location must be active and use AUD. Checkout rejects a
  location or payment that does not match the configured A$49 offer.

## Square configuration

Set these as Supabase Edge Function secrets, not Fresh/Deno Deploy variables:

```text
SQUARE_CHECKOUT_ENABLED=false
SQUARE_ENVIRONMENT=sandbox|production
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_API_VERSION=2026-01-22
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SQUARE_WEBHOOK_NOTIFICATION_URL=https://<PROJECT_REF>.supabase.co/functions/v1/square-webhook
SUPPORTER_PRICE_CENTS=4900
SUPPORTER_CURRENCY=AUD
```

Checkout remains unavailable unless the explicit enable flag is `true` and all
required Square values are present. Enable it only after the release checks.
Keep `SUPABASE_SERVICE_ROLE_KEY` in the same Supabase secret boundary. Fresh
receives only the public Supabase URL and anon key.

Register a dedicated QRBuddy webhook in Square for the `payment.updated` event
at the exact `SQUARE_WEBHOOK_NOTIFICATION_URL` above. The registered URL must
match the configured notification URL because Square signs the URL and raw
request body. Use the signing key for this webhook. Keep any other product's
webhook configuration separate.

## Fulfillment and customer support

1. The app creates an idempotent checkout and stores its checkout/order IDs.
2. Square redirects the buyer back to QRBuddy. The app polls the checkout
   status; the return URL alone does not prove payment.
3. A signed `COMPLETED` payment for the configured location and exact amount
   mints a 365-day pass once. Duplicate webhook deliveries are safe to retry.
4. The pass is stored in that browser's local storage. Ask buyers to save an
   encrypted device-sync backup and its separate phrase after activation.
5. Pass recovery and refund handling are manual support work. Reconcile Square
   payment evidence and the checkout record; there is no account-based recovery
   or automatic refund-driven pass revocation.

Do not promise lifetime access, auto-renewal, automatic refund handling, or
self-service recovery. Record any change to price, currency, duration, features,
or refund policy across the UI, checkout, and support process before enabling
sales.

## Release checks

- Confirm the merchant location is active and AUD, and that the Square event
  subscription, signing key, and exact callback URL match.
- In sandbox, test paid, declined/cancelled, delayed, and duplicate event paths;
  verify checkout polling and pass activation.
- Verify backup and manual support procedures. If refund revocation is required,
  implement and test it before promising it to customers.
- Treat a successful Square-hosted checkout page as insufficient evidence of
  fulfillment. Record the exact live payment state in the dated release record.
