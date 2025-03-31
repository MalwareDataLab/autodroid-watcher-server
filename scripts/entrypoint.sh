#!/bin/sh
ensure_public_permissions() {
    chmod -R 777 /app/experiments
}

trap 'ensure_public_permissions; exit' EXIT INT TERM HUP QUIT ABRT ALRM SEGV PIPE USR1 USR2

ensure_public_permissions
node dist/index.js "$@" || true
ensure_public_permissions