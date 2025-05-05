import fs from 'fs';
import path from 'path';

const copyDirectory = (
  source: string,
  destination: string,
  log: { info: (msg: string) => void }
) => {
  log.info(`🔄 Copiando diretório de: ${source} para: ${destination}`);
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
    log.info(`📁 Diretório criado: ${destination}`);
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      log.info(`📂 Entrando no subdiretório: ${sourcePath}`);
      copyDirectory(sourcePath, destPath, log);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      log.info(`📄 Arquivo copiado: ${sourcePath} -> ${destPath}`);
    }
  });
};

export const buildProjAlias = async (log: {
  message: (message?: string, { symbol }?: any) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  step: (message: string) => void;
  warn: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
}) => {
  try {
    log.info('🚀 Iniciando buildProjAlias...');

    // Read package.json
    const packageJsonPath = 'package.json';
    log.info(`📖 Lendo: ${packageJsonPath}`);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const { dist: distPath, artifact: artifactPath } = packageJson.path;

    // Create dist directory
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
      log.info(`📁 Diretório 'dist' criado: ${distPath}`);
    } else {
      log.info(`✅ Diretório 'dist' já existe: ${distPath}`);
    }

    // Create artifact directory
    if (!fs.existsSync(artifactPath)) {
      fs.mkdirSync(artifactPath, { recursive: true });
      log.info(`📁 Diretório 'artifact' criado: ${artifactPath}`);
    } else {
      log.info(`✅ Diretório 'artifact' já existe: ${artifactPath}`);
    }

    // Copy test/extension to dist
    log.info('📤 Copiando extensão para dist...');
    copyDirectory('test/extension', distPath, log);

    // Copy web-ext-artifacts to artifact
    log.info('📤 Copiando artefatos web-ext para artifact...');
    copyDirectory('web-ext-artifacts', artifactPath, log);

    // Read manifest.json
    const manifestPath = path.join(distPath, 'manifest.json');
    log.info(`📖 Lendo manifest.json em: ${manifestPath}`);

    log.info('✅ Setup de deployment finalizado com sucesso!');
  } catch (error) {
    log.error?.('❌ Erro durante o setup de deployment:');
    if (error instanceof Error) log.error?.(error.message);
    else log.error?.('Erro desconhecido');
    throw error;
  }
};
