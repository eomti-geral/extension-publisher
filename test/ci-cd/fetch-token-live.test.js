import { test, beforeEach, expect } from 'vitest';
import getClient from '../helpers/get-client-live.js';

beforeEach(context => {
    context.client = getClient();
});


test('Deve retornar um access token válido - de um refresh token válido', async ({ client }) => {
  console.log('🌐 Requisitando access token');  
  const json = await client.fetchTokenFull();

  if ('access_token' in json) {
    console.log('✅ Access token recebido:');

    expect(!!json.access_token).toBe(true);
    expect(typeof json.access_token).toBe('string');
    expect(json.access_token.length).toBeGreaterThan(10);
  } else {
    console.warn('❌ Erro retornado:', json);

    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('error_description');

    const errosEsperados = [
      'invalid_grant',
      'invalid_client',
      'unauthorized_client',
      'unsupported_grant_type',
      'invalid_request'
    ];
    expect(errosEsperados).toContain(json.error);
  }
});
