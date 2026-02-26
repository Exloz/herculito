# Multi-stage build para una imagen ligera y optimizada
# Etapa 1: Build de la aplicación
FROM node:20-alpine AS builder

# Instalar pnpm
RUN npm install -g pnpm

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de pnpm
COPY pnpm-lock.yaml package.json ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Definir argumentos de build para variables de entorno
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_PUSH_API_ORIGIN
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_JWT_TEMPLATE

# Establecer variables de entorno para el build
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_PUSH_API_ORIGIN=$VITE_PUSH_API_ORIGIN
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_JWT_TEMPLATE=$VITE_CLERK_JWT_TEMPLATE

# Copiar todo el código fuente
COPY . .

# Build de la aplicación
RUN pnpm build

# Etapa 2: Imagen de producción
FROM nginx:1.25-alpine

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar configuración personalizada de nginx
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos construidos desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 8080

# Healthcheck para Dockploy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
