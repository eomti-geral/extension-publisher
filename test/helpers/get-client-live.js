import chromeWebstoreUpload from '../../dist/uploader-publisher.js';

export default function getClient() {
    const store = chromeWebstoreUpload({
        extensionId: 'foo',
        clientId: process.env.GOOGLE_CLOUD_API_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLOUD_API_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_CLOUD_API_REFRESH_TOKEN,
    });

    return store;
}