#!/usr/bin/env bash
#
# Scans git-TRACKED files for credentials that must never reach the remote.
#
# This exists because two live keys were published to a public GitHub repo:
#   - .env.supabase-backup  (Supabase service key + JWT secret + Gemini key)
#   - .claude/settings.json (a third-party ANTHROPIC_API_KEY, plus apiKeyHelper
#                            echoing the same literal)
#
# Only tracked files are scanned: that is exactly the set that reaches origin.
# Local .env / settings.local.json stay ignored and are intentionally skipped.
#
# Run locally with `npm run scan:secrets`; CI runs it on every push and PR.

set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

# The scanner itself contains every pattern, so it would always match.
EXCLUDE=(':!scripts/scan-secrets.sh')

found=0

# Two tiers, because the two kinds of pattern have opposite failure modes.
#
# STRICT — match a credential *format* (a real JWT, an AIza key). A placeholder
# cannot accidentally look like one, so these are reported verbatim. Never
# filter these; a filter here could swallow a genuine key.
STRICT_CHECKS=(
  'JWT (Supabase service/anon key, or any signed token)|eyJhbGciOi[A-Za-z0-9_-]{10,}'
  'Google API key (Gemini / Books)|AIza[0-9A-Za-z_-]{30,}'
  'Google short-form API key|AQ\.[A-Za-z0-9_-]{25,}'
  'sk- style API key|sk-[A-Za-z0-9_-]{30,}'
  'freemodel.dev API key|fe_oa_[0-9a-f]{30,}'
  'apiKeyHelper (leaks a literal key)|apiKeyHelper'
)

# HEURISTIC — match a *variable name* plus any value. These legitimately fire on
# .env.example placeholders and on localhost dev URLs in the README, so their
# hits are passed through NOISE below.
HEURISTIC_CHECKS=(
  'Anthropic key/token with a value|ANTHROPIC_(API_KEY|AUTH_TOKEN)"?[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9_-]{10,}'
  'Supabase secret with a value|SUPABASE_(SERVICE_KEY|JWT_SECRET)=[A-Za-z0-9._-]{20,}'
  'Database URL with embedded password|postgres(ql)?://[^:@/[:space:]]+:[^:@/[:space:]]{8,}@'
)

# Documentation placeholders and local-only dev credentials. Nothing here can
# authenticate against a real service.
NOISE='your-|your_|YOUR_|changeme|change-me|placeholder|dummy|<[A-Za-z_-]+>|@localhost|@127\.0\.0\.1|@postgres[:/]|@db[:/]|:password@|:PASSWORD@|ci-test-|build-check-'

report() {
  echo "SECRET: $1"
  echo "$2" | sed 's/^/    /'
  echo
  found=1
}

for check in "${STRICT_CHECKS[@]}"; do
  label=${check%%|*}
  regex=${check#*|}
  # -I skips binaries; no -i, these patterns are case-sensitive by design.
  hits=$(git grep -nIE -- "$regex" -- . "${EXCLUDE[@]}" 2>/dev/null || true)
  [ -n "$hits" ] && report "$label" "$hits"
done

for check in "${HEURISTIC_CHECKS[@]}"; do
  label=${check%%|*}
  regex=${check#*|}
  hits=$(git grep -nIE -- "$regex" -- . "${EXCLUDE[@]}" 2>/dev/null | grep -vE "$NOISE" || true)
  [ -n "$hits" ] && report "$label" "$hits"
done

# An env backup that is tracked is a leak regardless of its contents.
# .env.example is the one intentional exception.
tracked=$(git ls-files \
  | grep -iE '(^|/)\.env(\.|$)|backup|\.pem$|\.key$' \
  | grep -vE '(^|/)\.env\.example$' || true)
if [ -n "$tracked" ]; then
  echo "SECRET: credential-bearing file is tracked"
  echo "$tracked" | sed 's/^/    /'
  echo
  found=1
fi

if [ "$found" -ne 0 ]; then
  cat <<'EOF'
Secret scan FAILED.

Untracking is not enough once a commit is pushed — a published key must be
revoked at the provider. Steps:
  1. Revoke/rotate the key at the provider.
  2. git rm --cached <file>   (and add it to .gitignore)
  3. Put the value in .env or .claude/settings.local.json — both are ignored.
EOF
  exit 1
fi

echo "Secret scan passed: no credentials in tracked files."
