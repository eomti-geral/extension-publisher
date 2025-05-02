#!/usr/bin/env node
import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, resolve } from 'path';
import chromeWebstoreUpload from './uploader-publisher.js';
import * as p from '@clack/prompts';

config();

// Verificar se o modo verbose está ativado
const isVerbose = process.argv.includes('--verbose');

function log(message: string, data?: unknown) {
    if (isVerbose) {
        console.log(`🔍 ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

type ExtensionManifest = {
    name: string;
    version: string;
};

async function readManifest(projectPath: string): Promise<ExtensionManifest> {
    try {
        const manifestPath = join(projectPath, '.extension', 'dist', 'manifest.json');
        log(`Reading manifest.json from ${manifestPath}`);
        const content = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);
        
        // Extrair apenas as propriedades relevantes
        const relevantInfo = {
            name: manifest.name,
            version: manifest.version
        };
        
        log('Relevant manifest.json properties:', relevantInfo);
        return relevantInfo;
    } catch (error) {
        throw new Error(`Failed to read manifest.json: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function deploy() {
    const { env } = process;
    const extensionId = env.EXTENSION_ARTIFACT_ID;
    const projectFolder = env.EXTENSION_PROJECT_FOLDER;
    const clientId = env.GOOGLE_CLOUD_API_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLOUD_API_CLIENT_SECRET;
    const refreshToken = env.GOOGLE_CLOUD_API_REFRESH_TOKEN;

    log('Environment variables:', {
        extensionId,
        projectFolder,
        clientId: clientId ? '****' : undefined,
        clientSecret: clientSecret ? '****' : undefined,
        refreshToken: refreshToken ? '****' : undefined
    });

    // Validar variáveis de ambiente necessárias
    if (!extensionId || !projectFolder || !clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing required environment variables. Please check your .env file.');
    }

    // Verificar status inicial da extensão
    const store = chromeWebstoreUpload({
        extensionId,
        clientId,
        clientSecret,
        refreshToken,
    });

    const token = await store.fetchToken();
    console.log('\n🔍 Status inicial da extensão:');
    const initialStatus = await store.get('DRAFT', token);
    console.log(JSON.stringify(initialStatus, null, 2));
    console.log(); // Linha em branco para melhor legibilidade

    // Ler o manifest.json da extensão
    const manifest = await readManifest(projectFolder);
    const artifactName = `${manifest.name}(chrome)-${manifest.version}.zip`;
    const artifactPath = resolve(projectFolder, '.extension', 'artifacts', artifactName);

    log(`Looking for artifact at: ${artifactPath}`);

    // Inicializar o spinner para feedback visual
    const tasks = [
        {
            title: 'Uploading extension to Chrome Web Store',
            async task() {
                log('Initializing Chrome Web Store client');
                const store = chromeWebstoreUpload({
                    extensionId,
                    clientId,
                    clientSecret,
                    refreshToken,
                });

                // Obter o token de acesso
                log('Fetching access token');
                const token = await store.fetchToken();
                log('Access token obtained');

                // Criar stream do arquivo zip
                log(`Creating read stream for ${artifactPath}`);
                const zipStream = createReadStream(artifactPath);

                // Fazer upload da extensão
                log('Starting extension upload');
                const uploadResult = await store.uploadExisting(zipStream, token);
                log('Upload result:', uploadResult);

                if (uploadResult.uploadState === 'SUCCESS') {
                    return `Extension ${manifest.name} v${manifest.version} uploaded successfully`;
                }
                throw new Error(`Upload failed: ${uploadResult.itemError?.[0]?.error_detail ?? 'Unknown error'}`);
            },
        },
        {
            title: 'Publishing extension',
            async task() {
                log('Initializing Chrome Web Store client for publication');
                const store = chromeWebstoreUpload({
                    extensionId,
                    clientId,
                    clientSecret,
                    refreshToken,
                });

                log('Fetching new access token for publication');
                const token = await store.fetchToken();
                log('Access token obtained for publication');

                log('Publishing extension');
                const publishResult = await store.publish('default', token);
                log('Publish result:', publishResult);

                if (publishResult.status.includes('OK') || publishResult.status.includes('ITEM_PENDING_REVIEW')) {
                    const isPending = publishResult.status.includes('ITEM_PENDING_REVIEW');
                    const message = `Extension ${manifest.name} v${manifest.version} published successfully` + 
                        (isPending ? ' (Pending Review - Your extension requires an in-depth review due to requested permissions)' : '');
                    return message;
                }
                throw new Error(`Publication failed: ${publishResult.statusDetail?.[0] ?? 'Unknown error'}`);
            },
        },
    ];

    // Executar as tasks
    for (const task of tasks) {
        const s = p.spinner();
        s.start(task.title);
        try {
            // eslint-disable-next-line no-await-in-loop
            const result = await task.task();
            s.stop(result);
        } catch (error) {
            const errorMessage = `❌ ${error instanceof Error ? error.message : String(error)}`;
            log('Task failed:', error);
            s.stop(errorMessage);
            process.exit(1);
        }
    }

    p.outro('✨ Deploy completed successfully!');
}

// Executar o deploy
deploy().catch(error => {
    console.error('Deploy failed:', error);
    log('Deployment error details:', error);
    process.exit(1);
});