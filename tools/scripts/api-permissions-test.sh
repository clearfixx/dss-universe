#!/usr/bin/env bash

# 🚀 DSS Universe
# Permission guard smoke test.
# If this fails, Mission Control has questions. 🛰️

set -e

TOKEN=$(./tools/scripts/api-login.sh)

echo "Testing /authz-test/users-read..."
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/authz-test/users-read | jq

echo ""
echo "Testing /auth/admin-test..."
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/admin-test | jq
