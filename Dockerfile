# Stage 1: Build the React + Vite app using Node 22
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency manifests first for optimal layer caching
COPY package*.json ./

# Install dependencies deterministically
RUN npm ci

# Copy application source and build static output to /dist
COPY . .
ARG VITE_API_BASE_URL
RUN npm run build

# Stage 2: Serve static files using a pinned, stable Nginx version
FROM nginx:1.30-alpine

# Copy built assets from Vite's build directory to Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for React SPA routing
COPY build/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
