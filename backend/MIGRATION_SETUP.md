# Database Migration Setup

## Prerequisites
1. PostgreSQL server running
2. Node.js and npm installed
3. Environment variables configured

## Environment Setup
Create a `.env` file in the backend directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/batch_processing_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# Email (SendGrid - Option 1)
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@yourdomain.com"

# Email (SMTP - Option 2)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Server
PORT=3001
NODE_ENV="development"
```

## Installation and Migration Commands

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Generate Prisma client:**
```bash
npm run db:generate
```

3. **Create and run initial migration:**
```bash
npm run db:migrate
```

4. **Alternative: Push schema directly (for development):**
```bash
npm run db:push
```

5. **Reset database (if needed):**
```bash
npm run db:reset
```

6. **Seed database with initial data:**
```bash
npm run db:seed
```

## Manual SQL Setup (Alternative)
If you prefer to use the SQL schema directly:

```bash
# Connect to PostgreSQL and create database
psql -U postgres
CREATE DATABASE batch_processing_db;
\c batch_processing_db;

# Run the schema file
\i /path/to/schema.sql
```

## Migration Commands Summary
- `prisma migrate dev` - Create and apply new migration
- `prisma migrate deploy` - Apply pending migrations (production)
- `prisma migrate status` - Check migration status
- `prisma db push` - Push schema changes without creating migration files
- `prisma db pull` - Pull database schema to update Prisma schema
- `prisma generate` - Generate Prisma client
- `prisma studio` - Open Prisma Studio database browser