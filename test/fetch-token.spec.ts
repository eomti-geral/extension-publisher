import { test, assert, beforeEach } from 'vitest';
import fetchMock from 'fetch-mock';
import { refreshTokenURI } from '../dist/uploader-publisher';
import getClient from './helpers/get-client';
import { TestContext } from './test-types';

beforeEach<TestContext>((context) => {
  fetchMock.reset();
  context.client = getClient();
});

test<TestContext>('Only returns token from response body', async ({
  client,
}) => {
  const accessToken = 'access-token';

  fetchMock.post(refreshTokenURI, {
    access_token: accessToken,
  });

  assert.equal(await client.fetchToken(), accessToken);
});

test<TestContext>('Should not return invalid_grant error', async ({
  client,
}) => {
  const errorResponse = {
    error: 'invalid_grant',
    error_description: 'Bad Request',
  };

  fetchMock.post(refreshTokenURI, {
    status: 400,
    body: errorResponse,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await client.fetchToken();
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (error instanceof Error) {
      assert.equal(error.message, 'Bad Request');
    } else {
      throw new Error('Unexpected error type');
    }
  }
});

test.todo('Request includes clientId, and refreshToken');
