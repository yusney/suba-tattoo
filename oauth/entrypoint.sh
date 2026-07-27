#!/bin/sh
set -eu

# Trap TERM/INT BEFORE starting children so we always clean up if the
# container is stopped before the trap line is reached below.
shutdown() {
  kill -TERM "${oauth_pid:-}" 2>/dev/null || true
  kill -TERM "$(cat /tmp/nginx.pid 2>/dev/null)" 2>/dev/null || true
  wait "${oauth_pid:-}" 2>/dev/null || true
  exit 0
}
trap shutdown TERM INT

node /usr/local/app/decap-oauth.mjs &
oauth_pid=$!

attempt=0
until wget --quiet --tries=1 --spider http://127.0.0.1:3000/health; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ] || ! kill -0 "$oauth_pid" 2>/dev/null; then
    echo "OAuth server failed to become healthy" >&2
    kill -TERM "$oauth_pid" 2>/dev/null || true
    wait "$oauth_pid" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Foreground so Docker records nginx as PID 1's child and reaps it on TERM.
nginx -g "daemon off;"
status=$?
kill -TERM "$oauth_pid" 2>/dev/null || true
wait "$oauth_pid" 2>/dev/null || true
exit "$status"
