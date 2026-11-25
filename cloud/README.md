# Бэкенд «Тренировыча» — Yandex Cloud

Напоминания бота об окончании отдыха, когда Mini App свёрнуто. Всё в бесплатном лимите Yandex Cloud.

Из российских дата-центров api.telegram.org недоступен, поэтому сообщения бота уходят через
пересыльщик `../relay` (Netlify Functions, `https://mashina-relay-b03004.netlify.app/tg`), закрытый
секретом `TG_RELAY_SECRET` (в `../.env.relay`). Данные пользователей остаются в РФ.

```
Mini App ──POST /rest/start|stop──▶ API Gateway ──▶ Cloud Function «mashina»
                                                      │  ▲
                              YDB (rest_state) ◀──────┤  │ триггер
                                                      ▼  │
                                      Message Queue «mashina-reminders» (задержка до 15 мин)
```

- `src/index.ts` — функция: HTTP-ручки и обработка сообщений из очереди.
- `src/yc.ts`, `src/sigv4.ts` — клиенты очереди и YDB Document API (без AWS SDK).
- `../server/initdata.ts` — проверка подписи Telegram initData (общая с тестами).

## Ресурсы (каталог `default`)

| Что | Имя / адрес |
|---|---|
| API Gateway | `https://d5dkrpd0jsig7e82lsnp.kf69zffa.apigw.yandexcloud.net` (= `NOTIFY_URL` в GitHub) |
| Функция | `mashina` (nodejs22, 128 МБ) |
| Очередь | `mashina-reminders` |
| Триггер | `mashina-reminders` (очередь → функция) |
| YDB serverless | `mashina`, таблица `rest_state` |
| Сервисный аккаунт | `mashina-bot` (editor), ключ — `../yc-key.json`, статический ключ — `../.env.yc` |

## Выкладка

```bash
cd cloud && npm install && npm test && ./scripts/deploy.sh
```

Секреты (`.env.bot`, `.env.yc`, `.env.relay`, `yc-key.json`) лежат в корне проекта и в git не попадают.

Пересыльщик: `cd relay && npm install && npx netlify deploy --prod --no-build --dir public --functions netlify/functions`
