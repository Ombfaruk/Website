export class GitHubError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export type GitHubClient = {
  request: (path: string, init?: RequestInit) => Promise<any>;
};

export function createGitHubClient(token: string, fetchImpl: typeof fetch = fetch): GitHubClient {
  return {
    async request(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/vnd.github+json');
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-GitHub-Api-Version', '2022-11-28');
      if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      const response = await fetchImpl(`https://api.github.com${path}`, { ...init, headers });
      const text = await response.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
      if (!response.ok) {
        const message = data?.message || response.statusText || 'GitHub request failed';
        throw new GitHubError(String(message), response.status);
      }
      return data;
    },
  };
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(input: string) {
  const binary = atob(input.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeBase64(text: string) {
  return bytesToBase64(new TextEncoder().encode(text));
}

export function decodeBase64Utf8(input: string) {
  return new TextDecoder().decode(base64ToBytes(input));
}

export function friendlyGitHubError(error: unknown) {
  if (error instanceof GitHubError) {
    if (error.status === 401) return 'GitHub did not accept that token. Create a new one and paste it again.';
    if (error.status === 403) return error.message || 'GitHub blocked this token. Check that Contents is set to Read and write.';
    if (error.status === 404) return 'GitHub could not find that file or the Website repository for this token.';
    if (error.status === 409 || error.status === 422) return 'The site changed while saving. Please try again.';
    return `GitHub error: ${error.message}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}

export async function assertCanPublish(client: GitHubClient, owner: string, repo: string) {
  const user = await client.request('/user');
  const login = String(user?.login ?? '');
  if (login.toLowerCase() !== owner.toLowerCase()) {
    throw new GitHubError(
      `This token belongs to ${login || 'another account'}. Only Omar's GitHub account (${owner}) can publish.`,
      403,
    );
  }
  const repository = await client.request(`/repos/${owner}/${repo}`);
  if (!repository?.permissions?.push) {
    throw new GitHubError('This token cannot edit the Website repository. Set Contents to Read and write.', 403);
  }
  return { login };
}

export async function listDirectory(client: GitHubClient, owner: string, repo: string, path: string, ref: string) {
  const target = path.split('/').map(encodeURIComponent).join('/');
  try {
    const data = await client.request(`/repos/${owner}/${repo}/contents/${target}?ref=${encodeURIComponent(ref)}`);
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({
      name: String(item.name),
      path: String(item.path),
      sha: String(item.sha),
      type: String(item.type),
      size: Number(item.size ?? 0),
    }));
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return [];
    throw error;
  }
}

export async function readRepoFile(client: GitHubClient, owner: string, repo: string, path: string, ref: string) {
  const target = path.split('/').map(encodeURIComponent).join('/');
  const data = await client.request(`/repos/${owner}/${repo}/contents/${target}?ref=${encodeURIComponent(ref)}`);
  if (data?.content) return base64ToBytes(String(data.content));
  if (data?.sha) {
    const blob = await client.request(`/repos/${owner}/${repo}/git/blobs/${data.sha}`);
    if (blob?.content) return base64ToBytes(String(blob.content));
  }
  throw new GitHubError(`Could not read ${path}.`, 422);
}

export type PublishInput = {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  files: { path: string; contentBase64: string }[];
  deletions: string[];
};

async function commitOnce(client: GitHubClient, input: PublishInput) {
  const refData = await client.request(`/repos/${input.owner}/${input.repo}/git/ref/heads/${input.branch}`);
  const parentSha = String(refData.object.sha);
  const parent = await client.request(`/repos/${input.owner}/${input.repo}/git/commits/${parentSha}`);
  const tree: { path: string; mode: string; type: string; sha: string | null }[] = [];
  for (const file of input.files) {
    const blob = await client.request(`/repos/${input.owner}/${input.repo}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: file.contentBase64, encoding: 'base64' }),
    });
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: String(blob.sha) });
  }
  for (const path of input.deletions) {
    tree.push({ path, mode: '100644', type: 'blob', sha: null });
  }
  const nextTree = await client.request(`/repos/${input.owner}/${input.repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
  });
  const commit = await client.request(`/repos/${input.owner}/${input.repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: input.message, tree: nextTree.sha, parents: [parentSha] }),
  });
  await client.request(`/repos/${input.owner}/${input.repo}/git/refs/heads/${input.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });
  return { commitSha: String(commit.sha) };
}

export async function publishFiles(client: GitHubClient, input: PublishInput) {
  if (input.files.length === 0 && input.deletions.length === 0) {
    throw new Error('Nothing to save.');
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await commitOnce(client, input);
    } catch (error) {
      lastError = error;
      const status = error instanceof GitHubError ? error.status : 0;
      if (attempt === 0 && (status === 409 || status === 422)) continue;
      throw error;
    }
  }
  throw lastError;
}
