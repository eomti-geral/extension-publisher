#!/usr/bin/env node
import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { createReadStream } from 'fs';
import { join, resolve } from 'path';
import chromeWebstoreUpload from './uploader-publisher';
import * as p from '@clack/prompts';
import { buildProjAlias } from './build-proj-alias';

config();

// Load paths from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const projExtDistPath = packageJson.path.dist;
const projExtArtifactPath = packageJson.path.artifact;

const adiar = (ms = 1500) => new Promise((resolve) => setTimeout(resolve, ms));
// Verificar se o modo verbose está ativado
const isVerbose = process.argv.includes('--verbose');
const noProjecProvided = process.argv.includes('--no-project');
const publishEnabled = !process.argv.includes('--no-publish');

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
  success?: boolean;
  dependsOn?: { id: string; successStatus: boolean }[];
  exitOnError?: boolean;
};

async function readManifest(
  projectPath: string,
  message: (message: string) => void
): Promise<ExtensionManifest> {
  try {
    const manifestPath = join(projectPath, projExtDistPath, 'manifest.json');
    message(`Reading manifest.json from ${manifestPath}`);
    const content = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    // Extract only the relevant properties
    const relevantInfo = {
      name: manifest.name,
      version: manifest.version,
    };

    message(
      'Relevant manifest.json properties:' + JSON.stringify(relevantInfo)
    );
    return relevantInfo;
  } catch (error) {
    throw new Error(
      `Failed to read manifest.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function deploy() {
  p.intro('🚀 Deploying your extension...');

  const { env } = process;
  const extensionId = env.EXTENSION_ARTIFACT_ID;
  const projectFolder = noProjecProvided ? '.' : env.EXTENSION_PROJECT_FOLDER;
  const clientId = env.GOOGLE_CLOUD_API_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLOUD_API_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_CLOUD_API_REFRESH_TOKEN;

  // Validar variáveis de ambiente necessárias
  if (
    !extensionId ||
    !projectFolder ||
    !clientId ||
    !clientSecret ||
    !refreshToken
  ) {
    throw new Error(
      'Missing required environment variables. Please check your .env file.'
    );
  }

  if (noProjecProvided) {
    buildProjAlias(p.log);
    log('Deploy executando em modo "no-project"');
  }

  // Ler o manifest.json da extensão
  let manifest: Record<string, unknown>;
  let artifactName: string;

  await new Promise((resolve) => setTimeout(resolve, 3000)); // Simular tempo de espera

  // Definir as tasks
  const tasks: Task[] = [
    {
      title: 'Preparando ambiente para deploy',
      id: 'preparar-ambiente',
      exitOnError: true,
      async task() {
        // Exibir informações do ambiente
        const envInfo = {
          extensionId,
          projectFolder,
          clientId: clientId ? '****' : undefined,
          clientSecret: clientSecret ? '****' : undefined,
          refreshToken: refreshToken ? '****' : undefined,
        };

        manifest = await readManifest(projectFolder, log);
        artifactName = !noProjecProvided
          ? `${manifest.name}(chrome)-${manifest.version}.zip`
          : 'live-test.zip';
        const artifactPath = resolve(
          projectFolder,
          projExtArtifactPath,
          artifactName
        );

        log('🔍 Environment variables:');
        log(JSON.stringify(envInfo, null, 2));

        // Exibir informações do manifest
        log(
          `🔍 Reading manifest.json from ${join(projectFolder, projExtDistPath, 'manifest.json')}`
        );
        log('🔍 Relevant manifest.json properties:');
        log(JSON.stringify(manifest, null, 2));

        // Verificar se o arquivo manifest.json existe
        try {
          await readFile(join(projectFolder, projExtDistPath, 'manifest.json'));
        } catch (error) {
          throw new Error(
            'O arquivo manifest.json não foi encontrado no local esperado. Verifique se ele foi gerado corretamente.'
          );
        }
        log('🔍 manifest.json encontrado.');

        // Verificar se o arquivo .zip do artefato existe
        try {
          await readFile(artifactPath);
        } catch (error) {
          throw new Error(
            `O arquivo .zip do artefato (${artifactName}) não foi encontrado no local esperado. Verifique se ele foi gerado corretamente.`
          );
        }

        // Exibir informações do artefato
        log(`🔍 Artifact found at: ${artifactPath}\n`);

        await adiar(); // Simular tempo de espera entre as tasks

        this.success = true; // Marcar a task como bem-sucedida
        return '✅ Ambiente preparado com sucesso';
      },
    },
    {
      title: 'Verificando validade do refresh token',
      id: 'validar-refresh-token',
      exitOnError: true,
      async task(message) {
        const store = chromeWebstoreUpload({
          extensionId,
          clientId,
          clientSecret,
          refreshToken,
        });

        try {
          log(
            '🔍 Se o refresh token for válido, esta tarefa será bem sucedida.'
          );
          message('Fetching token...');
          await adiar();
          const token = await store.fetchToken();

          log('🔍 Status atual da extensão');
          message('Fetching status extensão...');
          await adiar();
          const initialStatus = await store.get('DRAFT', token);

          log('🔍 Status atual da extensão:');
          log('🔍 Status atual:', initialStatus);
          log(`🔍 Response: ${initialStatus.uploadState}`);
          return `✅ O refresh token é válido`;
        } catch (error) {
          const manualInterventionMessage = [
            '⚠️ ATENÇÃO: REFRESH TOKEN EXPIRADO ⚠️',
            '',
            'O refresh token atual está inválido ou expirado.',
            'É necessário gerar um novo token usando o utilitário key-getter.',
            '',
            'AÇÕES NECESSÁRIAS:',
            '',
            '1. Abra o terminal na pasta do projeto',
            '',
            '2. Execute o utilitário key-getter:',
            '   → npm run key-getter',
            '',
            '3. Siga as instruções na tela para autenticação:',
            '   - Faça login com sua conta Google',
            '   - Autorize o acesso à Chrome Web Store',
            '',
            '5. Execute o deploy novamente após atualizar o token',
            '',
            'IMPORTANTE:',
            '- O refresh token tem validade limitada',
            '- Mantenha o novo token em local seguro',
            '- Não compartilhe o token com terceiros',
            '',
            '⚠️ Execute o deploy novamente após atualizar o token ⚠️',
            '',
          ];

          log(manualInterventionMessage.join('\n'));

          ('');
          if (error instanceof Error) {
            throw new Error(`Invalid refresh token: ${error.message}`);
          } else {
            throw new Error('Invalid refresh token: Unknown error');
          }
        }
      },
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

        log('🔍 fetching new token...');
        const token = await store.fetchToken();
        log('🔍 streaming zip file...');
        const zipStream = createReadStream(
          resolve(projectFolder, projExtArtifactPath, artifactName)
        );
        log('🔍 enviando...');

        let uploadResult;
        try {
          const res = await store.uploadExisting(zipStream, token);
          uploadResult = res;
        } catch (error) {
          if (error instanceof Error) p.log.error(error.message);
          throw new Error('Unkown error uploading extension');
        }

        if (uploadResult.uploadState === 'SUCCESS') {
          this.success = true; // Marcar a task como bem-sucedida
          log('Upload result:', uploadResult);
          return `Extension ${manifest.name} v${manifest.version} uploaded successfully`;
        } else {
          this.success = false; // Marcar a task como falhada
          log('Upload result:', uploadResult);
          throw new Error(
            `Upload failed: ${uploadResult.itemError?.[0]?.error_detail ?? 'Unknown error'}`
          );
        }
      },
    },
    {
      title: 'Publicando extensão',
      id: 'publicar-extensao',
      enabled: publishEnabled,
      dependsOn: [{ id: 'fazer-upload', successStatus: true }],

      async task() {
        const store = chromeWebstoreUpload({
          extensionId,
          clientId,
          clientSecret,
          refreshToken,
        });

        const token = await store.fetchToken();
        const publishResult = await store.publish('default', token);

        if (
          publishResult.status.includes('OK') ||
          publishResult.status.includes('ITEM_PENDING_REVIEW')
        ) {
          const isPending = publishResult.status.includes(
            'ITEM_PENDING_REVIEW'
          );
          this.success = true; // Marcar a task como bem-sucedida
          return (
            `Extension ${manifest.name} v${manifest.version} published successfully` +
            (isPending
              ? ' (Pending Review - Your extension requires an in-depth review due to requested permissions)'
              : '')
          );
        }
        throw new Error(
          `Publication failed: ${publishResult.statusDetail?.[0] ?? 'Unknown error'}`
        );
      },
    },
    {
      title: 'Falha do upload da extensão',
      id: 'falha-publicacao',
      dependsOn: [{ id: 'fazer-upload', successStatus: false }],
      async task() {
        const manualInterventionMessage = [
          '⚠️ ATENÇÃO: NECESSÁRIA INTERVENÇÃO MANUAL ⚠️',
          '',
          'Foi detectada uma condição que impede a publicação automática da extensão.',
          'Esta situação geralmente ocorre quando:',
          '',
          '1. Existe uma revisão pendente na Chrome Web Store',
          '2. Uma publicação anterior está em processo de análise',
          '3. A extensão está em estado de bloqueio temporário',
          '',
          'AÇÕES NECESSÁRIAS:',
          '',
          '1. Acesse a Chrome Web Store Developer Dashboard',
          '   → https://chrome.google.com/webstore/devconsole',
          '',
          `2. Localize sua extensão: ${manifest.name}`,
          `   ID: ${extensionId}`,
          '',
          '3. Verifique o status atual da extensão na seção "Status"',
          '',
          '4. Se houver uma revisão pendente:',
          '   - Clique no botão "Cancel Review" ou "Cancelar Revisão"',
          '   - Aguarde alguns minutos para que o sistema processe o cancelamento',
          '   - Tente executar o deploy novamente',
          '',
          '5. Se o problema persistir:',
          '   - Verifique se há notificações ou avisos no painel',
          '   - Certifique-se de que não há violações das políticas da Chrome Web Store',
          '   - Considere entrar em contato com o suporte da Chrome Web Store',
          '',
          'IMPORTANTE:',
          '- Não tente fazer múltiplos uploads sem resolver o status pendente',
          '- O processo de cancelamento pode levar até 30 minutos para ser efetivado',
          '- Após o cancelamento, aguarde alguns minutos antes de tentar novamente',
          '',
          'Para mais informações, consulte:',
          'https://developer.chrome.com/docs/webstore/publish',
          '',
          '⚠️ Execute o deploy novamente após realizar estas ações ⚠️',
          '',
        ];

        log(manualInterventionMessage.join('\n'));
        return '❌ Necessária intervenção manual na Chrome Web Store';
      },
    },
  ];

  // Executar as tasks
  //await p.tasks(tasks)
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (typeof task.enabled === 'boolean' && task.enabled === false) {
      continue;
    }
    if (task.dependsOn) {
      const dependencies = task.dependsOn
        .map((dep) => tasks.find((t) => t.id === dep.id))
        .filter(Boolean);
      if (dependencies.length !== task.dependsOn.length) {
        p.log.error(
          `Task "${task.title}" has unmet dependencies: ${task.dependsOn.join(', ')}`
        );
        continue;
      }
      if (
        dependencies.some((dep) => {
          if (dep && dep.success !== undefined) {
            return (
              dep.success !==
              task.dependsOn?.find((d) => d.id === dep.id)?.successStatus
            );
          }
          return false;
        })
      )
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
      if (
        typeof task.exitOnError !== 'undefined' &&
        task.exitOnError === true
      ) {
        p.log.error(`Task "${task.title}" failed. Exiting...`);
        process.exit(1);
      }
    }

    await adiar(); // Simular tempo de espera entre as tasks
  }

  if (!publishEnabled){
    p.log.warn('A publicação deverá ser realizada manualmente.');
    p.outro('✨ Deploy realizado com sucesso!');
  }
  else if (tasks.find((t) => t.id === 'publicar-extensao')?.success)
    p.outro('✨ Deploy realizado com sucesso!');
  else { 
    p.outro('❌ Deploy falhou! Verifique os logs para mais detalhes.'); 
    process.exit(1)
  }
}

// Executar o deploy
deploy().catch((error) => {
  console.error('Deploy failed:', error);
  log('Deployment error details:', error);
  process.exit(1);
});
