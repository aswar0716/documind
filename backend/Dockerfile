# ── Stage 1: builder ──────────────────────────────────────────────────────────
# Two-stage build: Stage 1 installs all dependencies into a venv.
# Stage 2 copies only the venv + app code — no build tools, smaller final image.
FROM python:3.12-slim AS builder

WORKDIR /app

# Build tools needed to compile some packages (e.g. chromadb C extensions).
# Installed only in the builder stage so they don't bloat the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first. Docker caches each step as a layer — by copying
# requirements.txt before the source code, the pip install layer is reused
# on rebuilds as long as requirements.txt hasn't changed.
COPY requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy only the virtual environment from the builder stage.
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source code.
COPY app/ ./app/

# Create runtime data directories. These are overridden by volume mounts in
# docker-compose.yml, but creating them here ensures paths exist without mounts.
RUN mkdir -p /data/chroma_db /data/uploads

EXPOSE 8000

# 0.0.0.0 makes the server accept connections from outside the container.
# Inside Docker, "localhost" means the container itself — not the host machine.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
