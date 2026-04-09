# Multi-stage build optimizado con BuildKit cache
# Etapa 1: Build de la aplicación
FROM node:20-alpine AS builder

# Usar corepack (incluido en Node 20+) para gestionar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias primero (mejor cacheo de capas)
COPY pnpm-lock.yaml package.json ./

# Cache mount para acelerar pnpm install en builds repetidos
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Argumentos de build para variables de entorno
ARG VITE_PUSH_API_ORIGIN
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_JWT_TEMPLATE

ENV VITE_PUSH_API_ORIGIN=$VITE_PUSH_API_ORIGIN
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_JWT_TEMPLATE=$VITE_CLERK_JWT_TEMPLATE

COPY . .

RUN pnpm build

# Etapa 2: Imagen de producción
FROM nginx:1.25-alpine

# wget ya está incluido en Alpine/busybox

COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/nginx-security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
