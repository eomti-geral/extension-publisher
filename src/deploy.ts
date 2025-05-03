#!/usr/bin/env node
import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, resolve } from 'path';
import chromeWebstoreUpload from './uploader-publisher.js';
import * as p from '@clack/prompts';
import { createDevBundle } from './bundle-developer.js';

config();

const adiar = () => new Promise(resolve => setTimeout(resolve, 1500))
// Verificar se o modo verbose está ativado
const isVerbose = process.argv.includes('--verbose');

function log(message: string, data?: unknown) {
    if (isVerbose) {
        p.log.info(`🔍 ${message}`);
        if (data) {
            p.log.info(JSON.stringify(data, null, 2));
        }
    }
}

type ExtensionManifest = {
    name: string;
    version: string;
};

type Task = {
    id?: string;
    title: string;
    task: (message: (message: string) => void) => Promise<string>;
    enabled?: boolean;
    success?: boolean
    dependsOn?: { id: string, successStatus: boolean}[];
    exitOnError?: boolean;
};

async function readManifest(projectPath: string, message: (message: string) => void): Promise<ExtensionManifest> {
    try {
        const manifestPath = join(projectPath, '.extension', 'dist', 'manifest.json');
        message(`Reading manifest.json from ${manifestPath}`);
        const content = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);
        
        // Extrair apenas as propriedades relevantes
        const relevantInfo = {
            name: manifest.name,
            version: manifest.version
        };
        
        message('Relevant manifest.json properties:' + JSON.stringify(relevantInfo));
        return relevantInfo;
    } catch (error) {
        throw new Error(`Failed to read manifest.json: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function deploy() {
    p.intro('🚀 Deploying your extension...');

    const { env } = process;
    const extensionId = env.EXTENSION_ARTIFACT_ID;
    const projectFolder = env.EXTENSION_PROJECT_FOLDER;
    const clientId = env.GOOGLE_CLOUD_API_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLOUD_API_CLIENT_SECRET;
    const refreshToken = env.GOOGLE_CLOUD_API_REFRESH_TOKEN;


    // Validar variáveis de ambiente necessárias
    if (!extensionId || !projectFolder || !clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing required environment variables. Please check your .env file.');
    }

    // Ler o manifest.json da extensão
    let manifest: Record<string, unknown>; 
    let artifactName: string 
    let artifactPath: string;

    await new Promise(resolve => setTimeout(resolve, 3000)); // Simular tempo de espera

    // Definir as tasks
    const tasks: Task[] = [
        {
            title: 'Preparando ambiente para deploy',
            id: 'preparar-ambiente',
            async task() {
                // Exibir informações do ambiente
                const envInfo = {
                    extensionId,
                    projectFolder,
                    clientId: clientId ? '****' : undefined,
                    clientSecret: clientSecret ? '****' : undefined,
                    refreshToken: refreshToken ? '****' : undefined
                };
                
                manifest = await readManifest(projectFolder, log);
                artifactName = `${manifest.name}(chrome)-${manifest.version}.zip`;
                artifactPath = resolve(projectFolder, '.extension', 'artifacts', artifactName);



                log('🔍 Environment variables:');
                log(JSON.stringify(envInfo, null, 2));

                // Exibir informações do manifest
                log(`🔍 Reading manifest.json from ${join(projectFolder, '.extension', 'dist', 'manifest.json')}`);
                log('🔍 Relevant manifest.json properties:');
                log(JSON.stringify(manifest, null, 2));

                // Exibir informações do artefato
                log(`🔍 Looking for artifact at: ${artifactPath}\n`);

                await adiar(); // Simular tempo de espera entre as tasks

                this.success = true; // Marcar a task como bem-sucedida
                return 'Ambiente preparado com sucesso';
            }
        },
        {
            title: 'Verificando status inicial da extensão',
            async task() {
                const store = chromeWebstoreUpload({
                    extensionId,
                    clientId,
                    clientSecret,
                    refreshToken,
                });

                const token = await store.fetchToken();
                const initialStatus = await store.get('DRAFT', token);
                return `Status atual: ${initialStatus.uploadState}`;
            }
        },
        {
            title: 'Fazendo upload da extensão',
            id: 'fazer-upload',
            async task() {
                const store = chromeWebstoreUpload({
                    extensionId,
                    clientId,
                    clientSecret,
                    refreshToken,
                });

                const token = await store.fetchToken();
                const zipStream = createReadStream(artifactPath);
                const uploadResult = await store.uploadExisting(zipStream, token);

                if (uploadResult.uploadState === 'SUCCESS') {
                    this.success = true; // Marcar a task como bem-sucedida
                    log('Upload result:', uploadResult);
                    return `Extension ${manifest.name} v${manifest.version} uploaded successfully`;
                }else {
                    this.success = false; // Marcar a task como falhada
                    log('Upload result:', uploadResult);
                    throw new Error(`Upload failed: ${uploadResult.itemError?.[0]?.error_detail ?? 'Unknown error'}`);
                }
            }
        },
        // {
        //     title: 'Criando bundle provisional',	
        //     id: 'criar-bundle-provisional',
        //     dependsOn: [{ id : 'fazer-upload', successStatus: false  }],
        //     exitOnError: true,
        //     async task() {
        //         // Importar dinamicamente para evitar problemas de dependência circular
                
        //         log('Criando bundle de provisional...');
        //         // Criar bundle de desenvolvimento
        //         await createDevBundle(projectFolder, log);
        //         this.success = true; // Marcar a task como bem-sucedida
        //         return 'Bundle de provisional criado com sucesso';
        //     },
        // },
        // {
        //     title: 'Fazendo upload do bundle provisional',
        //     dependsOn: [{ id : 'fazer-upload', successStatus: false  }],
        //     exitOnError: true,
        //     async task(message) {
        //         // Recriar o cliente e tentar upload novamente
        //         const store = chromeWebstoreUpload({
        //             extensionId,
        //             clientId,
        //             clientSecret,
        //             refreshToken,
        //         });

        //         const token = await store.fetchToken();
                
                
        //         // Atualizar manifest para refletir a nova versão
        //         const devArtifactName = `${manifest.name}(chrome)-${manifest.version + '.9999'}.zip`;
        //         const devArtifactPath = resolve(projectFolder, '.extension', 'artifacts', devArtifactName);

        //         message(`Fazendo upload do bundle de desenvolvimento: ${devArtifactPath}`);
                
        //         const zipStream = createReadStream(devArtifactPath);
        //         const uploadResult = await store.uploadExisting(zipStream, token);

        //         if (uploadResult.uploadState === 'SUCCESS') {
        //             return `Extensão provisional uploaded com sucesso`;
        //         }
        //         throw new Error(`Development version upload failed: ${uploadResult.itemError?.[0]?.error_detail ?? 'Unknown error'}`);
        //     },
        //     enabled: false // Será habilitada apenas se a task anterior falhar
        // },
        // {
        //     title: 'Refazendo upload da extensão',
        //     dependsOn: [{ id : 'fazer-upload', successStatus: false  }],
        //     id: 'refazer-upload',
        //     exitOnError: false,
        //     async task(message) {
        //         const store = chromeWebstoreUpload({
        //             extensionId,
        //             clientId,
        //             clientSecret,
        //             refreshToken,
        //         });

        //         log('Refazendo upload da extensão...');
        //         message('Enviando...')
                

        //         const token = await store.fetchToken();
        //         const zipStream = createReadStream(artifactPath);
        //         const uploadResult = await store.uploadExisting(zipStream, token);

                

        //         if (uploadResult.uploadState === 'SUCCESS') {
        //             this.success = true; // Marcar a task como bem-sucedida
        //             log('Upload result:', uploadResult);
        //             return `Extension ${manifest.name} v${manifest.version} uploaded successfully`;
        //         }else {
        //             this.success = false; // Marcar a task como falhada
        //             log('Upload result:', uploadResult);
        //             throw new Error(`Upload failed: ${uploadResult.itemError?.[0]?.error_detail ?? 'Unknown error'}`);
        //         }
        //     }
        // },
        {
            title: 'Publicando extensão',
            id: 'publicar-extensao',
            dependsOn: [{ id : 'fazer-upload', successStatus: true  }],

            async task() {
                const store = chromeWebstoreUpload({
                    extensionId,
                    clientId,
                    clientSecret,
                    refreshToken,
                });

                const token = await store.fetchToken();
                const publishResult = await store.publish('default', token);

                if (publishResult.status.includes('OK') || publishResult.status.includes('ITEM_PENDING_REVIEW')) {
                    const isPending = publishResult.status.includes('ITEM_PENDING_REVIEW');
                    return `Extension ${manifest.name} v${manifest.version} published successfully` + 
                        (isPending ? ' (Pending Review - Your extension requires an in-depth review due to requested permissions)' : '');
                }
                throw new Error(`Publication failed: ${publishResult.statusDetail?.[0] ?? 'Unknown error'}`);
            }
        },
        {
            title: 'Publicando extensão trustedTesters',
            id: 'publicar-extensao-trusted-testers',
            dependsOn: [{ id : 'refazer-upload', successStatus: true  }],
            async task() {
                const store = chromeWebstoreUpload({
                    extensionId,
                    clientId,
                    clientSecret,
                    refreshToken,
                });

                const token = await store.fetchToken();
                const publishResult = await store.publish('trustedTesters', token);

                if (publishResult.status.includes('OK') || publishResult.status.includes('ITEM_PENDING_REVIEW')) {
                    const isPending = publishResult.status.includes('ITEM_PENDING_REVIEW');
                    return `Extension ${manifest.name} v${manifest.version} published successfully` + 
                        (isPending ? ' (Pending Review - Your extension requires an in-depth review due to requested permissions)' : '');
                }
                throw new Error(`Publication failed: ${publishResult.statusDetail?.[0] ?? 'Unknown error'}`);
            }
        }
    ];

    // Executar as tasks
    //await p.tasks(tasks)
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (typeof task.enabled === 'boolean' && task.enabled === false) {
            continue;
        }
        if (task.dependsOn) {
            const dependencies = task.dependsOn.map(dep => tasks.find(t => t.id === dep.id)).filter(Boolean);
            if (dependencies.length !== task.dependsOn.length) {
                p.log.error(`Task "${task.title}" has unmet dependencies: ${task.dependsOn.join(', ')}`);
                continue;
            }
            if (dependencies.some(dep => { 
                if(dep && dep.success !== undefined) {
                    return dep.success !== task.dependsOn?.find(d => d.id === dep.id)?.successStatus;       
                }
            })) 
                continue; // Pular se alguma dependência falhou
        }

        const s = p.spinner();
        s.start(task.title);
        try {
            s.message(`🚀 ${task.title}`);
            const result = await task.task(s.message);
            s.stop(result ?? task.title);
        } catch (error) {
            const errorMessage = `❌ ${error instanceof Error ? error.message : String(error)}`;
            log('Task failed:', error);
            s.stop(errorMessage);
            task.success = false; // Marcar a task como falhada
            if(typeof task.exitOnError !== 'undefined' && task.exitOnError === true) {  
                p.log.error(`Task "${task.title}" failed. Exiting...`);
                process.exit(1);
            }
        }

        await adiar(); // Simular tempo de espera entre as tasks
    }

    p.outro('✨ Deploy completed successfully!');
}



// Executar o deploy
deploy().catch(error => {
    console.error('Deploy failed:', error);
    log('Deployment error details:', error);
    process.exit(1);
});