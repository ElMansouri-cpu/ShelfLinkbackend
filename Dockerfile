# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Set environment to production before installing dependencies
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy production environment file
COPY .env.production .env

# Create a non-root user and set ownership
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

# Expose the port your app listens on
EXPOSE 1919

# Start the app directly with node (faster than npm run)
CMD ["node", "dist/src/main.js"]

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Set environment to development
ENV NODE_ENV=development

# Copy package files and install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Create a non-root user and set ownership
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

# Expose the port your app listens on
EXPOSE 1919

# Start the app in development mode
CMD ["npm", "run", "start:dev"]
