# Frontend Dockerfile
# Multi-stage build for Next.js application

# Stage 1: Dependencies stage
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall scripts to avoid Playwright browser installation in Docker)
RUN npm ci --ignore-scripts

# Stage 2: Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create public directory if it doesn't exist (to avoid Docker COPY errors)
RUN mkdir -p public || true

# Set build-time environment variables (if needed)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js application
RUN npm run build

# Stage 3: Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public directory if it exists and has content (Next.js standalone doesn't include it automatically)
# The public directory was created in builder stage, so it will always exist, but may be empty
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN if [ ! -d ./public ] || [ -z "$(ls -A ./public 2>/dev/null)" ]; then \
      rm -rf ./public && mkdir -p ./public; \
    fi

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]

