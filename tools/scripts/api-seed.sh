#!/usr/bin/env bash

# 🚀 DSS Universe
# Runs API database seed.
# Feed the database. It gets angry when empty. 🌱

set -e

pnpm --filter api db:seed
