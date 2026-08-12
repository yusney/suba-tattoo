# Deploy SUBA TATTOO

Guia paso a paso para desplegar en Dokploy (VPS con Docker).

## Entornos

| Entorno | URL | Notas |
|---|---|---|
| **Pre-producción / staging** | `https://suba.donduque.dev` | Subdominio temporal del dev (`donduque.dev`) — para que el artista revise el sitio mientras se construye. |
| **Producción** | TBD | Dominio propio del artista (ej: `subatattoo.com`). Se configura igual en Dokploy cuando esté disponible. |

> La diferencia entre los dos entornos es **solo el dominio**: el código, el Dockerfile, el pipeline de Dokploy, y el repo de GitHub son los mismos. Cambiar de staging a producción es swap de DNS + actualizacion de 3 archivos (`astro.config.mjs`, `robots.txt`, `Decap config.yml`).

## Estado actual

- **Repo GitHub**: `yusney/suba-tattoo` (configurado en `public/admin/config.yml`)
- **Entorno activo**: pre-producción en `https://suba.donduque.dev`

## Pre-requisitos

- VPS con Dokploy ya instalado y accesible
- Subdominio `suba.donduque.dev` con DNS A record apuntando a la IP del VPS
- Cuenta de GitHub con acceso al repo `yusney/suba-tattoo`

## Paso 1 — Crear el repo de GitHub (si todavía no existe)

```bash
# En el directorio del proyecto
cd /home/yusney/app/suba_tattoo
git init
git add .
git commit -m "Initial commit: SUBA TATTOO site"
gh repo create suba-tattoo --private --source=. --push
```

Si no tenés `gh` CLI, creá el repo manualmente en github.com y hacé:

```bash
git remote add origin git@github.com:yusney/suba-tattoo.git
git branch -M main
git push -u origin main
```

## Paso 2 — Crear GitHub OAuth App para Decap CMS

1. Ir a https://github.com/settings/developers
2. Click **New OAuth App**
3. Llenar:
   - **Application name**: `SUBA TATTOO CMS`
   - **Homepage URL**: `https://suba.donduque.dev`
   - **Authorization callback URL**: `https://suba.donduque.dev/admin/callback`
4. Click **Register application**
5. Copiar el **Client ID** y generar un **Client Secret**.

Necesitarás el **Client ID** y **Client Secret** de la OAuth App. Se configuran como variables de entorno en Dokploy (paso 4) con nombres `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

## Paso 3 — Configurar Decap CMS

Ya está configurado en `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: yusney/suba-tattoo
  branch: main
  base_url: https://suba.donduque.dev
  auth_endpoint: https://suba.donduque.dev/auth
```

El backend `github` apunta al proxy OAuth del propio container (`base_url + /auth`). El proxy corre como proceso Node dentro del container; Dokploy/Traefik no necesita config adicional.

Si tenés que cambiar el dominio en el futuro, editá:
- `public/admin/config.yml` → `base_url`
- `astro.config.mjs` → `site`
- `public/robots.txt` → URL del sitemap

Committear y pushear:

```bash
git add .
git commit -m "Configure for staging domain"
git push
```

## Paso 4 — Crear proyecto en Dokploy

1. Login en Dokploy (ej: `https://dokploy.donduque.dev` o donde lo tengas)
2. Click **Create Project** → nombre: `suba-tattoo`
3. Dentro del proyecto, click **Create Service** → **Application**
4. **Source**: GitHub → seleccionar repo `yusney/suba-tattoo`, branch `main`
5. **Build type**: **Dockerfile** (no Docker Compose, no Build Pack, no Nixpacks — nosotros tenemos un Dockerfile multi-stage custom)
6. Antes de desplegar, abrir **Environment** y agregar:
   - `OAUTH_CLIENT_ID`: Client ID de la OAuth App del paso 2
   - `OAUTH_CLIENT_SECRET`: Client Secret de la OAuth App del paso 2
   - `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — ver [Paso 4b — Configurar envío de emails (Resend)](#paso-4b--configurar-envío-de-emails-resend) para detalle de cada variable y pre-requisitos
7. Click **Deploy**

Dokploy va a:
- Clonar el repo
- Construir la imagen Docker (multi-stage, ~2-3 min la primera vez)
- Levantar el container exponiendo el puerto 80 (que es el `EXPOSE` de nuestro Dockerfile)
- Configurar Traefik como reverse proxy

## Paso 4b — Configurar envío de emails (Resend)

Los formularios de contacto (`/`) y reserva (`/reserva`) están cableados para enviar emails vía [Resend](https://resend.com). Si las tres variables de abajo no están configuradas, el sidecar Node sigue arrancando (Decap sigue funcionando) pero `POST /api/contact` responde **503 `email_not_configured`** y el frontend muestra "El servidor no está disponible ahora".

### Qué hace cada variable

| Variable | Qué es |
|---|---|
| `RESEND_API_KEY` | API key de Resend con permiso **Sending access** (NO full access). Crear en [resend.com/api-keys](https://resend.com/api-keys). |
| `CONTACT_TO_EMAIL` | Dirección que **recibe** los mensajes de los formularios (el inbox del artista). Staging puede ser un email personal del dev; producción debería ser el inbox del estudio (ej. `hola@subatattoo.es`). |
| `CONTACT_FROM_EMAIL` | Dirección que aparece como **remitente** del email. Formato: `"Nombre <mail@dominio>"`. **DEBE** ser una dirección de un dominio verificado dentro de Resend — si no, Resend rechaza el envío. |

### Pre-requisito para producción: verificar dominio

Resend exige verificar el dominio del `CONTACT_FROM_EMAIL` antes de permitir envíos hacia destinatarios externos. Sin dominio verificado, solo se puede enviar desde `onboarding@resend.dev` y **solo hacia emails de la cuenta Resend** (sirve para probar el flujo, no para producción).

Pasos para producción:

1. Crear cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain** → agregar el dominio del estudio (ej. `subatattoo.es`).
3. Resend devuelve registros DNS: **MX en el subdominio `send.`** (ej. `send.subatattoo.es → feedback-smtp.us-east-1.amazonses.com`), **DKIM** y **DMARC**. Agregarlos en el panel DNS del dominio y esperar a que Resend confirme la verificación.
4. Crear API key con permiso **Sending access** → guardar como `RESEND_API_KEY`.

En staging el dominio temporal es `suba.donduque.dev`; mientras ese dominio no esté verificado en Resend, podés probar el flujo enviando a tu propio email vía `onboarding@resend.dev` (limitaciones de Resend: solo hacia emails de la cuenta que creó la API key).

### Setup en Dokploy

1. Service `suba-tattoo` → tab **Environment**.
2. Agregar las tres variables:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   CONTACT_TO_EMAIL=tu-email@ejemplo.com
   CONTACT_FROM_EMAIL="SUBA TATTOO <noreply@subatattoo.es>"
   ```

3. **Deploy** / redeploy para que Dokploy re-inyecte las variables en el container.

### Verificación

- [ ] `curl -sI https://<host>/api/contact` → `405 Method Not Allowed` (el endpoint existe; sin `-X`, defaults to GET, el handler devuelve 405)
- [ ] `curl -X POST https://<host>/api/contact -H 'Content-Type: application/json' -d '{"form":"contact","name":"Test","email":"test@test.com","body":"X","style":"Y","description":"Z","website":""}'` → `200 {"ok":true}` y el email aparece en el inbox de `CONTACT_TO_EMAIL`
- [ ] Sin las variables configuradas: el mismo curl devuelve `503 {"error":"email_not_configured"}` y el log del container muestra el warning de startup
- [ ] El campo honeypot `website` (o `sitio_web` en reserva) con valor no-vacío devuelve `200 {"ok":true}` **sin** enviar email

## Paso 4c — Configurar anti-bot (Cloudflare Turnstile)

Los formularios de contacto (`/`) y reserva (`/reserva`) están protegidos con [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/), un CAPTCHA invisible que corre challenges en background (proof-of-work, browser probing) sin interrumpir al usuario real. Solo muestra un checkbox si el visitante parece sospechoso. Es gratis, GDPR-friendly y no manda tráfico a Google.

El sidecar verifica server-side el token antes de cualquier envío: si el captcha rechaza, el form devuelve `403 captcha_rejected` y **no se manda email**. Defensa en profundidad con el rate-limit (Paso 4a) y el honeypot (silently accepted).

### Qué hace cada variable

| Variable | Descripción |
|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | Sitekey pública, expuesta al browser. Formato: `0x4AAAAAAA...`. Se inyecta vía `import.meta.env` en build time. |
| `TURNSTILE_SECRET_KEY` | Secret key para verificar contra `challenges.cloudflare.com/turnstile/v0/siteverify`. **NUNCA** exponer públicamente. Formato: `0x4AAAAAAA...`. |

Si falta `TURNSTILE_SECRET_KEY`:
- **Producción**: el sidecar rechaza todos los submissions con `503 captcha_misconfigured` (fail closed, ver log).
- **Desarrollo**: el sidecar skipea la verificación con un warning en consola, los forms funcionan sin captcha.

### Pre-requisito: crear el site en Cloudflare

1. Ir a [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → **Add Widget**
2. Llenar:
   - **Widget name**: `SUBA TATTOO`
   - **Hostname**: `suba.donduque.dev` (o el dominio final en producción)
   - **Widget Mode**: **Managed** (recomendado — invisible para usuarios legítimos, solo muestra checkbox si el riesgo es alto)
3. Click **Create**
4. Copiar las dos keys que aparecen en el panel:
   - **Site Key** → `PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** → `TURNSTILE_SECRET_KEY`

### Setup en Dokploy

En el service del sitio → tab **Environment** → agregar las dos variables:

```
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAXXXXXXXXXXXX
TURNSTILE_SECRET_KEY=0x4BBBBBBBXXXXXXXXXXXX
```

Redeploy. Las variables se inyectan al container en el siguiente arranque del sidecar.

### Verificación

Después del redeploy, smoke tests contra `/api/contact`:

- [ ] **Sin token de captcha** (form submit sin widget, o token vacío) → `400 {"error":"captcha_required"}` y log `contact_captcha_missing`
- [ ] **Token inválido** (string cualquiera, ej. `"FAKE-TOKEN"`) → `403 {"error":"captcha_rejected"}` y log `contact_captcha_rejected` con `error-codes` de Turnstile
- [ ] **Token válido** (token real de un submit desde el browser, o test key `1x00000000000000000000AA` con secret matching) → `200 {"ok":true}` y log `contact_captcha_verified`
- [ ] **Sin `TURNSTILE_SECRET_KEY` en producción** → `503 {"error":"captcha_misconfigured"}` y error en stdout del container

En el browser, verificar visualmente que el widget aparece (puede ser invisible managed → no se ve nada, eso es correcto) y que el form submitea normalmente sin necesidad de interacción humana (los challenges corren en background).

### Próximo paso

Volver a [Paso 5 — Configurar dominio](#paso-5--configurar-dominio).

## Paso 5 — Configurar dominio

1. En el service recién creado, ir al tab **Domains**
2. Click **Add Domain**
3. Llenar:
   - **Host**: `suba.donduque.dev`
   - **Path**: `/` (dejar vacío o `/`)
   - **Container Port**: `80` (porque nginx escucha en 80 dentro del container)
   - **HTTPS**: **activado** (toggle on)
   - **Certificate**: `letsencrypt` (default)
4. Click **Save**

Dokploy automáticamente:
- Genera el archivo de config de Traefik para este dominio
- Solicita el certificado SSL a Let's Encrypt (puede tardar 1-2 min)
- Configura el routing del dominio al container

**No requiere redeploy** — los cambios de dominio en Dokploy se aplican via hot reload de Traefik.

**Importante**: el DNS A record de `suba.donduque.dev` tiene que apuntar a la IP del VPS **antes** de configurar el dominio en Dokploy, si no Let's Encrypt no va a poder validar el certificado.

## Paso 6 — Habilitar auto-deploy

1. En el service, ir al tab **General**
2. Toggle **Auto Deploy** → ON
3. Eso es todo. Dokploy usa GitHub App internamente, no necesitás configurar webhooks manualmente.

**Para GitHub específicamente:** Dokploy detecta pushes a la rama configurada (en nuestro caso `main`) y dispara un redeploy automático. Si usáramos GitLab / Bitbucket / Gitea, ahí sí habría que copiar el webhook URL manualmente desde el tab Deployments.

**Branch matching**: asegurate de que la rama configurada en Dokploy coincida con la rama a la que pusheás (debe ser `main`). Si hay mismatch, vas a ver "Branch Not Match" en los logs.

## Paso 6 — Verificar

```bash
# Deberia devolver HTML del sitio
curl -sI https://suba.donduque.dev

# Verificar el admin (deberia servir el HTML del panel)
curl -sI https://suba.donduque.dev/admin/

# Verificar que /en/ y /ca/ funcionan (i18n)
curl -sI https://suba.donduque.dev/en/
curl -sI https://suba.donduque.dev/ca/

# Sitemap
curl -sI https://suba.donduque.dev/sitemap-index.xml

# OG image
curl -sI https://suba.donduque.dev/images/og/og-default.jpg
```

## Paso 7 — Onboarding del artista

1. El artista va a `https://suba.donduque.dev/admin/`
2. Click **Login with GitHub**
3. GitHub le pide autorizar la OAuth App
4. Una vez autorizado, ve el panel de Decap con todas las colecciones

El artista necesita tener acceso de escritura al repo de GitHub. Opciones:
- Agregarlo como **collaborator** del repo (Settings → Collaborators)
- O usar una **GitHub Organization** donde ambos sean miembros

## Cuando consigan el dominio final (cutover pre-prod → producción)

1. Comprar el dominio definitivo (ej: `subatattoo.com`)
2. Configurar DNS A record → IP del VPS
3. En Dokploy, agregar el dominio final al service (mantener `suba.donduque.dev` también para preview si querés, o removerlo)
4. Actualizar en el código (solo 3 archivos):
   - `astro.config.mjs` → `site: 'https://[dominio-final]'`
   - `public/robots.txt` → URL del sitemap
   - `public/admin/config.yml` → `base_url`
5. En GitHub OAuth App, agregar el nuevo callback URL (podés tener varios callbacks en una misma OAuth App)
6. `git commit -m "Switch to production domain" && git push` — Dokploy redespliega automáticamente
7. Verificar con `curl -sI https://[dominio-final]`

> **Tip de roll-back rápido:** como Dokploy mantiene el `suba.donduque.dev` mientras siga configurado, si algo falla en producción podés volver a staging cambiando los 3 archivos al revés. El historial de git lo deja documentado.

## Mantenimiento

### Ver logs
```
En Dokploy UI → tu proyecto → tu servicio → Logs
```

### Actualizar el sitio
```bash
# Hacer cambios, commitear, pushear — Dokploy redespleiega automático
git add .
git commit -m "Tu mensaje"
git push
```

### Backup del VPS
Recomendado: cron + restic a S3/B2 cada noche. El código está en GitHub, pero los uploads via Decap CMS también commitean al repo, así que con backups del VPS estás cubierto.

### Monitor
Uptime Kuma (open source) en otro container, o similar. Apuntarlo a `https://suba.donduque.dev`.

## Troubleshooting

**El sitio no carga después del deploy:**
- Verificar logs en Dokploy
- Verificar que el DNS A record del subdominio apunta a la IP del VPS
- Verificar que el healthcheck pasa (`/` debe devolver 200)
- Verificar que Traefik pudo obtener el certificado SSL (puede tardar 1-2 min)

**El Login no completa el OAuth:**
- Verificar que `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET` estén presentes en las variables de entorno del container en Dokploy
- Verificar que `curl -sI https://<host>/auth` redirija a `github.com`
- Verificar que la `Authorization callback URL` en GitHub OAuth App sea EXACTAMENTE `https://<host>/admin/callback` (sin trailing slash, con https)
- Verificar que el `base_url` y `auth_endpoint` en `config.yml` coincidan con el dominio real

**Las imágenes no se ven:**
- Verificar que la carpeta `public/images/` se commitea al repo
- Verificar que nginx sirve archivos estáticos correctamente (no debería haber problema con este Dockerfile)

**Las traducciones no funcionan:**
- Verificar que las URLs `/en/` y `/ca/` devuelven 200 (curl)
- Si dan 404, verificar la config de i18n en `astro.config.mjs`

**Los formularios devuelven "El servidor no está disponible ahora":**
- El frontend muestra ese mensaje cuando `POST /api/contact` responde `503`. Verificar que `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` estén en el tab Environment del service en Dokploy.
- Si las variables están bien pero Resend rechaza el envío (`502 email_send_failed` en logs), verificar que el dominio en `CONTACT_FROM_EMAIL` esté verificado en el dashboard de Resend. Resend rechaza con `403`/`422` cualquier envío desde un dominio no verificado.
- Verificar logs del container: `Dokploy UI → service → Logs` y buscar líneas con `event: "contact_send_failed"` — el campo `upstreamStatus` indica el código HTTP exacto de Resend.
