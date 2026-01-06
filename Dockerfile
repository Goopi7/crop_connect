# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install Python and ML dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    linux-headers

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ml/requirements.txt ./ml/

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Install Python dependencies for ML
RUN pip3 install --no-cache-dir -r ml/requirements.txt

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S cropconnect -u 1001

# Production stage
FROM node:18-alpine AS production

# Install Python runtime
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy built dependencies from base stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy application code
COPY . .

# Create directories for ML models and data
RUN mkdir -p ml/models ml/data && chown -R 1001:1001 ml/

# Change ownership of app directory
RUN chown -R 1001:1001 /app

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node health-check.js || exit 1

# Start the application
CMD ["node", "app.js"]