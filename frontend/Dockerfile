# Multi-stage build for React frontend (build context: repo root)
FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Development stage (workspace: lockfile at root, frontend in frontend/)
FROM base AS development

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
RUN pnpm install --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "-C", "frontend", "dev", "--host", "0.0.0.0"]

# Build stage
FROM base AS builder

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
RUN pnpm install --frozen-lockfile

WORKDIR /app/frontend
RUN pnpm build

# Production stage - serve with nginx
FROM nginx:alpine AS production

COPY --from=builder /app/frontend/out /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
