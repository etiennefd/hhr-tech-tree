#!/usr/bin/env bash
set -euo pipefail

port="${1:-${PORT:-3000}}"
iface="$(route -n get default 2>/dev/null | awk '/interface: / { print $2; exit }')"
if [[ -z "${iface}" ]]; then
  echo "Could not determine default network interface." >&2
  exit 1
fi

ip="$(ipconfig getifaddr "${iface}")"
if [[ -z "${ip}" ]]; then
  echo "No IP on ${iface}." >&2
  exit 1
fi

echo "http://${ip}:${port}"
