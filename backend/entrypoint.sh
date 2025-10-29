#!/bin/sh
set -e

echo "Waiting for database..."
sleep 2

echo "Running Prisma DB Push..."
npx prisma db push --accept-data-loss

echo "Starting application..."
exec npm run dev
