#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
//import { createDevBundle } from './bundle-developer.js';

console.log('🔍 Iniciando o script de teste...');
// Carregar variáveis de ambiente
config();

async function testar() {
  const projectPath = process.env.EXTENSION_PROJECT_FOLDER;

  if (!projectPath) {
    console.error('❌ EXTENSION_PROJECT_FOLDER não encontrado no arquivo .env');
    process.exit(1);
  }

  console.log('📦 Iniciando geração do bundle de desenvolvimento...');
  console.log(`📂 Usando caminho: ${resolve(projectPath)}`);

  try {
    //await createDevBundle(projectPath);
    console.log('✨ Bundle gerado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar bundle:', error);
    process.exit(1);
  }
}

testar().catch(console.error);
