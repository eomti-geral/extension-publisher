import { test, beforeEach, expect } from 'vitest';
import getClient from '../helpers/get-client-live';
import fs from 'node:fs';
import { UploadResponse } from 'test/test-types';
import { TestContext } from '../test-types';

beforeEach<TestContext>(async (context: TestContext) => {
  const client = getClient();

  context.client = client;
  context.token = await client.fetchToken();
});

test<TestContext>('A extensão deve estar em um estado que permita o envio e publicação de uma nova versão', async ({
  client,
  token,
}) => {
  const myZipFile: fs.ReadStream = fs.createReadStream(
    './web-ext-artifacts/live-test.zip'
  );

  console.log('🌐 Enviando versão de extensão de teste unitário');
  const response: UploadResponse = await client.uploadExisting(
    myZipFile,
    token
  );

  console.log('✅ Versão de extensão enviada:', response);

  expect(!!response.uploadState).toBe(true);
  expect(typeof response.uploadState).toBe('string');
  expect(response.uploadState).toBe('SUCCESS');
});
