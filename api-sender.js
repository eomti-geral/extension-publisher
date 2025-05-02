import { config } from 'dotenv';

config();

async function updateOrCreateVariable(token, projectId, value, key) {
  const baseUrl = `https://git.cnj.jus.br/api/v4/projects/${projectId}/variables`;
  
  const body = {
    key,
    value,
    protected: true,
    masked: true
  };

  try {
    // Primeiro tenta atualizar (PUT)
    const putResponse = await fetch(`${baseUrl}/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': token.trim(),
      },
      body: JSON.stringify(body),
    });

    // Se o PUT falhar (404), tenta criar (POST)
    if (putResponse.status === 404) {
      const postResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PRIVATE-TOKEN': token.trim(),
        },
        body: JSON.stringify(body),
      });

      if (!postResponse.ok) {
        const errorBody = await postResponse.text();
        throw new Error(`Erro ${postResponse.status}: ${errorBody}`);
      }

      return `Variável ${key} criada com sucesso!`;
    }

    if (!putResponse.ok) {
      const errorBody = await putResponse.text();
      throw new Error(`Erro ${putResponse.status}: ${errorBody}`);
    }

    return `Variável ${key} atualizada com sucesso!`;
  } catch (error) {
    throw new Error(`Erro ao criar/atualizar variável ${key}: ${error.message}`);
  }
}

export async function sendRefreshToken(token, value, key) {
  const projectId = process.env.GIT_LAB_PROJECT_ID;
  if (!projectId) {
    throw new Error('Variável de ambiente GIT_LAB_PROJECT_ID não definida');
  }

  if (!value) {
    throw new Error(`Valor não fornecido para a variável ${key}`);
  }

  const encodedProjectId = encodeURIComponent(projectId);
  return await updateOrCreateVariable(token, encodedProjectId, value, key);
}
