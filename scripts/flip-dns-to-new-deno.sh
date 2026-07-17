#!/usr/bin/env bash
# Flip qrbuddy.app + www off classic Deno Deploy (qrbuddy.deno.dev) onto the
# new platform, then PROVE it landed by checking response headers.
#
# PREREQ: add qrbuddy.app + www.qrbuddy.app as custom domains at
#   https://console.deno.com/pibulus/qrbuddy
# first. The console shows the CNAME target — pass it as $1.
# Flipping DNS before the console knows the domain serves errors in the gap.
#
# Usage: ./scripts/flip-dns-to-new-deno.sh <target-from-console>
set -euo pipefail

TARGET="${1:-}"
[ -z "$TARGET" ] && { echo "usage: $0 <cname-target-from-console>"; exit 2; }

source ~/.config/api_keys
ZONE_ID=814eb4635c789e993cbf52d40c797ce4
APEX_ID=c8dbc42549d32eea48a40ae20f936afb
WWW_ID=d309414de08561248e3f45f037b67865

flip() { # $1=record_id  $2=name
  curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$1" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"$2\",\"content\":\"$TARGET\",\"proxied\":true}" \
    | jq -r 'if .success then "  ok: \(.result.name) -> \(.result.content)" else "  FAIL: \(.errors)" end'
}

echo "Flipping to $TARGET (proxied=true, per Pablo's call)..."
flip "$APEX_ID" qrbuddy.app
flip "$WWW_ID"  www.qrbuddy.app

echo
echo "Waiting 30s for propagation, then verifying..."
sleep 30

# A 200 is NOT proof — classic and new both return 200. Headers are the proof.
for d in qrbuddy.app www.qrbuddy.app; do
  hdrs=$(curl -sI "https://$d" --max-time 15 || true)
  if grep -qi 'edgeproxy-h' <<<"$hdrs"; then
    echo "  $d: ✗ STILL ON CLASSIC (via: edgeproxy-h) — dies with the shutdown"
  elif grep -qiE 'deployd|deno-cluster' <<<"$hdrs"; then
    echo "  $d: ✓ on NEW Deno (deployd)"
  else
    echo "  $d: ? inconclusive — inspect manually:"; grep -iE '^(via|server):' <<<"$hdrs" | sed 's/^/      /'
  fi
done

echo
echo "Cross-check builds match the new deploy:"
echo -n "  qrbuddy.app         : "; curl -s https://qrbuddy.app --max-time 15 | md5
echo -n "  qrbuddy.pibulus.deno.net: "; curl -s https://qrbuddy.pibulus.deno.net --max-time 15 | md5
echo "  (same hash = domain is serving the new build)"
echo
echo "If proxied mode misbehaves (cert/verification stalls), set proxied=false"
echo "in this script and re-run to go DNS-only."
