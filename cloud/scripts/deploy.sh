#!/usr/bin/env bash
# Сборка и выкладка новой версии функции «mashina» в Yandex Cloud.
# Секреты берутся из ../.env.bot, ../.env.yc и ../.env.relay и в вывод не попадают.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build >/dev/null

set -a
source ../.env.bot
source ../.env.yc
source ../.env.relay
set +a

QUEUE_URL="https://message-queue.api.cloud.yandex.net/b1g2o9r83lq0o96pnfua/dj600000015usv2a01i6/mashina-reminders"
DOCAPI_ENDPOINT="https://docapi.serverless.yandexcloud.net/ru-central1/b1g2o9r83lq0o96pnfua/etnl4spfumd0us5ml530"

yc serverless function version create \
  --function-name mashina \
  --runtime nodejs22 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 15s \
  --source-path dist \
  --environment "BOT_TOKEN=${BOT_TOKEN},AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID},AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY},QUEUE_URL=${QUEUE_URL},TG_RELAY_URL=${TG_RELAY_URL},TG_RELAY_SECRET=${TG_RELAY_SECRET},DOCAPI_ENDPOINT=${DOCAPI_ENDPOINT},APP_URL=https://vovamarxist-dev.github.io/fitness-tracker/,ALLOWED_ORIGIN=https://vovamarxist-dev.github.io" \
  --format json | python3 -c "import json,sys; d=json.load(sys.stdin); print('version', d['id'], d['status'])"
