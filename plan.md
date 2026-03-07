# Plan: pantalla ADMIN

## Objetivo

Crear una pantalla exclusiva para ADMIN donde se pueda ver:

- todos los usuarios
- rutinas creadas
- rutinas realizadas
- duracion de cada rutina realizada
- ejercicios asociados a cada rutina

El acceso debe quedar restringido al ADMIN indicado:

- email: `exloz26@gmail.com`
- userId esperado: `user_3AC1fVPB8cpo0blGds7MPQHq7Fo`

## Progreso

- [x] Fase 1 - Modelo y seguridad
- [x] Fase 2 - Backend (`herculito-push-api`)
- [x] Fase 3 - Frontend data layer (`herculito`)
- [x] Fase 4 - Navegacion y pagina
- [x] Fase 5 - UI de la pantalla ADMIN
- [x] Fase 6 - Validacion

## Estado actual detectado

### Frontend (`herculito`)

- La app solo navega entre `dashboard` y `routines`.
- La autenticacion usa Clerk.
- El hook `useAuth` hoy expone `user.id = clerkUser.externalId ?? clerkUser.id`.
- No existe una pagina ADMIN ni navegacion para ella.
- Los datos actuales de rutinas y sesiones se consumen con endpoints orientados al usuario autenticado.

### Backend (`herculito-push-api`)

- Ya existe `user_profiles`, porque el frontend sincroniza perfil a `/v1/data/profile`.
- Las rutas actuales de `routines` y `sessions` filtran por el `uid` autenticado.
- No hay endpoints administrativos globales para consultar usuarios + rutinas + sesiones de toda la plataforma.

## Alcance funcional propuesto

La primera version de la pantalla ADMIN mostraria:

1. Resumen general
   - total de usuarios
   - total de rutinas creadas
   - total de rutinas realizadas (sesiones completadas)
   - duracion promedio de entrenamientos

2. Listado de usuarios
   - nombre
   - email
   - userId
   - cantidad de rutinas creadas
   - cantidad de rutinas realizadas
   - ultima actividad

3. Listado de rutinas
   - nombre de rutina
   - creador
   - cantidad de veces realizada
   - ultima vez realizada
   - ejercicios de la rutina

4. Listado de sesiones realizadas
   - usuario
   - rutina
   - fecha de inicio
   - fecha de finalizacion
   - duracion total
   - ejercicios registrados en esa sesion

## Decisiones tecnicas propuestas

### 1) Control de acceso ADMIN

Implementar control en dos capas:

- frontend: mostrar pagina y navegacion solo al ADMIN
- backend: proteger endpoints admin para que solo ese ADMIN pueda consultar datos globales

Esto es obligatorio: ocultar la UI no es suficiente.

### 2) Fuente de verdad del permiso

Crear un helper reutilizable para validar ADMIN con allowlist fija.

Decision confirmada:

- validar email normalizado `exloz26@gmail.com`
- validar `clerkUser.id === user_3AC1fVPB8cpo0blGds7MPQHq7Fo`
- no depender de `externalId` para el permiso ADMIN
- usar la misma regla en frontend y backend

### 3) Nueva API administrativa

Agregar un endpoint nuevo, por ejemplo:

- `GET /v1/data/admin/overview`

Respuesta sugerida:

```json
{
  "summary": {
    "totalUsers": 0,
    "totalRoutines": 0,
    "totalCompletedSessions": 0,
    "averageDurationMin": 0
  },
  "users": [
    {
      "userId": "...",
      "name": "...",
      "email": "...",
      "avatarUrl": "...",
      "createdRoutines": 0,
      "completedSessions": 0,
      "lastActivityAt": 0
    }
  ],
  "routines": [
    {
      "routineId": "...",
      "name": "...",
      "createdBy": "...",
      "createdByName": "...",
      "timesUsed": 0,
      "lastCompletedAt": 0,
      "exercises": [
        {
          "exerciseId": "...",
          "name": "...",
          "sets": 0,
          "reps": 0,
          "restTime": 0
        }
      ]
    }
  ],
  "sessions": [
    {
      "sessionId": "...",
      "userId": "...",
      "userName": "...",
      "routineId": "...",
      "routineName": "...",
      "startedAt": 0,
      "completedAt": 0,
      "totalDuration": 0,
      "exercises": []
    }
  ]
}
```

## Plan de implementacion por fases

### Fase 1 - Modelo y seguridad

- definir helper `isAdminUser(...)` en frontend
- definir helper equivalente en backend usando datos del token Clerk
- usar `clerkUser.id` + email como regla oficial de acceso
- bloquear acceso backend con respuesta `403` para no-admin

### Fase 2 - Backend (`herculito-push-api`)

- crear modulo/ruta admin nueva
- agregar consultas SQL agregadas sobre:
  - `user_profiles`
  - `routines`
  - `routine_exercises`
  - `workout_sessions`
- devolver resumen global
- devolver usuarios con metricas agregadas
- devolver rutinas con ejercicios y metricas
- devolver sesiones completadas con duracion y detalle
- mantener limite razonable inicial para evitar payloads excesivos

### Fase 3 - Frontend data layer (`herculito`)

- crear tipos TS para la respuesta admin
- agregar función `fetchAdminOverview()` en `src/shared/api/dataApi.ts`
- crear hook `useAdminOverview()` para carga, error y estado de refresco

### Fase 4 - Navegacion y pagina

- extender `AppPage` para soportar `admin`
- permitir ruta `/admin`
- agregar item de navegacion visible solo para ADMIN
- no renderizar ninguna opcion de menu ADMIN para usuarios no-admin
- proteger acceso directo por URL redirigiendo a inicio si no es ADMIN

### Fase 5 - UI de la pantalla ADMIN

- crear pagina nueva, por ejemplo `src/features/admin/pages/AdminPage.tsx`
- usar el estilo visual existente de la app (`app-shell`, `app-card`, `app-surface`)
- incluir bloques:
  - tarjetas de resumen
  - tabla/lista de usuarios
  - tabla/lista de rutinas
  - tabla/lista de sesiones
- usar acordeones o paneles expandibles para mostrar ejercicios por rutina/sesion sin saturar la vista en mobile

### Fase 6 - Validacion

- verificar que un usuario normal no vea el tab ni pueda abrir `/admin`
- verificar que un usuario normal reciba `403` en el endpoint admin
- verificar que el ADMIN vea datos reales consistentes
- correr `pnpm lint` y `pnpm build` en frontend
- correr `bun check` en backend

## Archivos que probablemente se tocaran despues

### Frontend

- `src/features/auth/hooks/useAuth.ts`
- `src/app/hooks/usePageNavigation.ts`
- `src/app/App.tsx`
- `src/app/navigation/Navigation.tsx`
- `src/shared/api/dataApi.ts`
- `src/shared/types/index.ts`
- `src/features/admin/pages/AdminPage.tsx`
- `src/features/admin/hooks/useAdminOverview.ts`

### Backend

- `../herculito-push-api/src/shared/auth/clerk-auth.ts` o helper nuevo relacionado
- `../herculito-push-api/src/shared/persistence/data-store.ts`
- `../herculito-push-api/src/modules/*/routes.ts` o un nuevo `src/modules/admin/routes.ts`
- `../herculito-push-api/src/index.ts` o el punto donde se registren rutas

## Riesgos y puntos a cuidar

1. El `userId` visible en frontend hoy puede no coincidir con el `clerkUser.id` porque se prioriza `externalId`; para ADMIN hay que usar el id real de Clerk.
2. Si el endpoint devuelve todas las sesiones sin limite, la carga puede crecer rapido.
3. La UI debe seguir siendo usable en mobile, porque las tablas largas pueden romper el layout.
4. La seguridad real debe resolverse en backend, no solo en frontend.

## Criterio de terminado para la futura implementacion

- solo el ADMIN definido puede acceder a la pantalla
- el backend rechaza cualquier acceso no autorizado
- la pantalla muestra usuarios, rutinas, sesiones realizadas, duracion y ejercicios
- la pagina funciona bien en desktop y mobile
- frontend y backend pasan sus chequeos principales
