# Оформление бота в @BotFather — «Тренировыч»

Тексты, аватар и кнопка меню выставляются скриптом `node scripts/setup-bot.mjs`
(токен в `.env.bot`). Картинку описания Bot API не поддерживает — она загружается вручную:
`/mybots` → бот → **Edit Bot** → **Edit Description Picture** → `bot-cover.png`.

## Имя, «О себе», описание
Актуальные тексты — в `scripts/setup-bot.mjs` (константы `NAME`, `ABOUT`, `DESCRIPTION`);
скрипт сам проверяет лимиты Telegram (64 / 120 / 512 символов).

## Картинки
- Аватар: `bot-avatar.png` (512×512)
- Картинка описания: `bot-cover.png` (640×360)

## Кнопка меню
`Погнали` → `https://vovamarxist-dev.github.io/fitness-tracker/`

## Команды — пока не задаём
У бота нет сервера, поэтому на сообщения и команды он не отвечает.
