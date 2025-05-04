import { test, beforeEach, expect } from 'vitest';
import getClient from '../helpers/get-client-live';
import { APIClient } from '../../src/uploader-publisher';

interface TestContext {
  client: APIClient;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

beforeEach((context: TestContext) => {
  context.client = getClient();
});

test('Deve retornar um access token válido - de um refresh token válido', async ({
  client,
}: TestContext) => {
  console.log('🌐 Requisitando access token');
  const json: TokenResponse = await client.fetchTokenFull();

  if ('access_token' in json) {
    console.log('✅ Access token recebido:');

    expect(!!json.access_token).toBe(true);
    expect(typeof json.access_token).toBe('string');
    expect(json.access_token?.length).toBeGreaterThan(10);
  } else {
    console.warn('❌ Erro retornado:', json);

    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('error_description');

    const errosEsperados = [
      'invalid_grant',
      'invalid_client',
      'unauthorized_client',
      'unsupported_grant_type',
      'invalid_request',
    ] as const;
    expect(errosEsperados).toContain(json.error);
  }
});
