# Fixed Domain Deployment

The Quick Tunnel is for demos only. It depends on the local computer and can
return Cloudflare Error 103 when the local connector cannot reach the edge.
For a stable public URL, deploy the app on a server with a fixed domain and
run the reverse proxy in front of Node.

## Requirements

- A Linux server with Docker and Docker Compose v2.
- A domain whose DNS A/AAAA record points to the server.
- Ports 80 and 443 open in the server firewall.

## Deploy

```bash
cp .env.example .env
# Set production secrets in .env. Never commit this file.
export APP_DOMAIN=app.example.com
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

Caddy obtains and renews the HTTPS certificate automatically. The app keeps
its SQLite database and runtime imports in the `gaokao-data` volume.

## Verify

```bash
curl -fsS https://app.example.com/api/health
docker compose --env-file .env -f deploy/docker-compose.yml ps
docker compose --env-file .env -f deploy/docker-compose.yml logs --tail=100 app
```

Do not expose port 3001 publicly. Only Caddy should be reachable from the
internet. Keep the Quick Tunnel launcher for local demos, not production.
