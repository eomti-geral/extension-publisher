import { test, assert, beforeEach } from 'vitest';
import fetchMock from 'fetch-mock';
import { refreshTokenURI } from '../src/uploader-publisher.js';
import getClient from './helpers/get-client.js';

beforeEach(context => {
    context.client = getClient();
});

test('Only returns token from response body', async ({ client }) => {
    const accessToken = 'access-token';

    fetchMock.post(refreshTokenURI, {
        access_token: accessToken,
    });

    assert.equal(await client.fetchToken(), accessToken);
});

test.todo('Request includes clientId, and refreshToken');
