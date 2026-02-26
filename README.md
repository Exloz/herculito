# HERCULITO - App de Seguimiento de Entrenamientos

Una aplicación React moderna para trackear entrenamientos en el gimnasio con autenticación Clerk y persistencia en API propia.

## 🚀 Características

- **🔐 Autenticación con Google**: Inicio de sesión seguro y fácil
- **🎯 Sistema de Rutinas Flexible**: Crea rutinas personalizadas con ejercicios específicos
- **📊 Seguimiento Inteligente**: Registra pesos, series y repeticiones con historial
- **🔄 Sincronización de Datos**: Datos persistidos y consultados vía API propia
- **⏱️ Timer de Descanso**: Controla los tiempos entre series automáticamente
- **📈 Historial de Progreso**: Ve tu progreso y récords personales
- **📱 Diseño Responsive**: Optimizado para móviles y desktop
- **🌙 Tema Oscuro**: Interface moderna y cómoda para los ojos
- **PWA en produccion**: Service worker y soporte offline basico en builds
- **💾 Sesiones de Entrenamiento**: Registra cada sesión con fecha, duración y notas

## 🔧 Configuración de Clerk y API

### Variables de Entorno

Este proyecto utiliza variables de entorno para Clerk y para la API de datos/push.

#### Configuración Inicial

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Reemplaza los valores de ejemplo con tus credenciales reales:
   - `VITE_CLERK_PUBLISHABLE_KEY`: Publishable key de Clerk
   - `VITE_CLERK_JWT_TEMPLATE`: Template JWT para la API (ej. `herculito_api`)
   - `VITE_PUSH_API_ORIGIN`: URL base de la API (ej. `https://api.herculito.exloz.site`)

3. **Configura Google en Clerk**:
   - Ve a Social/SSO Connections
   - Habilita Google OAuth para sign-in/sign-up
   - Configura correctamente el redirect URI de Clerk en Google Cloud

## 🛠️ Instalación y Uso

1. **Clona el repositorio**:
   ```bash
   git clone [tu-repositorio]
   cd project
   ```

2. **Instala las dependencias**:
   ```bash
   pnpm install
   ```

3. **Configura las variables de entorno** (ver sección anterior)

4. **Inicia el servidor de desarrollo**:
   ```bash
   pnpm dev
   ```

5. **Abre tu navegador** en `http://localhost:5173`

## 📱 Uso de la Aplicación

### Primer Inicio
1. Haz clic en "Continuar con Google" para autenticarte
2. La aplicación creará automáticamente rutinas de ejemplo
3. En el Dashboard verás "¿Qué rutina quieres hacer hoy?"

### Gestión de Rutinas
1. **Crear Rutinas**: Ve a "Rutinas" → botón "+" para crear nuevas rutinas
2. **Personalizar**: Agrega ejercicios, series, repeticiones y tiempos de descanso
3. **Organizar**: Crea rutinas temáticas (Pecho, Espalda, Piernas, etc.)

### Realizar Entrenamientos
1. **Seleccionar**: En Dashboard, elige la rutina del día
2. **Ejecutar**: Para cada ejercicio:
   - Ve el último peso usado y récord personal
   - Ajusta el peso con botones +/- o entrada manual
   - Marca series completadas
   - Usa el timer automático entre series
3. **Completar**: Al terminar, guarda la sesión completa

### Seguimiento de Progreso
- **Historial**: Ve pesos anteriores y fechas
- **Récords**: Rastrea automáticamente tus mejores marcas
- **Sesiones**: Revisa entrenamientos pasados con duración y notas
- **Progreso**: Compara con sesiones anteriores

## 🏗️ Arquitectura Técnica

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS con sistema visual personalizado (app-*, mint/amber)
- **Backend**: API Bun + SQLite
- **Auth**: Clerk (Google OAuth / OTP)
- **Icons**: Lucide React
- **State Management**: React Hooks personalizados

## 🔒 Seguridad

- El archivo `.env` está incluido en `.gitignore` para prevenir que las credenciales se suban al repositorio
- El backend valida JWT de Clerk por `issuer`/`audience`/JWKS
- Autenticación segura via Clerk con Google OAuth 2.0 u OTP

## 🚢 Deployment

Para producción:
1. Configura las variables de entorno en tu plataforma de deployment
2. Ejecuta `pnpm build` para generar la versión optimizada
3. Despliega la carpeta `dist` en tu hosting preferido

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Troubleshooting

### Errores de Variables de Entorno
Si recibes errores sobre variables de entorno faltantes:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Asegúrate de que todas las variables requeridas estén definidas
3. Reinicia el servidor de desarrollo después de modificar el archivo `.env`

### Problemas de Autenticación
- Verifica que Google OAuth esté habilitado en Clerk
- Confirma que `VITE_CLERK_PUBLISHABLE_KEY` esté definido durante el build
- Verifica que `VITE_CLERK_JWT_TEMPLATE` coincida con el template configurado en Clerk
- Revisa que `VITE_PUSH_API_ORIGIN` apunte a la API correcta

### Problemas de API
- Verifica que la API responda en `VITE_PUSH_API_ORIGIN/health`
- Revisa `CLERK_ISSUER`, `CLERK_JWKS_URL` y `CLERK_AUDIENCE` en el backend
- Confirma que el JWT template incluya `legacy_uid` para usuarios migrados

### Problemas con service worker en desarrollo
- Si aparecen errores de carga de modulos, limpia el service worker: DevTools > Application > Service Workers > Unregister
- Luego usa "Clear site data" y recarga con Cmd+Shift+R
- Reinicia Vite con `pnpm dev -- --force` si el problema persiste
