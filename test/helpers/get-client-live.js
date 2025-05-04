import chromeWebstoreUpload from '../../dist/uploader-publisher.js';
import dotenv from 'dotenv';

export default function getClient() {
  dotenv.config();

  if (!process.env.EXTENSION_ARTIFACT_ID) {
    throw new Error('Missing GOOGLE_CLOUD_API_EXTENSION_ID');
  }
  if (!process.env.GOOGLE_CLOUD_API_CLIENT_ID) {
    throw new Error('Missing GOOGLE_CLOUD_API_CLIENT_ID');
  }
  if (!process.env.GOOGLE_CLOUD_API_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_CLOUD_API_CLIENT_SECRET');
  }
  if (!process.env.GOOGLE_CLOUD_API_REFRESH_TOKEN) {
    throw new Error('Missing GOOGLE_CLOUD_API_REFRESH_TOKEN');
  }

  const store = chromeWebstoreUpload({
    extensionId: process.env.EXTENSION_ARTIFACT_ID,
    clientId: process.env.GOOGLE_CLOUD_API_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLOUD_API_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_CLOUD_API_REFRESH_TOKEN,
  });

  return store;
}
