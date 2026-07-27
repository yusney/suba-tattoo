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
7. Click **Deploy**

Dokploy va a:
- Clonar el repo
- Construir la imagen Docker (multi-stage, ~2-3 min la primera vez)
- Levantar el container exponiendo el puerto 80 (que es el `EXPOSE` de nuestro Dockerfile)
- Configurar Traefik como reverse proxy

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