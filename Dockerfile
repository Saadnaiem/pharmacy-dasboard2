# Multi-stage Dockerfile for Pharmacy Dashboard
# Stage 1: Build React frontend
FROM node:20.18.0-alpine3.20 AS frontend-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Python backend with static files  
FROM python:3.12.8-alpine3.20 AS production

# Set working directory
WORKDIR /app

# Install system dependencies and security updates
RUN apk update && apk add --no-cache \
    gcc \
    musl-dev \
    linux-headers \
    curl \
    && apk upgrade \
    && rm -rf /var/cache/apk/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app.py .
COPY sales.csv* ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/build ./static

# Create non-root user for security
RUN adduser -D -s /bin/sh pharmacy
USER pharmacy

# Expose port
EXPOSE 5000

# Environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start command
CMD ["python", "app.py"]
