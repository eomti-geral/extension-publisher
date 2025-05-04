import { test, assert, expect, beforeEach } from 'vitest';
import fetchMock from 'fetch-mock';
import getClient from './helpers/get-client';
import { TestContext } from './test-types';

function stubTokenRequest(token = 'token') {
  fetchMock.postOnce('https://www.googleapis.com/oauth2/v4/token', {
    access_token: token,
  });
}

beforeEach<TestContext>((context) => {
  fetchMock.reset();
  context.client = getClient();
});

test<TestContext>('Upload fails when file stream not provided', async ({
  client,
}) => {
  //@ts-ignore - error provisional expected line bellow
  await expect(client.uploadExisting()).rejects.toThrowError(
    'Read stream missing'
  );
});

test<TestContext>('Upload only returns response body on success', async ({
  client,
}) => {
  const body = { foo: 'bar' };

  fetchMock.putOnce(
    'https://www.googleapis.com/upload/chromewebstore/v1.1/items/foo',
    body
  );

  stubTokenRequest();

  //@ts-ignore - error provisional expected line bellow
  const response = await client.uploadExisting({});
  //@ts-ignore - error provisional expected line bellow
  assert.deepEqual(response, body);
});

test<TestContext>('Upload does not fetch token when provided', async ({
  client,
}) => {
  fetchMock.putOnce(
    'https://www.googleapis.com/upload/chromewebstore/v1.1/items/foo',
    {}
  );

  //@ts-ignore - error provisional expected line bellow
  await client.uploadExisting({}, 'token');
});

test<TestContext>('Upload uses token for auth', async ({ client }) => {
  const token = 'token';

  stubTokenRequest(token);

  fetchMock.putOnce(
    'https://www.googleapis.com/upload/chromewebstore/v1.1/items/foo',
    {}
  );

  //@ts-ignore - error provisional expected line bellow
  await client.uploadExisting({});
});

test<TestContext>('Uses provided extension ID', async ({ client }) => {
  const { extensionId } = client;

  fetchMock.putOnce(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`,
    {
      foo: 'bar',
    }
  );

  //@ts-ignore - error provisional expected line bellow
  await client.uploadExisting({}, 'token');
});
