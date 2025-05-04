import { test, assert, beforeEach } from 'vitest';
import fetchMock from 'fetch-mock';
import { refreshTokenURI } from '../dist/uploader-publisher.js';
import getClient from './helpers/get-client.js';

beforeEach((context) => {
  fetchMock.reset();
  context.client = getClient();
});

test('Only returns token from response body', async ({ client }) => {
  const accessToken = 'access-token';

  fetchMock.post(refreshTokenURI, {
    access_token: accessToken,
  });

  assert.equal(await client.fetchToken(), accessToken);
});

test('Should not return invalid_grant error', async ({ client }) => {
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
    assert.equal(error.message, 'Bad Request');
  }
});

test.todo('Request includes clientId, and refreshToken');
