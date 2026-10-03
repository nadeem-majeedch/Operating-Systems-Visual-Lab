import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string): string =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

describe('GitHub Pages deployment', () => {
  it('builds every asset under the repository base path', () => {
    const config = read('../vite.config.ts');
    expect(config).toMatch(/base:\s*'\/Operating-Systems-Visual-Lab\/'/);
  });

  it('publishes from an artifact-based workflow with the required permissions', () => {
    const workflow = read('../.github/workflows/deploy.yml');
    expect(workflow).toMatch(/branches:\s*\['main'\]/);
    expect(workflow).toMatch(/workflow_dispatch/);
    expect(workflow).toMatch(/contents:\s*read/);
    expect(workflow).toMatch(/pages:\s*write/);
    expect(workflow).toMatch(/id-token:\s*write/);
    expect(workflow).toMatch(/actions\/configure-pages@/);
    expect(workflow).toMatch(/actions\/upload-pages-artifact@/);
    expect(workflow).toMatch(/actions\/deploy-pages@/);
  });

  it('keeps the fallback page in the build output', () => {
    const fallback = read('../public/404.html');
    expect(fallback).toContain('window.location.replace');
  });
});
