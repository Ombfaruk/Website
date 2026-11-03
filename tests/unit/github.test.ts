import { describe, expect, it } from 'vitest';
import {
  assertCanPublish,
  decodeBase64Utf8,
  encodeBase64,
  GitHubError,
  publishFiles,
  type GitHubClient,
} from '../../src/lib/github';

function client(handler: (path: string, init?: RequestInit) => Promise<unknown> | unknown): GitHubClient {
  return { request: (path, init) => Promise.resolve(handler(path, init)) };
}

describe('github client', () => {
  it('round trips unicode text', () => {
    expect(decodeBase64Utf8(encodeBase64("Owner's menu"))).toBe("Owner's menu");
  });

  it('rejects every account except Omar', async () => {
    const github = client((path) => (path === '/user' ? { login: 'octocat' } : { permissions: { push: true } }));
    await expect(assertCanPublish(github, 'Ombfaruk', 'Website')).rejects.toBeInstanceOf(GitHubError);
  });

  it('commits files, deletes removed screens, and retries a rejected update', async () => {
    const calls: string[] = [];
    let updates = 0;
    const github = client((path, init) => {
      calls.push(`${init?.method ?? 'GET'} ${path}`);
      if (path.endsWith('/git/ref/heads/main')) return { object: { sha: 'parent' } };
      if (path.endsWith('/git/refs/heads/main') && init?.method === 'PATCH') {
        updates += 1;
        if (updates === 1) throw new GitHubError('rejected', 422);
        return { ok: true };
      }
      if (path.endsWith('/git/commits/parent')) return { tree: { sha: 'tree' }, sha: 'parent' };
      if (path.endsWith('/git/blobs')) return { sha: `blob-${calls.length}` };
      if (path.endsWith('/git/trees')) {
        const body = JSON.parse(String(init?.body));
        expect(body.tree).toContainEqual({ path: 'src/content/work/jiak.md', mode: '100644', type: 'blob', sha: expect.any(String) });
        expect(body.tree).toContainEqual({ path: 'public/uploads/jiak/old.png', mode: '100644', type: 'blob', sha: null });
        return { sha: 'tree-next' };
      }
      if (path.endsWith('/git/commits')) return { sha: 'commit-next' };
      throw new Error(`Unexpected ${path}`);
    });
    const result = await publishFiles(github, {
      owner: 'Ombfaruk',
      repo: 'Website',
      branch: 'main',
      message: 'Publish case study: Jiak',
      files: [{ path: 'src/content/work/jiak.md', contentBase64: encodeBase64('# Jiak') }],
      deletions: ['public/uploads/jiak/old.png'],
    });
    expect(result.commitSha).toBe('commit-next');
    expect(updates).toBe(2);
  });
});
