#!/usr/bin/env sh
# Backup diário do servidor próprio: banco (pg_dump) e fotos de prova (volume do MinIO).
# Uso (na raiz do repo):  sh deploy/backup.sh
# Cron (todo dia às 3h):  0 3 * * * cd /root/projetos/app-tt && sh deploy/backup.sh >> deploy/backups/backup.log 2>&1
# Guarda os últimos 14 dias em deploy/backups/ (fora do git). Copie para fora do servidor de vez em quando.
set -eu

cd "$(dirname "$0")/.."
DESTINO="deploy/backups"
DATA="$(date +%Y-%m-%d_%H%M)"
COMPOSE="docker compose -f docker-compose.prod.yml"
mkdir -p "$DESTINO"

echo "[$DATA] banco..."
$COMPOSE exec -T postgres pg_dump -U everest -d everest --format=custom > "$DESTINO/banco-$DATA.dump"

echo "[$DATA] fotos..."
VOLUME="$($COMPOSE ps -q minio | xargs docker inspect --format '{{ range .Mounts }}{{ if eq .Destination "/bitnami/minio/data" }}{{ .Name }}{{ end }}{{ end }}')"
docker run --rm -v "$VOLUME":/dados:ro -v "$(pwd)/$DESTINO":/destino alpine \
  tar czf "/destino/fotos-$DATA.tar.gz" -C /dados .

find "$DESTINO" -name 'banco-*.dump' -mtime +14 -delete
find "$DESTINO" -name 'fotos-*.tar.gz' -mtime +14 -delete
echo "[$DATA] ok: $(ls -1 "$DESTINO" | wc -l) arquivos em $DESTINO"

# Restaurar o banco (cuidado: sobrescreve):
#   docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U everest -d everest --clean < deploy/backups/banco-AAAA-MM-DD_HHMM.dump
