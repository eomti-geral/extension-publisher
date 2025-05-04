# Ferramenta de Deploy de Extensão Chrome

Uma ferramenta CLI robusta para automatizar o deploy de extensões Chrome na Chrome Web Store. Este projeto oferece uma forma simplificada de gerenciar autenticação, upload e publicação de extensões Chrome de forma programática.

## Visão Geral do Projeto

Esta ferramenta simplifica o processo de deploy de extensões Chrome ao gerenciar o fluxo de autenticação com as APIs do Google Cloud e o processo de upload/publicação na Chrome Web Store. É particularmente útil para pipelines de CI/CD e cenários de deploy automatizado.

## Começando

1. Configure seu Projeto Google Cloud e habilite a API da Chrome Web Store. (Veja os projetos baseados para realizar a configuração )
2. Configure seu arquivo `.env` com as credenciais necessárias
3. Execute o key-getter para obter e armazenar seu token de atualização
4. Use o script principal de deploy para fazer upload e publicar sua extensão

Para documentação detalhada da API e uso avançado, consulte o código fonte no diretório `src`.

### Baseado em

Este projeto foi construído com base nos excelentes trabalhos:

- [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys) - Para gerenciamento de chaves de autenticação
- [chrome-webstore-upload](https://github.com/fregante/chrome-webstore-upload) - Para funcionalidade de upload

## Utilitário para Fluxo de Deploy

O processo de deploy é totalmente automatizado e segue um fluxo estruturado de tarefas (tasks) que garantem a correta publicação da extensão.

> ⚠️ **AVISO IMPORTANTE PARA CI/CD**
>
> Para utilização em pipelines de CI/CD, é **OBRIGATÓRIO** que exista um refresh token válido previamente configurado.
>
> - O refresh token deve ser obtido através do utilitário key-getter
> - A obtenção do token requer interação manual por questões de segurança
> - O token deve estar configurado como variável CI/CD `GOOGLE_CLOUD_REFRESH_TOKEN` no GitLab
> - Sem um token válido, o pipeline falhará na etapa de autenticação
> - O status da extensão na loja do google deverá estar como Rascunho ou Publicada

### Etapas do Deploy

1. **Preparação do Ambiente**

   - Validação das variáveis de ambiente necessárias
   - Leitura do manifest.json da extensão
   - Verificação do arquivo de artefato (.zip)

2. **Verificação do Token**

   - Validação do token de atualização existente
   - Geração de novo token se necessário (quando expirado ou ausente)
   - Atualização automática do token no GitLab CI/CD

3. **Status Inicial**

   - Verificação do estado atual da extensão na Chrome Web Store
   - Validação de possíveis bloqueios ou revisões pendentes

4. **Upload da Extensão**

   - Envio do arquivo .zip da extensão
   - Validação do resultado do upload
   - Tratamento de erros específicos

5. **Publicação**
   - Publicação automática da nova versão
   - Verificação do status de publicação
   - Identificação de necessidade de revisão manual

### Tratamento de Falhas

O sistema possui um robusto mecanismo de tratamento de falhas que identifica situações comuns que requerem intervenção manual:

1. **Revisão Pendente**

   - Detecta quando existe uma revisão em andamento
   - Fornece instruções detalhadas para cancelamento da revisão
   - Orienta sobre o tempo de espera necessário

2. **Bloqueios Temporários**
   - Identifica situações de bloqueio na Chrome Web Store
   - Apresenta passos para resolução
   - Fornece links para documentação relevante

### Modo Verbose

Para debugging e acompanhamento detalhado, o deploy pode ser executado em modo verbose:

```bash
deploy --verbose
```

Este modo apresenta informações detalhadas sobre:

- Estado das variáveis de ambiente
- Conteúdo relevante do manifest.json
- Resultados detalhados de cada operação
- Logs de erro em caso de falha

### Tempo de Execução

O processo inclui intervalos estratégicos entre as operações para garantir a correta sincronização com a API da Chrome Web Store. O tempo total de execução pode variar dependendo de:

- Tamanho do arquivo da extensão
- Estado atual da extensão na store
- Necessidade de geração de novo token
- Latência da API da Chrome Web Store

## Nota Importante sobre o Processo de Revisão de Extensões

Quando uma extensão está em processo de revisão pela equipe da Chrome Web Store, novas versões não podem ser enviadas programaticamente até que a revisão atual seja concluída ou cancelada. Isso requer intervenção manual do desenvolvedor para cancelar a revisão em andamento antes de submeter uma nova versão.

## Integração com CI/CD do GitLab

Esta ferramenta foi projetada especificamente para ser utilizada em pipelines de CI/CD do GitLab para a tarefa de deploy. Para uma integração adequada, é necessário configurar as variáveis de ambiente tanto no arquivo `.env` local (para desenvolvimento) quanto nas variáveis de CI/CD do projeto GitLab (para produção).

### Configuração das Variáveis de CI/CD

No seu projeto GitLab, configure as seguintes variáveis em Settings > CI/CD > Variables:

```env
GOOGLE_CLOUD_API_CLIENT_ID
GOOGLE_CLOUD_API_CLIENT_SECRET
```

Os valores para as variáveis acima são os mesmos esperados estarem salvos nos arquivo `.env` local.

Utilize o utilitário key-getter em uma IDE para ser atualizado automaticamente a variável no projeto GitLab

```env
GOOGLE_CLOUD_API_REFRESH_TOKEN
```

## Utilitário Key-Getter

O utilitário `key-getter` é um componente crucial que gerencia o processo de autenticação OAuth2 com a API do Google Cloud. Ele obtém e gerencia o token de atualização necessário para deploys automatizados.

### Modo de Operação em Produção

Quando executado em modo de produção (sem a flag `--dev`), o key-getter realiza as seguintes operações:

1. Autentica com a API do Google Cloud usando as credenciais fornecidas
2. Obtém um novo token de atualização
3. Acessa a API do GitLab usando o `GIT_LAB_ACCESS_TOKEN`
4. Cria ou atualiza automaticamente as variável de CI/CD `GOOGLE_CLOUD_API_CLIENT_ID`, `GOOGLE_CLOUD_API_CLIENT_SECRET`, `GOOGLE_CLOUD_REFRESH_TOKEN` no projeto GitLab especificado
5. Configura a variável com as proteções adequadas para uso seguro no pipeline

Este processo automatizado garante que o token de atualização esteja sempre disponível e atualizado para uso nos pipelines de CI/CD, sem necessidade de intervenção manual após a configuração inicial.

### Configuração do Ambiente

Crie um arquivo `.env` na raiz do seu projeto com as seguintes variáveis:

```env
# Credenciais da API do Google Cloud
GOOGLE_CLOUD_API_CLIENT_ID=seu_client_id
GOOGLE_CLOUD_API_CLIENT_SECRET=seu_client_secret

# Configuração do GitLab
GIT_LAB_ACCESS_TOKEN=seu_token_gitlab
GIT_LAB_PROJECT_ID=seu_id_do_projeto

# Detalhes da Extensão
EXTENSION_ARTIFACT_ID=id_da_sua_extensao
EXTENSION_PROJECT_FOLDER=caminho_relativo_para_projeto_extensao
```

### Explicação das Variáveis de Ambiente

#### Credenciais da API do Google Cloud

- `GOOGLE_CLOUD_API_CLIENT_ID`: ID do cliente OAuth 2.0 do seu Projeto Google Cloud
- `GOOGLE_CLOUD_API_CLIENT_SECRET`: Chave secreta do cliente OAuth 2.0 do seu Projeto Google Cloud
  - Estas credenciais são obtidas no Console do Google Cloud em APIs & Serviços > Credenciais

#### Configuração do GitLab

- `GIT_LAB_ACCESS_TOKEN`: Token de acesso pessoal para autenticação na API do GitLab
- `GIT_LAB_PROJECT_ID`: O ID numérico do seu projeto no GitLab
  - Estes são usados para armazenar o token de atualização com segurança no seu projeto GitLab

#### Detalhes da Extensão

- `EXTENSION_ARTIFACT_ID`: O ID da sua extensão Chrome na Chrome Web Store
- `EXTENSION_PROJECT_FOLDER`: O caminho relativo para o diretório raiz da sua extensão

### Usando o Key-Getter

O utilitário key-getter pode ser executado em dois modos:

1. Modo de Desenvolvimento:

```bash
key-getter --dev
```

- Salva o token de atualização diretamente no seu arquivo `.env` local
- Útil para testes e desenvolvimento local

2. Modo de Produção:

```bash
key-getter
```

- Salva o token de atualização no seu projeto GitLab
- Recomendado para ambientes de produção e pipelines de CI/CD

> ⚠️ **ATENÇÃO: UTILITÁRIO DE USO AUTÔNOMO**
>
> O utilitário `key-getter` foi projetado especificamente para ser executado de forma **AUTÔNOMA** e **INTERATIVA**.
>
> Isso é necessário porque:
>
> - O processo de autenticação OAuth2 com o Google Cloud **REQUER INTERAÇÃO HUMANA**
> - A obtenção do refresh token **NÃO PODE ser automatizada** devido às políticas de segurança do Google
> - Uma vez obtido, o token é armazenado com segurança e pode ser usado nos processos automatizados
>
> **NÃO TENTE** incluir este utilitário em pipelines automatizados ou scripts não interativos. É esperado que a pipeline CI/CD requisite uma intervenção manual para atualização do refresh token para execução da tarefa de deploy
