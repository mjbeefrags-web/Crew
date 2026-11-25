# Domain, DNS, and TLS

The Compose stack binds the web container to `127.0.0.1:8080`. A host reverse
proxy terminates TLS and is the only public entry point.

## 1. DNS

| Record | Name | Value | TTL |
|---|---|---|---|
| A | `crewww.example.com` | server IPv4 | 300 |
| AAAA | `crewww.example.com` | server IPv6 (if available) | 300 |
| CAA | `crewww.example.com` | `0 issue "letsencrypt.org"` | 3600 |

Verify before issuing certificates:

```bash
dig +short crewww.example.com
```

## 2. Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot

# HTTP-only first, so the ACME challenge can be answered.
sudo certbot certonly --webroot -w /var/www/certbot -d crewww.example.com
```

Renewal is handled by the certbot timer. Confirm it is active:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

## 3. Install the proxy config

```bash
sudo cp deploy/nginx.tls.conf.template /etc/nginx/conf.d/crewww.conf
sudo sed -i 's/__DOMAIN__/crewww.example.com/g' /etc/nginx/conf.d/crewww.conf
sudo nginx -t
sudo systemctl reload nginx
```

The template adds:

- HTTP → HTTPS redirect, keeping `/.well-known/acme-challenge/` open
- TLS 1.2/1.3 with session caching and OCSP stapling
- HSTS, CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`
- Per-IP rate limits for the API (`20 r/s`, burst 40) and the site (`60 r/s`)
- `X-Request-ID` forwarding so nginx and API logs correlate

## 4. Verify

```bash
curl -fsSI https://crewww.example.com/ | sed -n '1,20p'
curl -fsS  https://crewww.example.com/api/health
curl -fsS  https://crewww.example.com/api/ready

# Expect: 200, strict-transport-security, content-security-policy
# Expect: {"status":"healthy",...} and {"status":"ready"}
```

Check the TLS grade with an external scanner (Qualys SSL Labs or
`testssl.sh`) after the first deploy.

## 5. Environment alignment

The API rejects unsafe production settings at startup. In `.env.production`:

```dotenv
APP_ENV=production
DEBUG=false
FRONTEND_ORIGINS=https://crewww.example.com
COOKIE_SECURE=true
REDIS_REQUIRED=true
```

`JWT_SECRET` must be at least 40 random characters. Generate it with
`openssl rand -hex 32`.

## Notes

- Keep `web` bound to loopback. If the proxy runs in Docker instead, attach it
  to the `internal` network and remove the host port mapping.
- The CSP allows `style-src 'unsafe-inline'` because React writes inline style
  attributes. Scripts remain `'self'` only.
- HSTS is added after HTTPS works end to end; the template ships with it
  enabled and a one-year max-age. Use a shorter max-age for the first rollout
  if you need an easier rollback.
