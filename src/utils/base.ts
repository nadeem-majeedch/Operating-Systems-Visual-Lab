/**
 * Deployment-path helpers.
 *
 * The lab is published from a GitHub Pages project sub-path
 * (`https://nadeem-majeedch.github.io/Operating-Systems-Visual-Lab/`) but can
 * also be served from the root of a domain. Everything here is derived from
 * Vite's `BASE_URL`, so no asset reference hard-codes the repository name.
 */

/**
 * Vite's configured base. `'/Operating-Systems-Visual-Lab/'` for the GitHub
 * Pages deployment (see `vite.config.ts`), and can be `'./'` when served from a
 * domain root.
 */
export const BASE_URL = import.meta.env.BASE_URL;

/** True when assets are referenced relatively rather than from the domain root. */
export function isRelativeBase(base: string = BASE_URL): boolean {
  return base.startsWith('.') || base === '';
}

/**
 * Resolve a public asset path against the configured base.
 *
 * With the GitHub Pages base, `assetUrl('favicon.svg')` →
 * `/Operating-Systems-Visual-Lab/favicon.svg`. A leading slash is stripped so a
 * caller passing `/favicon.svg` cannot bypass the repository prefix and 404
 * under a project sub-path.
 */
export function assetUrl(path: string, base: string = BASE_URL): string {
  const trimmed = path.replace(/^\/+/, '');
  if (trimmed === '') return base;
  return `${base.endsWith('/') ? base : `${base}/`}${trimmed}`;
}

/**
 * Split a location pathname into the deployment prefix and the in-app path.
 *
 * With hash routing the prefix is irrelevant at runtime, but it is needed to
 * recover a deep link when a static host answers an unknown path with
 * `404.html` — see `public/404.html`.
 */
export interface DeepLink {
  /** Everything before the first recognised route segment, including slashes. */
  readonly prefix: string;
  /** The in-app path, e.g. `/labs/lab-fcfs`, or `/` when the link is the root. */
  readonly path: string;
  readonly search: string;
  readonly hash: string;
}

/**
 * Top-level in-app route segments.
 *
 * Kept in sync with `ROUTES` in `./router` and with the plain-JS copy in
 * `public/404.html` (which cannot import this module); `tests/utils/base.test.ts`
 * asserts that all three agree.
 */
export const ROUTE_KEYWORDS = [
  'topics',
  'labs',
  'challenges',
  'quizzes',
  'learn',
  'about',
] as const;

/** True when the first segment names an in-app route rather than a repo path. */
export function isRouteKeyword(segment: string): boolean {
  return (ROUTE_KEYWORDS as readonly string[]).includes(segment);
}

/** Interpret a pathname that may or may not be prefixed by a repository name. */
export function resolveDeepLink(pathname: string, search = '', hash = ''): DeepLink {
  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  const routeIndex = segments.findIndex((segment) => isRouteKeyword(segment));

  if (routeIndex === -1) {
    return { prefix: '', path: '/', search, hash };
  }

  const prefix = routeIndex === 0 ? '' : `/${segments.slice(0, routeIndex).join('/')}/`;
  const path = `/${segments.slice(routeIndex).join('/')}`;
  return { prefix, path, search, hash };
}
