#!/usr/bin/env bash

# 🚀 DSS Universe
# Login helper for local API testing.

set -euo pipefail

curl -fsS \
  -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@dss.local",
    "password":"Admin123!"
  }' | jq -r '.tokens.accessToken'
