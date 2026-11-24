import { assertEquals } from 'jsr:@std/assert@1';
import { signInitData, verifyInitData } from './initdata.ts';

const TOKEN = '123456:TEST-token-for-unit-tests';
const now = Date.UTC(2026, 10, 24, 12, 0, 0);
const fields = {
  auth_date: String(Math.floor(now / 1000) - 60),
  query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
  user: JSON.stringify({ id: 279058397, first_name: 'Test' }),
};

Deno.test('верная подпись — возвращает id пользователя', async () => {
  const data = await signInitData(fields, TOKEN);
  assertEquals(await verifyInitData(data, TOKEN, 3600, now), 279058397);
});

Deno.test('чужой токен — отказ', async () => {
  const data = await signInitData(fields, TOKEN);
  assertEquals(await verifyInitData(data, '999:other', 3600, now), null);
});

Deno.test('подменённый пользователь — отказ', async () => {
  const data = await signInitData(fields, TOKEN);
  const forged = data.replace('279058397', '111111111');
  assertEquals(await verifyInitData(forged, TOKEN, 3600, now), null);
});

Deno.test('просроченные данные — отказ', async () => {
  const data = await signInitData(fields, TOKEN);
  assertEquals(await verifyInitData(data, TOKEN, 30, now), null);
});
