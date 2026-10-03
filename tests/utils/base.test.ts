import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ROUTES,
  ROUTE_KEYWORDS,
  assetUrl,
  isRelativeBase,
  isRouteKeyword,
  resolveDeepLink,
} from '@/utils';

describe('isRelativeBase', () => {
  it('accepts the relative bases Vite can produce', () => {
    expect(isRelativeBase('./')).toBe(true);
    expect(isRelativeBase('')).toBe(true);
  });

  it('rejects absolute bases', () => {
    expect(isRelativeBase('/Operating-Systems-Visual-Lab/')).toBe(false);
    expect(isRelativeBase('/')).toBe(false);
  });
});

describe('assetUrl', () => {
  it('joins a relative base with the asset name', () => {
    expect(assetUrl('favicon.svg', './')).toBe('./favicon.svg');
    expect(assetUrl('icons/logo.svg', './')).toBe('./icons/logo.svg');
  });

  it('normalises a missing trailing slash', () => {
    expect(assetUrl('favicon.svg', './assets')).toBe('./assets/favicon.svg');
  });

  it('strips a leading slash so assets never become root-absolute', () => {
    expect(assetUrl('/favicon.svg', './')).toBe('./favicon.svg');
  });

  it('returns the base itself for an empty path', () => {
    expect(assetUrl('', './')).toBe('./');
  });
});

describe('isRouteKeyword', () => {
  it('recognises in-app route names', () => {
    expect(isRouteKeyword('topics')).toBe(true);
    expect(isRouteKeyword('labs')).toBe(true);
    expect(isRouteKeyword('challenges')).toBe(true);
    expect(isRouteKeyword('about')).toBe(true);
  });

  it('rejects repo names and asset folders', () => {
    expect(isRouteKeyword('Operating-Systems-Visual-Lab')).toBe(false);
    expect(isRouteKeyword('assets')).toBe(false);
  });

  it('covers every top-level route the router can resolve', () => {
    const paths = [
      ROUTES.home,
      ROUTES.topics,
      ROUTES.challenges,
      ROUTES.quizzes,
      ROUTES.learn,
      ROUTES.about,
      ROUTES.topic('cpu-scheduling'),
      ROUTES.lab('lab-fcfs'),
      ROUTES.lesson('cpu-scheduling'),
    ];

    const unrecoverable = paths.filter((path) => {
      const [first] = path.split('/').filter((segment) => segment.length > 0);
      return first !== undefined && !isRouteKeyword(first);
    });

    expect(unrecoverable).toEqual([]);
  });
});

describe('404 recovery stays in sync with the router', () => {
  it('embeds exactly the keyword list the app recognises', () => {
    const html = readFileSync(
      fileURLToPath(new URL('../../public/404.html', import.meta.url)),
      'utf8',
    );
    const match = /var KEYWORDS = \[([^\]]*)\]/.exec(html);
    expect(match).not.toBeNull();
    const keywords = (match?.[1] ?? '')
      .split(',')
      .map((entry) => entry.trim().replace(/^'/, '').replace(/'$/, ''))
      .filter((entry) => entry.length > 0);

    expect([...keywords].sort()).toEqual([...ROUTE_KEYWORDS].sort());
  });
});

describe('resolveDeepLink', () => {
  it('recovers a route from a repository sub-path', () => {
    expect(resolveDeepLink('/Operating-Systems-Visual-Lab/labs/lab-fcfs')).toEqual({
      prefix: '/Operating-Systems-Visual-Lab/',
      path: '/labs/lab-fcfs',
      search: '',
      hash: '',
    });
  });

  it('recovers a route served from the domain root', () => {
    expect(resolveDeepLink('/topics/cpu-scheduling')).toEqual({
      prefix: '',
      path: '/topics/cpu-scheduling',
      search: '',
      hash: '',
    });
  });

  it('preserves the query string and fragment', () => {
    expect(resolveDeepLink('/repo/labs/lab-round-robin', '?quantum=2', '#section')).toEqual({
      prefix: '/repo/',
      path: '/labs/lab-round-robin',
      search: '?quantum=2',
      hash: '#section',
    });
  });

  it('falls back to the root when no route keyword is present', () => {
    expect(resolveDeepLink('/Operating-Systems-Visual-Lab/')).toEqual({
      prefix: '',
      path: '/',
      search: '',
      hash: '',
    });
  });

  it('recovers the guided-learning and quiz deep links', () => {
    expect(resolveDeepLink('/Operating-Systems-Visual-Lab/learn/virtual-memory')).toEqual({
      prefix: '/Operating-Systems-Visual-Lab/',
      path: '/learn/virtual-memory',
      search: '',
      hash: '',
    });
    expect(resolveDeepLink('/Operating-Systems-Visual-Lab/quizzes')).toEqual({
      prefix: '/Operating-Systems-Visual-Lab/',
      path: '/quizzes',
      search: '',
      hash: '',
    });
  });
});
