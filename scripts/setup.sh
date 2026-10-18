#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
if [ -f .env ]; then
  printf '%s\n' '.env already exists; existing local credentials were kept.'
  exit 0
fi

command -v openssl >/dev/null 2>&1 || {
  printf '%s\n' 'OpenSSL is required to generate local demo credentials.' >&2
  exit 1
}

falkor_password=$(openssl rand -hex 32)
api_token=$(openssl rand -hex 32)
auth_secret=$(openssl rand -hex 32)
operator_password=$(openssl rand -hex 32)
viewer_password=$(openssl rand -hex 32)

awk -F= -v falkor="$falkor_password" -v api="$api_token" \
  -v auth="$auth_secret" -v operator="$operator_password" -v viewer="$viewer_password" '
  BEGIN { OFS="=" }
  $1=="FALKORDB_PASSWORD" { $2=falkor }
  $1=="API_TOKEN" { $2=api }
  $1=="AUTH_SECRET" { $2=auth }
  $1=="ADMIN_PASSWORD" { $2="admin" }
  $1=="OPERATOR_PASSWORD" { $2=operator }
  $1=="VIEWER_PASSWORD" { $2=viewer }
  { print }
' .env.example > .env
chmod 600 .env
printf '%s\n' 'Local demo configuration created in .env.'
