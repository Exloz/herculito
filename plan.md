# Plan: optimizacion de carga inicial con endpoint dedicado de dashboard

## Objetivo

Reducir al maximo el tiempo de carga inicial de la app, especialmente en `dashboard`, evitando que el frontend tenga que pedir y procesar payloads grandes de:

- `GET /v1/data/sessions`
- `GET /v1/data/routines`

La idea principal es crear un endpoint especializado para inicio, por ejemplo:

- `GET /v1/data/dashboard`

Ese endpoint debe devolver solo los datos minimos y precisos que el dashboard necesita para renderizar rapido, dejando los detalles pesados para cargas posteriores o pantallas especificas.

## Problema actual

### 1) `/sessions` esta haciendo demasiado trabajo

Hoy `GET /v1/data/sessions` termina funcionando como un endpoint mixto:

- historial de sesiones
- resumen para dashboard
- fuente de datos para progresion por ejercicio
- fuente de datos para pesos anteriores en entrenamiento activo

Eso provoca que pueda enviar:

- hasta cientos de sesiones
- `exercises_json` completo por sesion
- arreglos anidados con ejercicios, series, pesos y timestamps

Aunque parte de esa informacion es util, no toda se necesita para pintar el dashboard inicial.

### 2) `/routines` tambien envia mas de lo necesario

`GET /v1/data/routines` puede incluir:

- todas las rutinas del usuario y publicas visibles
- todos los ejercicios por rutina
- `video_json` por ejercicio

Eso tiene sentido para la pantalla de rutinas, pero no para el dashboard inicial.

### 3) El dashboard depende de varias fuentes a la vez

Actualmente el inicio construye su UI combinando varios hooks y endpoints, lo que puede causar:

- multiples requests simultaneas
- mas parseo en frontend
- mas re-renders
- mas tiempo hasta que el usuario ve contenido util

## Objetivo tecnico del cambio

Separar claramente dos tipos de datos:

1. datos de primer render
   - pequeños
   - agregados
   - listos para mostrar
   - optimizados para latencia

2. datos de detalle
   - mas completos
   - usados solo cuando el usuario entra a pantallas o flujos especificos

## Principio de diseño

El dashboard no debe pedir todo el historial ni todas las rutinas completas para poder abrir.

En su lugar:

- el dashboard pide un payload resumido y precomputado
- la pantalla de rutinas pide rutinas completas cuando realmente se visita
- el historial completo de sesiones se pide solo cuando hace falta
- el detalle de ejercicios por sesion se hidrata bajo demanda o en background

## Propuesta de nueva API

### Endpoint nuevo

- `GET /v1/data/dashboard`

### Contenido esperado

Debe concentrar la informacion necesaria para el primer render del inicio.

#### Respuesta sugerida

```json
{
  "summary": {
    "totalWorkouts": 0,
    "thisWeekWorkouts": 0,
    "thisMonthWorkouts": 0,
    "currentStreak": 0,
    "longestStreak": 0,
    "averageDurationMin": 0
  },
  "recentSessions": [
    {
      "id": "...",
      "routineId": "...",
      "routineName": "...",
      "primaryMuscleGroup": "...",
      "completedAt": 0,
      "totalDuration": 0
    }
  ],
  "calendar": [
    {
      "date": "2026-03-07",
      "workouts": [
        {
          "sessionId": "...",
          "routineName": "...",
          "muscleGroup": "..."
        }
      ]
    }
  ],
  "dashboardRoutines": [
    {
      "id": "...",
      "name": "...",
      "exerciseCount": 0,
      "primaryMuscleGroup": "...",
      "timesUsed": 0,
      "createdBy": "...",
      "createdByName": "...",
      "createdByAvatarUrl": "...",
      "isPublic": true
    }
  ],
  "competition": {
    "weekLeader": null,
    "monthLeader": null,
    "userWeekRank": null,
    "userMonthRank": null
  },
  "lastWeightsByRoutine": {
    "routine_id": {
      "exercise_id": [40, 45, 45]
    }
  }
}
```

## Que debe entrar y que no debe entrar

### Debe entrar

- metricas agregadas del usuario
- sesiones recientes completadas, solo con campos resumen
- informacion minima para el calendario del dashboard
- rutinas visibles en inicio con conteo de ejercicios, pero no con todos sus detalles pesados
- leaderboard resumido si sigue siendo parte del inicio
- mapa de ultimos pesos por rutina si eso evita otro fetch caro durante `ActiveWorkout`

### No debe entrar

- `exercises_json` completo de todas las sesiones
- videos de ejercicios
- detalle completo de todas las rutinas
- payloads pensados para pantalla ADMIN
- historial completo del usuario si solo se muestran ultimas sesiones o resumenes

## Estrategia de optimizacion

### 1) Especializar responsabilidades por endpoint

#### `GET /v1/data/dashboard`

Uso:

- primer render del dashboard

Debe ser:

- rapido
- pequeño
- estable
- predecible

#### `GET /v1/data/sessions`

Uso:

- historial detallado
- progreso por ejercicio
- auditoria de sesiones
- vistas secundarias o cargas posteriores

Debe soportar modos claros:

- resumen
- detalle con ejercicios
- completed only
- limit configurable

#### `GET /v1/data/routines`

Uso:

- pantalla de rutinas
- edicion
- entrenamiento activo

Debe permitir:

- incluir o no videos
- incluir o no detalle completo de ejercicios si en algun punto se quiere resumir aun mas

### 2) Mover agregaciones al backend

En lugar de descargar mucha data y derivar todo en React, el backend debe devolver:

- conteos ya calculados
- listas ya acotadas
- estructuras ya adaptadas a la UI del dashboard

Esto reduce:

- bytes de red
- parseo JSON
- trabajo de `useMemo`
- trabajo de reconciliacion React

### 3) Priorizar primer paint y luego hidratar detalle

Orden ideal:

1. cargar `dashboard`
2. renderizar tarjetas, rutinas visibles, calendario y sesiones recientes
3. si hace falta, hidratar detalles en segundo plano

## Plan de implementacion por fases

### Fase 1 - Definir contrato del endpoint dashboard

- definir exactamente que datos consume `DashboardPage`
- listar que componentes dependen de esos datos:
  - resumen estadistico
  - recomendaciones musculares
  - calendario
  - rutinas visibles
  - leaderboard
  - pesos anteriores por rutina
- traducir esas necesidades a una respuesta compacta de backend
- documentar los campos obligatorios y opcionales

### Fase 2 - Crear capa backend dedicada

#### En `herculito-push-api`

- crear un modulo o ruta nueva para `GET /v1/data/dashboard`
- reutilizar consultas existentes donde convenga, pero sin arrastrar payload innecesario
- agregar consultas SQL especializadas para:
  - resumen global del usuario
  - sesiones recientes completadas
  - sesiones del rango necesario para calendario
  - rutinas visibles para dashboard
  - ranking resumido
  - ultimos pesos por rutina o por ejercicio, si aplica

#### Reglas importantes

- no leer ni parsear `exercises_json` masivamente si no es necesario
- si se necesita ultimos pesos, derivarlos con una consulta acotada solo a sesiones completadas recientes
- usar `LIMIT` bajos y razonables por defecto
- devolver solo columnas necesarias

### Fase 3 - Afinar endpoints existentes en paralelo

#### `/sessions`

- mantenerlo como endpoint detallado
- asegurar que soporte parametros como:
  - `limit`
  - `includeExercises`
  - `completedOnly`
- revisar si el default de `500` sigue siendo adecuado o si debe bajar para casos generales

#### `/routines`

- mantener soporte para:
  - `includeVideos`
- considerar agregar, si hace falta despues:
  - `summaryOnly`
  - `includeExercises`

### Fase 4 - Crear nueva capa de datos frontend para dashboard

#### En `herculito`

- crear tipos TS para la respuesta de `/v1/data/dashboard`
- agregar `fetchDashboardData()` en `src/shared/api/dataApi.ts`
- crear hook dedicado, por ejemplo:
  - `src/features/dashboard/hooks/useDashboardData.ts`

Ese hook debe exponer:

- `data`
- `loading`
- `error`
- `refresh`

Y debe ser la fuente principal del dashboard.

### Fase 5 - Migrar `DashboardPage` al endpoint nuevo

- reemplazar dependencias iniciales pesadas del dashboard por `useDashboardData()`
- reducir o eliminar fetches paralelos que hoy existen solo para el inicio
- dejar los datos detallados fuera del primer render
- conservar comportamiento actual de UI y negocio

### Fase 6 - Revisar entrenamiento activo

Uno de los puntos sensibles es `ActiveWorkout`, porque usa historico para sugerir pesos previos.

Hay dos caminos posibles:

#### Opcion recomendada

- incluir en `/v1/data/dashboard` un mapa pequeño de ultimos pesos por rutina/ejercicio para las rutinas visibles o recientes

Ventajas:

- evita pedir sesiones completas solo para precargar pesos
- hace que abrir entrenamiento tambien se sienta rapido

#### Opcion alternativa

- mantener el calculo desde `/sessions`, pero cargarlo luego del primer render

Desventaja:

- el dashboard puede abrir rapido, pero el entrenamiento activo seguiria dependiendo de una hidratacion posterior

### Fase 7 - Ajustar experiencia de usuario

- mantener skeletons livianos y coherentes con el nuevo flujo
- priorizar mostrar contenido util antes que esperar datos secundarios
- evitar flickers por rehidratar demasiadas partes al mismo tiempo
- si el dashboard ya tiene su payload principal, no bloquearlo por leaderboard o detalles secundarios si pueden llegar despues

### Fase 8 - Validacion tecnica y de performance

#### Medir antes y despues

- tamaño del payload de `/sessions`
- tamaño del payload de `/routines`
- tamaño del nuevo payload `/dashboard`
- tiempo de respuesta del backend
- tiempo hasta primer contenido visible en el dashboard

#### Validar funcionalmente

- el dashboard sigue mostrando la misma informacion esperada
- el calendario sigue correcto
- las rutinas visibles en inicio siguen correctas
- el leaderboard sigue correcto
- `ActiveWorkout` sigue mostrando pesos previos si asi se decide

#### Validar proyecto

- `pnpm lint`
- `pnpm build`
- `bun check`

## Archivos que probablemente se tocaran

### Frontend

- `src/features/dashboard/pages/DashboardPage.tsx`
- `src/features/dashboard/hooks/useDashboardData.ts`
- `src/features/workouts/hooks/useWorkoutSessions.ts`
- `src/features/routines/hooks/useRoutines.ts`
- `src/shared/api/dataApi.ts`
- `src/shared/types/index.ts`

### Backend

- `../herculito-push-api/src/modules/dashboard/routes.ts` o equivalente
- `../herculito-push-api/src/shared/persistence/data-store.ts`
- `../herculito-push-api/src/index.ts` o registro de rutas
- `../herculito-push-api/src/modules/sessions/routes.ts`
- `../herculito-push-api/src/modules/routines/routes.ts`

## Riesgos y consideraciones

1. No duplicar demasiada logica entre `/dashboard`, `/sessions` y `/routines`.
2. No romper `ActiveWorkout` al cambiar la fuente de ultimos pesos.
3. Mantener consistencia entre resumenes del dashboard y datos detallados de sesiones/rutinas.
4. Evitar que el nuevo endpoint termine creciendo hasta convertirse otra vez en un endpoint demasiado pesado.
5. Definir limites claros desde el inicio para que el payload del dashboard siga siendo pequeno.

## Criterio de terminado

- el dashboard renderiza con un endpoint dedicado y liviano
- la carga inicial ya no depende de descargar sesiones completas ni rutinas con videos
- `/sessions` queda reservado para detalle e historial
- `/routines` entrega payload adaptado segun el contexto
- la experiencia percibida mejora de forma clara en apertura inicial
- frontend y backend pasan sus chequeos principales

## Orden recomendado de ejecucion

1. definir contrato exacto de `/v1/data/dashboard`
2. implementar backend del endpoint
3. crear tipos y hook frontend
4. migrar `DashboardPage`
5. conectar pesos previos para `ActiveWorkout`
6. medir antes/despues y ajustar

## Nota importante

Este plan reemplaza el plan anterior del archivo y ahora se enfoca exclusivamente en optimizacion de carga inicial y arquitectura de datos para dashboard.
