#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
export ASPNETCORE_URLS="http://127.0.0.1:5057"

api_bin="$root/api/Team Beauty Brownsville"
if [ ! -f "$api_bin" ]; then
  echo "API binary not found: $api_bin" >&2
  exit 1
fi
chmod +x "$api_bin"
"$api_bin" >/dev/null 2>&1 &
echo $! > "$root/api.pid"

nginx_bin=""
if [ -x "$root/nginx/sbin/nginx" ]; then
  nginx_bin="$root/nginx/sbin/nginx"
elif [ -x "$root/nginx/nginx" ]; then
  nginx_bin="$root/nginx/nginx"
else
  found="$(find "$root/nginx" -type f -name nginx -perm -111 2>/dev/null | head -n 1 || true)"
  if [ -n "$found" ]; then
    nginx_bin="$found"
  fi
fi

if [ -z "$nginx_bin" ]; then
  echo "Nginx binary not found under $root/nginx" >&2
  exit 1
fi
chmod +x "$nginx_bin"
"$nginx_bin" -p "$root/nginx" -c "conf/nginx.conf" -g "pid ../nginx.pid;"

echo "Open http://localhost"