import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign } from './sigv4.ts';

// Эталон из официального набора тестов AWS SigV4 (get-vanilla)
test('SigV4: совпадает с эталоном AWS get-vanilla', () => {
  const h = sign({
    method: 'GET',
    url: 'https://example.amazonaws.com/',
    service: 'service',
    region: 'us-east-1',
    headers: {},
    body: '',
    creds: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' },
    now: new Date(Date.UTC(2015, 7, 30, 12, 36, 0)),
  });
  assert.match(h.authorization, /SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31$/);
});
