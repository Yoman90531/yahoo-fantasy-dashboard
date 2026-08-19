# Stage 1: Build frontend
FROM node:20.19-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
COPY shared/ /app/shared/
RUN npm run build

# Stage 2: Production
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade setuptools wheel \
    && pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Copy backend code
COPY backend/ ./
COPY shared/ ./shared/

# Copy built frontend into backend/static (where FastAPI serves it)
COPY --from=frontend-build /app/frontend/dist ./static

# Runtime state is mounted here by Docker Compose.
RUN mkdir -p /data

EXPOSE 8000

CMD ["sh", "-c", "python scripts/migrate_database.py && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
