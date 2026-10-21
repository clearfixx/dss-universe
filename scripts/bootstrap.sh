#!/usr/bin/env bash
# ===============================================================
# 🚀 DSS Universe
# ---------------------------------------------------------------
# 📦 Module: Developer Experience
# 📄 File: scripts/bootstrap.sh
#
# 🎯 Purpose:
# Delegates Bash onboarding to the cross-platform bootstrap.
#
# 🚀 Build. Share. Grow.
# ===============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/bootstrap.mjs "$@"
