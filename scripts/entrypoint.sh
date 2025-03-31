#!/bin/sh
echo "Received parameters: $@"
exec node dist/index.js "$@"