# Next.js frontend image.
#
# Build context is the frontend/ directory:
#
#   docker build -t rio-frontend ./frontend
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so the
# backend URL must be supplied as a build argument, not just at runtime:
#
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t rio-frontend ./frontend
#
# Leave it empty to keep the same-origin default (the Next.js server rewrites
# /api/* and /storage/* to the backend).
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "run", "start"]
