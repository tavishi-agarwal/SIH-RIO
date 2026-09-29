# Setup

How to run the RIO application (Next.js frontend + FastAPI backend).
See `README.md` for the project overview and `docs/` for the modelling details.

## Repository layout

```text
frontend/    Next.js 14 app — App Router, TypeScript, Tailwind, MapLibre GL
backend/     FastAPI service — flood raster pipeline, demo & simulation APIs
resources/   HEC-RAS 2D outputs read by the flood pipeline
data/        Processed geospatial inputs (DEM, river, dam, cross-sections)
model/       HEC-RAS dam-break model (DamBreach)
docs/        Methodology and architecture notes
scripts/     Synthetic demo-data generator
```

## Prerequisites

- Python 3.11+
- Node.js 20+

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Warm the raster cache once (~30 s; every request after that is instant)
python precompute_flood.py

uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start it from `backend/` — the storage paths are relative to the working
directory. Interactive API docs: <http://127.0.0.1:8000/api/docs>.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. By default the Next.js server proxies `/api/*` and
`/storage/*` to `http://127.0.0.1:8000`, so a single origin reaches both tiers
and no CORS configuration is needed.

To point the browser directly at a separately hosted backend instead, set
`NEXT_PUBLIC_API_URL` (browser-facing base URL) before running the build. The
proxy target itself can be changed with `BACKEND_URL`.

## Docker

```bash
# Backend — build context is the repository root (so resources/ is included)
docker build -f backend/Dockerfile -t rio-backend .

# Frontend — build context is frontend/
docker build -t rio-frontend ./frontend
```

## Configuration

`backend/.env.example` lists the supported environment variables — copy it to
`backend/.env` and adjust as needed. No API keys or secrets are required.

## Simulation recordings

The backend streams simulation videos from `recordings/` at the repository root.
That directory is git-ignored because of its size — place the `.mp4` files there
and they are picked up automatically by `/api/flood/videos`.
