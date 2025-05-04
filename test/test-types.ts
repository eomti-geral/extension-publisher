import { TestContext as VitestTestContext } from 'vitest';
import { APIClient } from '../src/uploader-publisher';

export interface TestContext extends VitestTestContext {
  client: APIClient;
  token?: string;
}

export interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface UploadResponse {
  uploadState: string;
  [key: string]: any;
}
