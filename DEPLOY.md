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
5. Copiar el **Client ID** y generar un **Client Secret** (lo necesitás más adelante si querés configurar identity provider; el flujo OAuth público no requiere más config)

## Paso 3 — Configurar Decap CMS

Ya está configurado en `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: yusney/suba-tattoo
  branch: main
  base_url: https://suba.donduque.dev
  auth_endpoint: api
```

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
4. Tipo: **Dockerfile** (no Docker Compose, no Build Pack)
5. Conectar el repo de GitHub (`yusney/suba-tattoo`)
6. Branch: `main`
7. Configurar:
   - **Port**: `80`
   - **Healthcheck path**: `/`
   - **Domain**: agregar `suba.donduque.dev`
8. Click **Deploy**

Dokploy va a:
- Clonar el repo
- Construir la imagen Docker (multi-stage, ~2-3 min la primera vez)
- Levantar el container
- Configurar Traefik para SSL automático con Let's Encrypt

## Paso 5 — Webhook para auto-deploy

Después del primer deploy, Dokploy te da una URL de webhook. La agregás en GitHub:

1. Repo → Settings → Webhooks → **Add webhook**
2. **Payload URL**: la URL que te dio Dokploy (formato `https://dokploy.donduque.dev/api/webhook/...`)
3. **Content type**: `application/json`
4. **Trigger**: "Just the push event"
5. Click **Add webhook**

Ahora cada `git push` a `main` redespliega automáticamente.

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

**El admin no autentica:**
- Verificar que la `Authorization callback URL` en GitHub OAuth App coincide EXACTAMENTE con `https://suba.donduque.dev/admin/callback` (sin trailing slash, con https)
- Verificar que el `base_url` en `config.yml` coincide con el dominio real

**Las imágenes no se ven:**
- Verificar que la carpeta `public/images/` se commitea al repo
- Verificar que nginx sirve archivos estáticos correctamente (no debería haber problema con este Dockerfile)

**Las traducciones no funcionan:**
- Verificar que las URLs `/en/` y `/ca/` devuelven 200 (curl)
- Si dan 404, verificar la config de i18n en `astro.config.mjs`