#!/usr/bin/env sh
# Start the Crewww Docker stack and wait until the API is ready.
# Usage: ./scripts/start.sh [--build]
set -eu

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker, then retry." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example (local defaults)."
fi

docker compose up -d "$@"

port=$(sed -n 's/^WEB_PORT=//p' .env | head -n 1)
port=${port:-8080}

printf 'Waiting for http://localhost:%s/api/ready ...\n' "$port"
i=0
while [ "$i" -lt 100 ]; do
  if curl -fsS "http://localhost:$port/api/ready" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 3
done

docker compose ps

if ! curl -fsS "http://localhost:$port/api/ready" >/dev/null 2>&1; then
  echo "ERROR: API did not become ready. Inspect: docker compose logs migrate api" >&2
  exit 1
fi

printf '\nReady.\n  Storefront: http://localhost:%s\n  Admin:      http://localhost:%s/admin\n  Login:      http://localhost:%s/login\n  Admin user: admin@crewww.example.com / CrewwwOwner!2026\n' "$port" "$port" "$port"
