# TAREA

## Objetivo
Cerrar las vulnerabilidades detectadas en `herculito.exloz.site` y dejar trazado qué ya quedó implementado en el repo y qué sigue pendiente en infraestructura.

## Hecho en este repo
- [x] Centralizar headers de seguridad en `nginx-security-headers.inc`.
- [x] Añadir `Strict-Transport-Security` en la configuración del contenedor `nginx`.
- [x] Añadir `Permissions-Policy`.
- [x] Cambiar `Referrer-Policy` a `strict-origin-when-cross-origin`.
- [x] Extender CSP con `manifest-src 'self'`.
- [x] Quitar el `<style>` inline de `index.html`.
- [x] Añadir `public/bootstrap.css` para el render inicial.
- [x] Añadir `public/.well-known/security.txt` como placeholder.
- [x] Actualizar `Dockerfile` para copiar `nginx-security-headers.inc`.

## Pendiente de infraestructura

### 1. Restringir SSH público en Oracle
Prioridad: alta

Acciones:
- [ ] Confirmar acceso administrativo al VPS por Tailscale.
- [ ] Abrir dos sesiones SSH antes de tocar reglas de red.
- [ ] En Oracle, eliminar o restringir la regla pública `0.0.0.0/0 -> 22/tcp`.
- [ ] Permitir acceso SSH solo por Tailscale o por una IP allowlist explícita.
- [ ] Verificar `sshd`: sin password auth y sin root login directo.

Validación:
- [ ] `nc -vz herculito.exloz.site 22` falla desde Internet abierta.
- [ ] `ssh usuario@<tailscale-ip-o-hostname>` sigue funcionando.

### 2. Forzar HTTP -> HTTPS en Traefik
Prioridad: alta

Acciones:
- [ ] Configurar redirect `web -> websecure` en el router o middleware de Traefik para `herculito.exloz.site`.
- [ ] Si todos los proyectos ya usan HTTPS, evaluar hacerlo global en Traefik.

Validación:
- [ ] `curl -I http://herculito.exloz.site` devuelve `301` o `308`.
- [ ] La respuesta tiene `Location: https://herculito.exloz.site/...`.

### 3. Activar HSTS en Traefik
Prioridad: alta

Nota:
`HSTS` le dice al navegador que use siempre HTTPS para ese dominio durante un tiempo.

Acciones:
- [ ] Empezar con `max-age=300`.
- [ ] Validar durante 24-48 horas que no haya recursos o rutas que dependan de HTTP.
- [ ] Subir luego a `max-age=31536000`.
- [ ] Añadir `includeSubDomains` solo si todos los subdominios relevantes están listos para HTTPS.

Validación:
- [ ] `curl -I https://herculito.exloz.site` muestra `Strict-Transport-Security`.

## Pendiente de despliegue

### 4. Desplegar la versión nueva de Herculito
Prioridad: alta

Acciones:
- [ ] Rebuild de la imagen.
- [ ] Redeploy en Dokploy.
- [ ] Verificar que el contenedor nuevo copie `nginx-security-headers.inc`.

Validación:
- [ ] El sitio responde correctamente tras el deploy.
- [ ] Clerk login/logout sigue funcionando.
- [ ] `sw.js` y `manifest.webmanifest` siguen cargando.

## Pendiente de verificación post-deploy

### 5. Validar headers reales en producción
Prioridad: alta

Acciones:
- [ ] Revisar `https://herculito.exloz.site`.
- [ ] Revisar `https://herculito.exloz.site/sw.js`.
- [ ] Revisar `https://herculito.exloz.site/manifest.webmanifest`.

Validación esperada:
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: ...`
- [ ] `Strict-Transport-Security: ...`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: SAMEORIGIN`

### 6. Volver a correr Web Check
Prioridad: media

Acciones:
- [ ] Ejecutar nuevamente el análisis.
- [ ] Comparar con el JSON anterior.

Resultado esperado:
- [ ] Desaparece el hallazgo de HSTS ausente.
- [ ] Mejora la evaluación de headers.
- [ ] Si SSH ya fue cerrado, desaparece `22` de `openPorts`.

## Pendiente funcional y de endurecimiento futuro

### 7. Endurecer más la CSP
Prioridad: media

Estado actual:
- La app todavía usa varios `style={...}` en React.
- Por eso se mantiene `style-src 'unsafe-inline'` por ahora.

Acciones:
- [ ] Mover casos simples de `style={...}` a clases Tailwind o CSS.
- [ ] Revisar si `img-src https:` puede restringirse a dominios concretos.
- [ ] Evaluar `form-action 'self'`.
- [ ] Hacer pruebas con Clerk en cada endurecimiento.

Resultado esperado:
- [ ] Reducir superficie CSP sin romper UI ni auth.

### 8. Reemplazar placeholder de `security.txt`
Prioridad: media

Acciones:
- [ ] Reemplazar `Contact: https://herculito.exloz.site` por un canal real y monitoreado.
- [ ] Usar mail o URL de política de seguridad real.

### 9. Evaluar DNSSEC y rate limiting/WAF
Prioridad: baja

Acciones:
- [ ] Revisar DNSSEC en el dominio `exloz.site`.
- [ ] Evaluar rate limiting o middlewares de seguridad en Traefik.

## Comandos útiles
```bash
curl -I http://herculito.exloz.site
curl -I https://herculito.exloz.site
curl -I https://herculito.exloz.site/sw.js
curl -I https://herculito.exloz.site/manifest.webmanifest
nc -vz herculito.exloz.site 22
```

## Archivos modificados en esta etapa
- `nginx.conf`
- `nginx-security-headers.inc`
- `Dockerfile`
- `index.html`
- `public/bootstrap.css`
- `public/.well-known/security.txt`
