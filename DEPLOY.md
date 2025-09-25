# 🚀 Guía de Despliegue en Dockploy

## Configuración del Dockerfile

Este Dockerfile está optimizado para **Dockploy** con las siguientes características:

### 🏗️ **Multi-stage Build**
- **Etapa 1**: Build de la aplicación React con Vite
- **Etapa 2**: Servidor Nginx Alpine ultra-ligero

### 🔒 **Seguridad**
- Usuario no-root (`nginx:nginx`)
- Headers de seguridad configurados
- Content Security Policy implementada
- Server tokens ocultos

### ⚡ **Rendimiento**
- Compresión gzip habilitada
- Cache optimizado para assets estáticos
- Cache deshabilitado para HTML (SPA)
- Healthcheck para monitoreo

## 📋 Instrucciones de Despliegue

### 1. **Preparar Variables de Entorno**
Asegúrate de tener tu archivo `.env` configurado con:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
# ... otras variables Firebase
```

### 2. **Desplegar en Dockploy**

#### Opción A: Desde Repositorio Git
1. Conecta tu repositorio en Dockploy
2. Dockploy detectará automáticamente el `Dockerfile`
3. Configurar puerto: `8080`
4. Agregar variables de entorno en la interfaz

#### Opción B: Build Manual
```bash
# Build local
docker build -t citygym .

# Tag para registry
docker tag citygym your-registry/citygym:latest

# Push
docker push your-registry/citygym:latest
```

### 3. **Configuración de Dockploy**
- **Puerto**: `8080`
- **Protocolo**: `HTTP`
- **Health Check**: `/health`
- **Dominio**: Configurar según necesidad

### 4. **Variables de Entorno Requeridas**
```env
NODE_ENV=production
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

## 🔍 **Verificación Post-Despliegue**

### Health Check
```bash
curl http://your-domain/health
# Respuesta esperada: "healthy"
```

### Aplicación Principal
```bash
curl -I http://your-domain/
# Verificar headers de seguridad y cache
```

## 📊 **Optimizaciones Incluidas**

- **Tamaño de imagen**: ~25MB (nginx:alpine base)
- **Build time**: Optimizado con npm ci
- **Security**: Headers de seguridad implementados
- **Performance**: Gzip + cache estratégico
- **Monitoring**: Healthcheck integrado

## 🛠️ **Troubleshooting**

### Error de Variables de Entorno
- Verificar que todas las variables `VITE_*` estén configuradas
- Reconstruir la imagen después de cambiar variables

### Error 404 en Rutas
- El nginx está configurado para SPA
- Todas las rutas redirigen a `/index.html`

### Performance Issues
- Verificar que gzip esté funcionando
- Comprobar cache de assets estáticos

## 📦 **Estructura Final**

```
citygym/
├── Dockerfile          # Multi-stage build
├── nginx.conf          # Configuración nginx
├── .dockerignore       # Optimización build
├── .dockploy          # Config Dockploy
└── DEPLOY.md          # Esta guía
```