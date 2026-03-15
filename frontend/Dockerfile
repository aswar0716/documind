# ── Stage 1: build ────────────────────────────────────────────────────────────
# Run "npm run build" to compile TypeScript + React into plain HTML/CSS/JS files.
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (same layer-caching trick as the backend Dockerfile).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build. Output lands in /app/dist.
COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
# Nginx is a fast, lightweight static file server. The entire Node.js toolchain
# is not needed at runtime — we only need the compiled files from Stage 1.
FROM nginx:alpine AS runtime

# Copy the built static files into Nginx's default serve directory.
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config: forward /api/* requests to the backend container.
# Without this, fetch("/api/...") from the browser would hit the Nginx server
# (port 3000) and get a 404 — not the FastAPI backend (port 8000).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
