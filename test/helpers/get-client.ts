import webStoreUpload, { APIClient } from '~/uploader-publisher';

export default function getClient(): APIClient {
  return webStoreUpload({
    extensionId: 'foo',
    clientId: 'bar',
    refreshToken: 'heyhey',
    clientSecret: 'unsecret',
  });
}
