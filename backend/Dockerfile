# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including OpenSSL for Prisma
RUN apk add --no-cache curl openssl openssl-dev

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for ts-node)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S batch -u 1001

# Change ownership of the app directory
RUN chown -R batch:nodejs /app
USER batch

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application in dev mode
CMD ["npm", "run", "dev"]