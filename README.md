# Herculito

App web para seguimiento de entrenamientos en gimnasio. Esta version es el frontend (React + Vite + TypeScript), con autenticacion en Clerk y datos consumidos desde una API externa.

## Caracteristicas principales

- Inicio de sesion con Clerk (Google como flujo principal y opciones extra de Clerk).
- Gestion de rutinas propias y rutinas publicas.
- Registro de sesiones de entrenamiento (series, repeticiones, pesos, notas y progreso).
- Dashboard con historial, calendario y paneles de progreso.
- Panel de administracion para revisar usuarios, rutinas y sesiones.
- Soporte PWA en produccion con service worker (`vite-plugin-pwa`).
- UI mobile-first con Tailwind CSS y sistema visual propio (`app-*`, `btn-*`, `input`, `chip`).

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

5. Inicia en desarrollo:

```bash
pnpm dev
```

La app corre por defecto en `http://localhost:5173`.

## Scripts utiles

- `pnpm dev`: servidor de desarrollo.
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

- `AGENTS.md`: guia tecnica de trabajo en este repo.
- `.github/copilot-instructions.md`: convenciones adicionales del proyecto.
