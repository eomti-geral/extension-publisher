import { APIClient } from '~/uploader-publisher.js';
import chromeWebstoreUpload from '../../dist/uploader-publisher.js';
import dotenv from 'dotenv';

dotenv.config();

export default function getClient(): APIClient {
  const requiredEnvVars = [
    {
      key: 'EXTENSION_ARTIFACT_ID',
      error: 'Missing GOOGLE_CLOUD_API_EXTENSION_ID',
    },
    {
      key: 'GOOGLE_CLOUD_API_CLIENT_ID',
      error: 'Missing GOOGLE_CLOUD_API_CLIENT_ID',
    },
    {
      key: 'GOOGLE_CLOUD_API_CLIENT_SECRET',
      error: 'Missing GOOGLE_CLOUD_API_CLIENT_SECRET',
    },
    {
      key: 'GOOGLE_CLOUD_API_REFRESH_TOKEN',
      error: 'Missing GOOGLE_CLOUD_API_REFRESH_TOKEN',
    },
  ];

  requiredEnvVars.forEach(({ key, error }) => {
    if (!process.env[key]) {
      throw new Error(error);
    }
  });

  const store = chromeWebstoreUpload({
    extensionId: process.env.EXTENSION_ARTIFACT_ID as string,
    clientId: process.env.GOOGLE_CLOUD_API_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLOUD_API_CLIENT_SECRET as string,
    refreshToken: process.env.GOOGLE_CLOUD_API_REFRESH_TOKEN as string,
  });

  return store;
}
