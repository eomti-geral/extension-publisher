#!/usr/bin/env node
import { mkdir, readFile, writeFile, cp, rm } from 'fs/promises';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

type ManifestJson = {
    name: string;
    version: string;
    [key: string]: unknown;
};

async function createDevBundle(rootPath: string, message?: (str: string)=>void): Promise<void> {
    if (!message){
        message = (str: string) => console.log(str);
    }

    try {
        // Resolver caminhos absolutos
        const absoluteRootPath = resolve(rootPath);
        const sourceDir = resolve(join(absoluteRootPath, '.extension', 'dist'));
        const tempDir = resolve(join(absoluteRootPath, '.extension', 'temp_dev'));
        const artifactsDir = resolve(join(absoluteRootPath, '.extension', 'artifacts'));
        
        // Criar diretório temporário
        await mkdir(tempDir, { recursive: true });
        await mkdir(artifactsDir, { recursive: true });
        
        // Copiar conteúdo da pasta dist para temp
        await cp(sourceDir, tempDir, { recursive: true });
        
        // Ler e modificar o manifest.json
        const manifestPath = join(tempDir, 'manifest.json');
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent) as ManifestJson;
        
        // Adicionar quarto segmento à versão
        const currentVersion = manifest.version;
        manifest.version = `${currentVersion}.9999`;
        
        // Salvar manifest modificado
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        // Gerar nome do arquivo zip (mantendo caracteres especiais)
        const zipName = `${manifest.name}(chrome)-${manifest.version}.zip`;
        const tempZipName = 'temp-extension.zip';
        
        // Executar web-ext build com nome temporário
        execSync(`npx web-ext build --source-dir "${tempDir}" --artifacts-dir "${artifactsDir}" --filename "${tempZipName}" --no-config`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        // Renomear o arquivo para o nome desejado
        const oldPath = join(artifactsDir, tempZipName);
        const newPath = join(artifactsDir, zipName);
        
        try {
            // Remover arquivo existente se houver
            await rm(newPath, { force: true });
        } catch (error) {
            // Ignora erro se arquivo não existir
        }
        
        // Renomear arquivo
        await rm(newPath, { force: true }).catch(() => {});
        await cp(oldPath, newPath);
        await rm(oldPath);
        
        // Limpar diretório temporário
        await rm(tempDir, { recursive: true, force: true });
        
        message(`Bundle de desenvolvimento criado com sucesso: ${newPath}`);
    } catch (error) {
        message('Erro ao criar bundle de desenvolvimento: ' + (error as { message: string }).message);
        throw error;
    }
}

// Se o arquivo for executado diretamente
// if (process.argv[1] === resolve(process.argv[1])) {
//     const rootPath = process.argv[2];
//     if (rootPath)    
//     createDevBundle(rootPath).catch(error => {
//         console.error('Falha ao criar bundle:', error);
//         process.exit(1);
//     });
// }

export { createDevBundle };