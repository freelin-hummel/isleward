# Isleward on Coolify

## Files added for deployment

- `docker-compose.coolify.yml`
- `Dockerfile.client`
- `src/client/nginx.isleward.conf`
- `.env.coolify.example`

## How to deploy in Coolify

1. Create a new **Docker Compose** application in Coolify.
2. Point it at this repository.
3. Use `docker-compose.coolify.yml` as the compose file.
4. Add environment variables from `.env.coolify.example`.
5. Set `ISLEWARD_DOMAIN` to your public game domain.
6. Deploy.

## Connectivity model

- Browser connects to `https://<ISLEWARD_DOMAIN>` (client service).
- Nginx in `isleward-client` proxies:
  - `/socket.io/*` -> `isleward-server:5000`
  - `/rest/*` -> `isleward-server:5000`
- `isleward-server` connects to `rethinkdb:28015`.

This keeps websocket + REST same-origin and avoids cross-origin/socket issues.

## Troubleshooting checklist

### 0) `nc: not found` in logs

If Coolify emits repeated `sh: nc: not found`, it is using an `nc`-based healthcheck command.

This repo's runtime images now include netcat:

- `isleward-server` installs `netcat-openbsd`
- `isleward-client` installs `netcat-openbsd`

After pulling these changes, trigger a rebuild/redeploy in Coolify.

### 1) Server reachable internally

From the server container shell:

- `node -e "fetch('http://localhost:5000/rest/info').then(r=>r.text()).then(console.log)"`

Expected: JSON containing version (`v`) and online count (`p`).

### 2) Client proxy works

From any machine:

- `curl -i https://<ISLEWARD_DOMAIN>/rest/info`

Expected: HTTP 200 and JSON payload.

### 3) Websocket upgrade works

In browser devtools network, verify `/socket.io/` requests return `101 Switching Protocols`.

### 4) DB connection failures

If logs show DB auth/connection errors:

- confirm `IWD_DB_HOST=rethinkdb`
- confirm `IWD_DB_PORT=28015`
- confirm `IWD_DB_USER`/`IWD_DB_PASS`

Note: this repo had a typo fixed from `dpPass` to `dbPass` in server DB init.

### 5) Port mismatch issues

The server listens on `5000` by default. Dockerfile exposure was aligned to `5000`.

## Useful log targets

- `isleward-client` logs for proxy/websocket errors
- `isleward-server` logs for startup + DB issues
- `rethinkdb` logs for DB availability/auth
