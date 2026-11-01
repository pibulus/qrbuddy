# SoftStack Passport (canonical)

One code, one identity, many stamps.

Pure helpers only: `code.js` owns namespaces and formatting, `identity.js` owns
the deterministic name/phrase/avatar/skin. Each app supplies HMAC-SHA256 and
SHA-256 from its own runtime.

- Code: HMAC(`softstack-passport-code:<seed>`, passport secret) → first 12 hex
  → `SS-XXXX-XXXX-XXXX`.
- Identity: SHA-256(`softstack-passport-id:<code>`) →
  `generateMemberIdentity(hash, code)`.
- Token: HS256, `{ sub: code, stamps: [app], tier: "supporter", exp }`, signed
  with the same shared secret in every app.

Vendored copies must match this directory byte-for-byte; run the drift test in
each app.
