#!/usr/bin/env bash
# no-glaze installer shim. Delegates to bin/install.js.
set -euo pipefail

if [ -f "$(dirname "$0")/bin/install.js" ]; then
  exec node "$(dirname "$0")/bin/install.js" "$@"
else
  exec npx -y github:thecandylane/no-glaze "$@"
fi
