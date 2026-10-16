#!/bin/sh
set -e
# Free Render tier has no preDeployCommand — migrate at container start instead.
if [ "${DAMIGOS_SKIP_MIGRATE:-}" != "1" ]; then
  npm run db:migrate
fi
exec "$@"
