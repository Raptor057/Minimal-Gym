#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"

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

if [ -n "$nginx_bin" ]; then
  "$nginx_bin" -p "$root/nginx" -c "conf/nginx.conf" -s stop -g "pid ../nginx.pid;" || true
fi

if [ -f "$root/nginx.pid" ]; then
  kill "$(cat "$root/nginx.pid")" 2>/dev/null || true
  rm -f "$root/nginx.pid"
fi

if [ -f "$root/api.pid" ]; then
  kill "$(cat "$root/api.pid")" 2>/dev/null || true
  rm -f "$root/api.pid"
else
  pkill -f "$root/api/Team Beauty Brownsville" 2>/dev/null || true
fi