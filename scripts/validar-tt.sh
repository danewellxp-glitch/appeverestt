#!/usr/bin/env bash
# Cenário de validação dos pedidos do TT (docs/PEDIDOS_TT.md), em loop até passar.
# Uso: scripts/validar-tt.sh [--deploy] ["texto esperado no site" ...]
#   1) checagens locais: typecheck, lint, testes e build do web (até 3 tentativas)
#   2) --deploy: reconstrói web e api de produção (docker-compose.prod.yml)
#   3) depois do deploy, repete a verificação pública até passar (até 10 vezes, a cada 15 s):
#      scripts/verificar-producao.mjs + cada texto esperado presente no bundle publicado.
set -uo pipefail
cd "$(dirname "$0")/.."

DEPLOY=0
ESPERADOS=()
for a in "$@"; do
  if [ "$a" = "--deploy" ]; then DEPLOY=1; else ESPERADOS+=("$a"); fi
done

tentar() { # tentar <vezes> <espera_s> <nome> <comando...>
  local vezes=$1 espera=$2 nome=$3; shift 3
  for i in $(seq 1 "$vezes"); do
    echo "▶ $nome (tentativa $i/$vezes)"
    if "$@"; then echo "✔ $nome"; return 0; fi
    [ "$i" -lt "$vezes" ] && sleep "$espera"
  done
  echo "✖ $nome falhou"; return 1
}

locais() {
  pnpm --filter ./apps/web typecheck &&
  pnpm lint &&
  pnpm --filter ./apps/web test &&
  pnpm --filter ./apps/web build
}
tentar 3 5 "checagens locais" locais || exit 1

[ "$DEPLOY" = 1 ] || { echo "Sem --deploy: nada publicado."; exit 0; }

echo "▶ deploy (web e api)"
docker compose -f docker-compose.prod.yml up -d --build web api || exit 1
docker image prune -f >/dev/null

DOMINIO=$(grep -E '^DOMINIO_APP=' .env | cut -d= -f2- | tr -d '"')
URL="https://$DOMINIO"

publico() {
  node scripts/verificar-producao.mjs "$URL" --contabo || return 1
  [ "${#ESPERADOS[@]}" -eq 0 ] && return 0
  local html js
  html=$(curl -fsS "$URL/") || return 1
  js=$(grep -oE '/assets/[^"]+\.js' <<<"$html" | sort -u | while read -r p; do curl -fsS "$URL$p"; done)
  for t in "${ESPERADOS[@]}"; do
    grep -qF "$t" <<<"$html$js" || { echo "  ✖ texto não publicado: $t"; return 1; }
    echo "  ✔ publicado: $t"
  done
}
tentar 10 15 "verificação pública ($URL)" publico || exit 1
echo "✔ deploy validado"
