#!/usr/bin/env bash

########################################################################################################################
# 🚀 DSS Universe
# ----------------------------------------------------------------------------------------------------------------------
# File        : scripts/bootstrap.sh
# Module      : Developer Experience
# Purpose     : Local Development Bootstrap
#
# Description :
# This script prepares a local DSS Universe development environment.
# It checks required tools, creates local environment files, starts Docker services,
# generates Prisma Client, runs migrations, and seeds the database.
#
# Architecture Notes:
# • This script is safe to run multiple times.
# • It does not overwrite existing .env files.
# • It assumes Docker Desktop is installed and running.
# • Root ".env" is used by Docker Compose.
# • "apps/api/.env" is used by NestJS and Prisma.
#
# Engineering Wisdom:
# "A good bootstrap script turns setup pain into boring success."
#
# Easter Egg:
# If this script fails, read the error first.
# If that does not help, blame the nearest asteroid. ☄️
#
# 🛰️ DSS Universe Engineering Standards
########################################################################################################################

set -euo pipefail

print_title() {
  echo ""
  echo "🛰️  DSS Universe Bootstrap"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_step() {
  echo ""
  echo "🚀 $1"
}

print_success() {
  echo "✅ $1"
}

print_warning() {
  echo "⚠️  $1"
}

print_error() {
  echo "❌ $1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    print_error "$1 is not installed or not available in PATH."
    exit 1
  fi

  print_success "$1 found"
}

copy_env_if_missing() {
  local source_file="$1"
  local target_file="$2"

  if [[ -f "$target_file" ]]; then
    print_success "$target_file already exists"
    return
  fi

  if [[ ! -f "$source_file" ]]; then
    print_error "$source_file does not exist"
    exit 1
  fi

  cp "$source_file" "$target_file"
  print_success "Created $target_file"
}

print_title

print_step "Checking required tools"
require_command git
require_command node
require_command pnpm
require_command docker

print_step "Preparing environment files"
copy_env_if_missing ".env.example" ".env"
copy_env_if_missing "apps/api/.env.example" "apps/api/.env"

print_step "Installing dependencies"
pnpm install

print_step "Starting Docker services"
docker compose up -d

print_step "Checking Docker services"
docker compose ps

print_step "Generating Prisma Client"
pnpm --filter api prisma generate

print_step "Running database migrations"
pnpm --filter api db:migrate

print_step "Running database seed"
pnpm --filter api db:seed

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟢 Mission Status: ALL SYSTEMS NOMINAL"
echo "🚀 Developer workstation is ready."
echo "Welcome aboard, astronaut."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
