# =========================
# Base stage
# =========================
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-virtualenv \
    python3-dev \
    build-base \
    linux-headers

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY ml/requirements.txt ./ml/

# Install Node.js dependencies
RUN npm install --omit=dev && npm cache clean --force

# ---- Python virtual environment ----
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install ML dependencies inside venv
RUN pip install --no-cache-dir -r ml/requirements.txt

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S cropconnect -u 1001


# =========================
# Production stage
# =========================
FROM node:20-alpine AS production

# Install Python runtime only
RUN apk add --no-cache python3

WORKDIR /app

# Copy Node dependencies
COPY --from=base /app/node_modules ./node_modules

# Copy Python virtual environment
COPY --from=base /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Prepare ML directories
RUN mkdir -p ml/models ml/data && \
    chown -R 1001:1001 /app

# Switch to non-root user
USER 1001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node health-check.js || exit 1

CMD ["node", "app.js"]
