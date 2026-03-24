# Hong Kong mirror deployment

This directory contains the minimal runtime assets for the China-facing mirror deployment.

## Target runtime

- Tencent Cloud Lighthouse
- Region: Hong Kong
- Ubuntu LTS
- Node.js 20
- PM2
- Caddy

## Required runtime env

Set these variables on the Hong Kong server before starting PM2:

- `SITE_ROLE=mirror`
- `DICTIONARY_UPSTREAM_URL=https://2sh-shanghaihua.vercel.app/api/dictionary/current`
- `SYNC_ENABLED=false`
- `MIRROR_CACHE_PATH=/srv/2sh/shared/mirror-current-dictionary.json`
- `MIRROR_CACHE_TTL_MS=300000`

Do not set `BLOB_READ_WRITE_TOKEN` on the mirror.

## Suggested server layout

- App checkout: `/srv/2sh/current`
- Shared cache dir: `/srv/2sh/shared`
- PM2 app dir: `/srv/2sh/current`

## Bootstrap

1. Install Node.js 20, PM2, and Caddy.
2. Clone the repo to `/srv/2sh/current`.
3. Copy `deploy/mirror/.env.production.example` to `/srv/2sh/current/.env.production` and replace the domain values.
4. Copy `deploy/mirror/Caddyfile` into Caddy and replace `cn.example.com` with the real mirror domain.
5. Run `npm ci` and `npm run build`.
6. Start the app with `pm2 start deploy/mirror/ecosystem.config.cjs`.

## GitHub Actions secrets

The workflow in `.github/workflows/deploy-hk-mirror.yml` expects:

- `HK_MIRROR_HOST`
- `HK_MIRROR_PORT`
- `HK_MIRROR_USER`
- `HK_MIRROR_SSH_KEY`
- `HK_MIRROR_APP_DIR`
