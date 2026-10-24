# Herculito

App web para seguimiento de entrenamientos en gimnasio. Esta version es el frontend (React + Vite + TypeScript), con autenticacion en Clerk y datos consumidos desde una API externa.

## Caracteristicas principales

- Inicio de sesion con Clerk (Google como flujo principal y opciones extra de Clerk).
- Gestion de rutinas propias y rutinas publicas.
- Registro de sesiones de entrenamiento (series, repeticiones, pesos, notas y progreso).
- Dashboard con historial, calendario y paneles de progreso.
- Panel de administracion para revisar usuarios, rutinas y sesiones.
- Soporte PWA en produccion con service worker (`vite-plugin-pwa`).
- UI adaptable: navegación lateral en escritorio, barra inferior en móvil y búsqueda con Ctrl/Cmd+K.
- Progreso y calendario accesibles directamente en `/progress` y `/calendar`.
- Sistema visual semántico claro/oscuro con Tailwind CSS (`app-*`, `btn-*`, `input`, `chip`).
- 14 temas con galería visual, vista previa inmediata y preferencia guardada en el dispositivo: Cuenta → Apariencia.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- ESLint
- Clerk

## Requisitos

- Node.js 20+
- pnpm

## Configuracion

1. Clona el repositorio y entra al proyecto:

```bash
git clone <url-del-repo>
cd herculito
```

2. Instala dependencias:

```bash
pnpm install
```

3. Crea el archivo de entorno:

```bash
cp .env.example .env
```

4. Completa estos valores en `.env`:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_JWT_TEMPLATE` (ejemplo: `herculito_api`)
- `VITE_PUSH_API_ORIGIN` (URL base de la API)
- `VITE_ANDROID_BACKGROUND_PUSH_ENABLED` (push de descanso en segundo plano en Android; por defecto `true`, `false` para deshabilitarlo)

Las variables `VITE_*` se incorporan durante el build, no al arrancar nginx. Docker y Compose pasan la opcion de push Android al build; los avisos siguen requiriendo permiso del usuario.

5. Inicia en desarrollo:

```bash
pnpm dev
```

La app corre por defecto en `http://localhost:5173`.

## Preview de desarrollo sin iniciar sesión

Para trabajar en la interfaz sin configurar Clerk ni una API:

```bash
pnpm dev:preview
```

Abre `http://localhost:5174`. Este servidor usa un puerto separado y una sesión
ficticia de Alex. No requiere `.env`, tokens ni una cuenta. El acceso normal de
`pnpm dev` sigue utilizando Clerk y la API configurada.

- La preview muestra las pantallas reales con rutinas, historial, progreso y medidas de ejemplo.
- Puedes crear y editar rutinas, registrar series, usar el descanso, completar sesiones y probar tiro con arco o HIIT.
- La barra superior permite alternar entre datos de ejemplo y un estado vacío (`/?scenario=empty`).
- Cerrar sesión muestra un acceso local para volver a entrar sin credenciales.
- Los cambios son temporales: recargar o pulsar **Reiniciar** restaura los datos de ejemplo y descarta la actividad local de la sesión ficticia.
- Todas las llamadas de la capa de API se resuelven localmente. Una ruta no implementada falla explícitamente, sin intentar contactar la API real.
- Videos externos, push en segundo plano y administración no se simulan. Para comprobar integración, autenticación o notificaciones usa el modo normal.
- Solo se habilita con el servidor de desarrollo y `--mode preview`; un build de producción, incluso con ese modo, no habilita la sesión ficticia.

Los fixtures están en `src/app/preview/previewFixtures.ts` y el adaptador local
en `src/app/preview/previewApi.ts`. No uses esta preview para validar seguridad
del backend ni comportamiento real sin conexión.

## Scripts utiles

- `pnpm dev`: servidor de desarrollo.
- `pnpm dev:preview`: desarrollo con sesión y API de ejemplo, sin credenciales.
- `pnpm build`: build de produccion.
- `pnpm preview`: preview local del build.
- `pnpm lint`: lint del proyecto.
- `pnpm test`: ejecuta Vitest en modo run.
- `pnpm exec tsc -b`: typecheck con TypeScript.

## Estructura del proyecto

```text
src/
  app/        # shell de aplicacion, providers, navegacion
  features/   # dominios: auth, dashboard, routines, workouts, admin
  shared/     # tipos, api client, utilidades y UI compartida
public/       # assets estaticos e iconos PWA
```

## Notas de arquitectura

- Navegacion por estado/pathname (`usePageNavigation`) en lugar de React Router completo.
- Capa de API centralizada en `src/shared/api/apiClient.ts` (`fetchJson`, `ApiError`, token Clerk).
- En desarrollo se desregistran service workers para evitar caches stale.
- En produccion se habilita auto-update del service worker.

## Troubleshooting rapido

### Variables de entorno faltantes

- Verifica que exista `.env` en la raiz.
- Reinicia `pnpm dev` despues de cambiar variables.
- Confirma que `VITE_CLERK_PUBLISHABLE_KEY` no este vacia.

### Problemas de autenticacion

- Revisa configuracion de Google OAuth/SSO en Clerk.
- Valida que `VITE_CLERK_JWT_TEMPLATE` exista en Clerk.
- Verifica que `VITE_PUSH_API_ORIGIN` apunte al backend correcto.

### Errores de service worker en local

- En DevTools: Application -> Service Workers -> Unregister.
- Limpia datos del sitio y recarga fuerte (`Cmd+Shift+R`).
- Si persiste: `pnpm dev -- --force`.

## Documentacion relacionada

- [Reconstrucción basada en T3 Code](docs/RECONSTRUCCION-T3.md): análisis, fuentes, decisiones y validación.

- `AGENTS.md`: guia tecnica de trabajo en este repo.
- `.github/copilot-instructions.md`: convenciones adicionales del proyecto.
