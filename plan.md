# Plan exacto de migracion total de Firebase Auth a Clerk

## Objetivo

Migrar el login actual (Firebase Auth con Google) a Clerk, sin perder acceso de usuarios existentes y manteniendo login con Google despues del corte.

## Resultado esperado

- Frontend sin SDK de Firebase Auth.
- Backend sin verificacion de Firebase ID tokens.
- Login con Google gestionado por Clerk.
- API autenticada con JWT de Clerk (`Bearer`) para minimizar cambios.
- Datos historicos preservados usando `legacy_firebase_uid` como identificador funcional.

---

## 0) Arquitectura objetivo (simple y segura)

1. Clerk maneja sign-in, sesiones y UI de autenticacion.
2. Frontend pide token a Clerk (`getToken`) y lo envia al backend en `Authorization: Bearer`.
3. Backend verifica JWT de Clerk (JWKS) y resuelve `appUserId`.
4. Para usuarios migrados: `appUserId = legacy_firebase_uid`.
5. Para usuarios nuevos: `appUserId` nuevo y estable (sin tocar usuarios viejos).

---

## 1) Configuracion en Clerk Dashboard (paso a paso)

Haz `dev` y `prod` en ambientes separados.

### 1.1 Crear aplicacion

1. Entrar a Clerk Dashboard.
2. Crear application: `Herculito`.
3. Guardar claves:
   - `Publishable key` (frontend)
   - `Secret key` (backend)

### 1.2 Configurar metodos de login

1. Ir a `User & Authentication`.
2. Habilitar `Google` en Social connections.
3. Mantener deshabilitados otros metodos si quieres solo Google.
4. Activar opcion de linking por email verificado (si esta disponible en tu plan/UI) para reducir duplicados.

### 1.3 Configurar dominios y redirects

1. En `Paths / Redirects` (o seccion equivalente):
   - Sign-in URL de la app.
   - After sign-in URL: `https://herculito.exloz.site/`
   - After sign-out URL: `https://herculito.exloz.site/`
2. Agregar dominio de produccion y localhost para desarrollo.
3. Confirmar HTTPS en prod.

### 1.4 Crear JWT Template para API

Crear template `herculito_api` con claims minimos:

```json
{
  "clerk_user_id": "{{user.id}}",
  "legacy_uid": "{{user.external_id}}",
  "email": "{{user.primary_email_address.email_address}}"
}
```

Notas:
- `legacy_uid` se usara para mantener continuidad de datos existentes.
- Si `legacy_uid` viene vacio en usuarios nuevos, el backend hara fallback a `clerk_user_id`.

### 1.5 Webhooks (recomendado)

Configurar webhook hacia tu API para eventos:

- `user.created`
- `user.updated`
- `user.deleted`

Guardar `CLERK_WEBHOOK_SECRET` en backend.

---

## 2) Google Cloud Console (solo si usas credenciales propias)

Si usas Google managed by Clerk, puedes omitir esta seccion.

Si usas credenciales propias:

1. En Clerk Social connection de Google, elegir `Use custom credentials`.
2. Copiar exactamente los Redirect URIs que Clerk te muestra.
3. En Google Cloud Console:
   - `APIs & Services` -> `OAuth consent screen`: configurar app y dominios.
   - `Credentials` -> `OAuth client ID` tipo Web.
   - Pegar los Redirect URIs de Clerk (exactos).
4. Pegar `Client ID` y `Client Secret` en Clerk.

---

## 3) Migracion de usuarios existentes (sin perder acceso)

### 3.1 Exportar desde Firebase Auth

Crear script temporal con Admin SDK (`listUsers`) y exportar:

- `legacy_firebase_uid` (`uid` Firebase)
- `email`
- `emailVerified`
- `displayName`
- `photoURL`
- `google_provider_uid` (si existe en `providerData`)

### 3.2 Importar a Clerk

Script de import usando Clerk Backend API:

1. Crear/actualizar usuarios en Clerk por email.
2. Setear `external_id = legacy_firebase_uid`.
3. Marcar email verificado cuando aplique.
4. Guardar reporte de:
   - total exportados
   - total importados
   - conflictos

### 3.3 Regla de continuidad de identidad

En backend usar:

- `appUserId = token.claims.legacy_uid` cuando exista.
- Fallback `appUserId = token.claims.clerk_user_id` para usuarios nuevos.

Con esto, los usuarios historicos siguen leyendo/escribiendo en sus datos antiguos sin migrar colecciones/tablas de negocio.

---

## 4) Cambios en backend (`herculito-push-api`)

### 4.1 Variables de entorno nuevas

- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY` (opcional en backend)
- `CLERK_JWKS_URL` (o derivado del issuer)
- `CLERK_ISSUER`
- `CLERK_AUDIENCE` (si defines audience en template)
- `CLERK_WEBHOOK_SECRET`

### 4.2 Middleware auth nuevo

Reemplazar middleware Firebase por Clerk:

1. Leer `Authorization: Bearer <token>`.
2. Verificar JWT con `jose` + JWKS de Clerk.
3. Extraer claims `legacy_uid`, `clerk_user_id`, `email`.
4. Resolver `request.userId = legacy_uid || clerk_user_id`.
5. Mantener rutas actuales:
   - `/v1/data/*`
   - `/v1/push/*`
   - `/v1/rest/*`

### 4.3 Endpoint de sincronizacion (opcional pero util)

`POST /v1/auth/sync`:

- Requiere token valido Clerk.
- Garantiza perfil local en DB (nombre/foto/email).
- Sirve para reconciliar datos tras primer login.

### 4.4 Seguridad

- Validar `iss`, `aud`, `exp` del JWT.
- Cache de JWKS con rotacion automatica.
- Rechazar tokens sin firma valida o sin subject.

---

## 5) Cambios en frontend (`herculito`)

### 5.1 Dependencias y entorno

1. Instalar `@clerk/clerk-react`.
2. Agregar en `.env` y `.env.example`:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_PUSH_API_ORIGIN`
3. Eliminar variables Firebase Auth.

### 5.2 Integracion base

1. En `src/main.tsx`, envolver app con `ClerkProvider`.
2. Reemplazar `src/hooks/useAuth.ts` para usar Clerk hooks.
3. Mantener interfaz `User` actual mapeando:
   - `id = user.externalId || user.id`
   - `email`, `name`, `photoURL` desde Clerk user.

### 5.3 Login UI

1. `src/pages/Login.tsx` mantiene boton "Continuar con Google".
2. `onGoogleLogin` abre flujo Clerk (redirect/modal).
3. `logout` usa `signOut` de Clerk.

### 5.4 API token en cliente

1. Reemplazar `getIdToken()` en `src/utils/apiClient.ts` por token de Clerk:
   - `getToken({ template: 'herculito_api' })`.
2. Mantener patron actual de `Authorization: Bearer` para minimizar cambios en:
   - `src/utils/dataApi.ts`
   - `src/utils/pushApi.ts`

### 5.5 Limpieza Firebase

1. Eliminar uso de `src/firebase/config.ts`.
2. Remover dependencia `firebase` de `package.json` cuando compile limpio.

---

## 6) Runbook de despliegue (corte total)

### Fase A - Preparacion

1. Configurar Clerk en `dev` y `prod`.
2. Implementar middleware Clerk en backend.
3. Importar usuarios Firebase a Clerk con `external_id`.
4. Validar JWT template `herculito_api`.

### Fase B - Staging

1. Deploy frontend con Clerk.
2. Probar login Google en desktop + iOS Safari + iOS PWA.
3. Confirmar que usuario historico conserva datos (mismo `legacy_uid`).

### Fase C - Produccion

1. Deploy backend con auth Clerk.
2. Deploy frontend Clerk-only.
3. Usuarios cerraran sesion una vez (esperado) y entraran de nuevo con Google.
4. Monitorear 72h.

### Fase D - Apagado Firebase Auth

1. Desactivar Firebase Auth en app cliente.
2. Retirar secretos y config Firebase residual.
3. Mantener export de usuarios como backup de auditoria.

---

## 7) Validaciones obligatorias

1. Login con Google funciona en web y PWA.
2. `Authorization: Bearer` con token Clerk llega y valida en API.
3. Usuario migrado ve historico completo (sin cuenta duplicada).
4. Push endpoints siguen funcionando con nuevo auth.
5. Tasa de error de login <= 1% durante 7 dias.

---

## 8) Rollback rapido

1. Re-deploy frontend anterior (Firebase) si falla masivo.
2. Mantener backend en modo dual temporal (Firebase + Clerk) durante ventana de seguridad.
3. No borrar import de Clerk ni backups de export Firebase.

---

## 9) Checklist de ejecucion

- [ ] Crear app en Clerk y configurar Google.
- [ ] Crear JWT template `herculito_api`.
- [ ] Implementar verificacion JWT Clerk en backend.
- [ ] Exportar Firebase users.
- [ ] Importar a Clerk con `external_id = legacy_firebase_uid`.
- [ ] Migrar frontend a `@clerk/clerk-react`.
- [ ] Quitar `firebase` del frontend.
- [ ] Probar staging (desktop + iOS Safari + iOS PWA).
- [ ] Deploy prod y monitoreo 72h.
- [ ] Apagar Firebase Auth por completo.

---

## 10) Criterio de exito

Migracion completada cuando:

- 100% de autenticacion entra por Clerk.
- 0 verificaciones de token Firebase en backend.
- 0 usuarios historicos sin acceso por cambio de login.
- Sin degradacion funcional en rutas de datos y push.
