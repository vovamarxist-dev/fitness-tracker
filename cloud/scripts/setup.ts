// Разовая настройка: очередь напоминаний и таблица состояния отдыха.
// Запуск: node --env-file=../.env.yc scripts/setup.ts <document_api_endpoint>
import { createQueue, credsFromEnv, DocApi, getQueueArn } from '../src/yc.ts';

const endpoint = process.argv[2];
if (!endpoint) throw new Error('usage: setup.ts <document_api_endpoint>');
const creds = credsFromEnv();

const queueUrl = await createQueue('mashina-reminders', creds);
const arn = await getQueueArn(queueUrl, creds);
console.log('QUEUE_URL=' + queueUrl);
console.log('QUEUE_ARN=' + arn);

const db = new DocApi(endpoint, creds);
try {
  await db.call('CreateTable', {
    TableName: 'rest_state',
    AttributeDefinitions: [{ AttributeName: 'uid', AttributeType: 'N' }],
    KeySchema: [{ AttributeName: 'uid', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  });
  console.log('table rest_state created');
} catch (e) {
  if (String(e).includes('ResourceInUse') || String(e).includes('already exists')) console.log('table rest_state exists');
  else throw e;
}
