import { test, assert, beforeEach } from 'vitest';
import fetchMock from 'fetch-mock';
import getClient from './helpers/get-client';
import { TestContext } from './test-types';

beforeEach<TestContext>((context) => {
  fetchMock.reset();
  context.client = getClient();
});

test<TestContext>('Get uses default projection when not provided', async ({
  client,
}) => {
  const mock = fetchMock.getOnce('begin:https://www.googleapis.com', {});
  await client.get(undefined, 'token');

  assert.equal(
    mock.lastUrl(),
    'https://www.googleapis.com/chromewebstore/v1.1/items/foo?projection=DRAFT'
  );
});

test<TestContext>('Get does not fetch token when provided', async ({
  client,
}) => {
  fetchMock.getOnce(
    'begin:https://www.googleapis.com/chromewebstore/v1.1/items/',
    {}
  );
  await client.get(undefined, 'token');
});

test<TestContext>('Get uses token for auth', async ({ client }) => {
  const token = 'token';

  fetchMock.getOnce(
    {
      url: 'begin:https://www.googleapis.com/',
      headers: { Authorization: `Bearer ${token}` },
    },
    {}
  );

  await client.get(undefined, token);
});

test<TestContext>('Get uses provided extension ID', async ({ client }) => {
  const { extensionId } = client;

  fetchMock.getOnce(`path:/chromewebstore/v1.1/items/${extensionId}`, {});

  await client.get(undefined, 'token');
});
