import webStoreUpload from '../../src/uploader-publisher.js';

export default function getClient() {
    return webStoreUpload({
        extensionId: 'foo',
        clientId: 'bar',
        refreshToken: 'heyhey',
    });
}
