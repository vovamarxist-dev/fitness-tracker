// Оформление бота через Telegram Bot API: имя, описания, кнопка меню, аватар.
// Токен читается из .env.bot (файл в .gitignore) и никуда не выводится.
// Запуск: node scripts/setup-bot.mjs
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.bot', import.meta.url), 'utf8');
const TOKEN = env.match(/^BOT_TOKEN=(.+)$/m)?.[1]?.trim();
if (!TOKEN) {
  console.error('В .env.bot не найден BOT_TOKEN');
  process.exit(1);
}

const APP_URL = 'https://vovamarxist-dev.github.io/fitness-tracker/';
const NAME = 'Тренировыч — построй из себя машину';
const ABOUT = 'Построй из себя машину: настоящая дисциплина в тренировках, полный фокус и контроль. Focus on yourself!';
const DESCRIPTION = `ТРЕНИРОВЫЧ. ПОСТРОЙ ИЗ СЕБЯ МАШИНУ.

С нами ты построишь настоящую дисциплину в своих тренировках! Полностью сфокусируйся на тренировочном процессе — и держи его под контролем.

• Свои тренировки из каталога на 200 упражнений с анимацией.
• Таймер держит отдых: не залипнешь в телефоне, а если свернёшь приложение — бот напомнит.
• После тренировки — чёткий ответ, когда добавлять вес.

Focus on yourself!

Жми «Погнали» внизу и работай.`;

async function call(method, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  console.log(`${json.ok ? '✓' : '✗'} ${method}${json.ok ? '' : `: ${json.description}`}`);
  return json;
}

for (const [k, v, max] of [['name', NAME, 64], ['about', ABOUT, 120], ['description', DESCRIPTION, 512]]) {
  if (v.length > max) throw new Error(`${k}: ${v.length} > ${max}`);
}

const me = await call('getMe');
if (!me.ok) process.exit(1);
console.log(`  бот: @${me.result.username}`);

await call('setMyName', { name: NAME });
await call('setMyShortDescription', { short_description: ABOUT });
await call('setMyDescription', { description: DESCRIPTION });
await call('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Погнали', web_app: { url: APP_URL } } });

// Аватар бота: метод есть не во всех версиях Bot API — если его нет, загрузите вручную в BotFather
const form = new FormData();
form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://avatar' }));
form.append('avatar', new Blob([readFileSync(new URL('../branding/bot-avatar.png', import.meta.url))], { type: 'image/png' }), 'bot-avatar.png');
await call('setMyProfilePhoto', form);
