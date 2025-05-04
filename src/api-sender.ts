import process from 'node:process';

async function updateOrCreateVariable(
  token: string,
  projectId: string,
  value: string,
  key: string,
  options?: { protected?: boolean; masked?: boolean }
): Promise<string> {
  const baseUrl = `https://git.cnj.jus.br/api/v4/projects/${projectId}/variables`;
  const body = {
    key,
    value,
    protected: options?.protected ?? true,
    masked: options?.masked ?? true,
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
        throw new TypeError(`Erro ${postResponse.status}: ${errorBody}`);
      }

      return `Variável ${key} criada com sucesso!`;
    }

    if (!putResponse.ok) {
      const errorBody = await putResponse.text();
      throw new TypeError(`Erro ${putResponse.status}: ${errorBody}`);
    }

    return `Variável ${key} atualizada com sucesso!`;
  } catch (error) {
    if (error instanceof Error) {
      throw new TypeError(
        `Erro ao criar/atualizar variável ${key}: ${error.message}`
      );
    }
    throw error;
  }
}

export async function sendRefreshToken(
  token: string,
  value: string,
  key: string,
  options?: { protected?: boolean; masked?: boolean }
): Promise<string> {
  const projectId = process.env.GIT_LAB_PROJECT_ID;

  if (!projectId) {
    throw new TypeError('Variável de ambiente GIT_LAB_PROJECT_ID não definida');
  }

  if (!value) {
    throw new TypeError(`Valor não fornecido para a variável ${key}`);
  }

  const encodedProjectId = encodeURIComponent(projectId);
  return updateOrCreateVariable(token, encodedProjectId, value, key, options);
}
