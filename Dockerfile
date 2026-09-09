# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the production environment with NodeJS and Nginx
FROM node:22-slim
# Install nginx and set timezone
ENV TZ="Europe/Zurich"
RUN apt-get update && apt-get install -y nginx procps tzdata curl iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend build to nginx html directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose ports
EXPOSE 80 3000

# Start both services
CMD ["/start.sh"]
