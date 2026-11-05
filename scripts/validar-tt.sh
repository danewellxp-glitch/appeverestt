#!/usr/bin/env bash
# Cenário de validação dos pedidos do TT (docs/PEDIDOS_TT.md), em loop até passar.
# Uso: scripts/validar-tt.sh [--deploy] ["texto esperado no site" ...]
#   1) checagens locais: typecheck, lint, testes e build do web (até 3 tentativas)
#   2) --deploy: reconstrói web e api de produção (docker-compose.prod.yml)
#   3) depois do deploy, repete a verificação pública até passar (até 10 vezes, a cada 15 s):
#      scripts/verificar-producao.mjs + cada texto esperado presente no bundle publicado.
# Pode rodar de um worktree (ex.: ../app-tt-tt): o build usa o código commitado daquele worktree
# e o .env da pasta principal. Antes do deploy, marca as imagens atuais como :antes-<commit>.
set -uo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=.env
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$(git worktree list --porcelain | sed -n '1s/^worktree //p')/.env"
fi

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

ANTES=$(git rev-parse --short HEAD)
docker tag everest-web:producao "everest-web:antes-$ANTES" 2>/dev/null
docker tag everest-api:producao "everest-api:antes-$ANTES" 2>/dev/null
echo "▶ deploy (web e api) a partir de $(pwd) — imagens anteriores em :antes-$ANTES"
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build web api || exit 1
docker image prune -f >/dev/null

DOMINIO=$(grep -E '^DOMINIO_APP=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
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
