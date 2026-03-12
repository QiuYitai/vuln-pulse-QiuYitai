#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy

# Start server
exec node dist/index.js
