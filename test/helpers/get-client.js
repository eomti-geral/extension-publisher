import webStoreUpload from '../../dist/uploader-publisher.js';

export default function getClient() {
  return webStoreUpload({
    extensionId: 'foo',
    clientId: 'bar',
    refreshToken: 'heyhey',
  });
}
