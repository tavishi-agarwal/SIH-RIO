# FastAPI backend image.
#
# Build context is the REPOSITORY ROOT, so the rasters in resources/ can be
# baked into the image:
#
#   docker build -f backend/Dockerfile -t rio-backend .
#
# On a managed platform, set the Dockerfile path to backend/Dockerfile and leave
# the build context at the repository root.
FROM python:3.11-slim

WORKDIR /app

# rasterio ships manylinux wheels that bundle GDAL, so no apt step is needed.
# If a future rasterio release has no wheel for this Python, re-add:
#   RUN apt-get update && apt-get install -y libgdal-dev gcc g++ \
#       && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Real HEC-RAS rasters, auto-discovered at /app/resources by the flood pipeline.
COPY resources ./resources

# Recordings are not committed (see .gitignore). To ship the videos, mount them
# at /app/recordings, or track them with Git LFS and uncomment:
# COPY recordings ./recordings

RUN mkdir -p /app/storage/flood_cache /app/demo

ENV STORAGE_PATH=/app/storage \
    DEMO_DATA_PATH=/app/demo \
    FLOOD_RASTER_DIR=/app/resources \
    FLOOD_RECORDINGS_DIR=/app/recordings \
    APP_ENV=production \
    DEBUG=false

# Bake the raster cache into the image: reprojecting the ~100M-cell rasters takes
# tens of seconds, so doing it at build time keeps the first request fast.
RUN python precompute_flood.py || echo "precompute skipped - rasters unavailable"

EXPOSE 8000

# Shell form so ${PORT} is expanded at runtime when the platform injects it.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
