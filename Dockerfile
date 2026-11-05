# Stage 1: Build the application
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install all dependencies for build
RUN npm ci

# Copy source code and build configs
COPY tsconfig.json tsup.config.ts ./
COPY src/ ./src/

# Compile TypeScript using tsup (modular per-file output to dist/)
RUN npm run build:server

# Stage 2: Production runtime
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Use non-root node user
USER node

EXPOSE 3000

CMD ["npm", "start"]
