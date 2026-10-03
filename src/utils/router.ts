/**
 * A tiny hash-based router.
 *
 * Hash routing is deliberate: GitHub Pages serves static files only, so deep
 * links such as `/labs/fcfs` would 404 on refresh. Everything after `#` is
 * resolved on the client instead, and the app stays portable to any base path.
 */

export type Route =
  | { readonly name: 'home'; readonly path: '/' }
  | { readonly name: 'topics'; readonly path: '/topics' }
  | { readonly name: 'challenges'; readonly path: '/challenges' }
  | { readonly name: 'quizzes'; readonly path: '/quizzes' }
  | { readonly name: 'learn'; readonly path: '/learn' }
  | { readonly name: 'lesson'; readonly path: string; readonly topicId: string }
  | { readonly name: 'topic'; readonly path: string; readonly topicId: string }
  | { readonly name: 'lab'; readonly path: string; readonly labId: string }
  | { readonly name: 'about'; readonly path: '/about' }
  | { readonly name: 'not-found'; readonly path: string };

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Normalise a raw path (`/labs/fcfs`, `#/labs/fcfs`, `labs/fcfs/`) to segments. */
export function toSegments(path: string): string[] {
  const withoutHash = path.startsWith('#') ? path.slice(1) : path;
  const [pathname = ''] = withoutHash.split('?');
  return pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map(decode);
}

/**
 * Parse the query string of a route hash into plain values.
 *
 * Labs accept deep links such as
 * `#/labs/lab-round-robin?algorithm=round-robin&quantum=2&workload=convoy`,
 * so configuration can be shared without any server-side routing.
 */
export function parseQuery(input: string): Record<string, string> {
  const raw = input.startsWith('#') ? input.slice(1) : input;
  const [, search = ''] = raw.split('?');
  const query: Record<string, string> = {};
  if (search === '') return query;

  for (const pair of search.split('&')) {
    if (pair === '') continue;
    const [key = '', value = ''] = pair.split('=');
    if (key === '') continue;
    query[decode(key)] = decode(value);
  }
  return query;
}

/**
 * Is this hash a router path rather than an in-page anchor?
 *
 * The skip link sets `#main-content`, which must not be mistaken for a route.
 */
export function isRouteHash(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return raw === '' || raw.startsWith('/');
}

/** Resolve any input (full URL hash, `location.hash`, or a path) to a `Route`. */
export function parseRoute(input: string): Route {
  const segments = toSegments(input);

  if (segments.length === 0) {
    return { name: 'home', path: '/' };
  }

  const [head, second] = segments;

  if (head === 'about' && segments.length === 1) {
    return { name: 'about', path: '/about' };
  }

  if (head === 'challenges' && segments.length === 1) {
    return { name: 'challenges', path: '/challenges' };
  }

  if (head === 'quizzes' && segments.length === 1) {
    return { name: 'quizzes', path: '/quizzes' };
  }

  if (head === 'learn') {
    if (segments.length === 1) {
      return { name: 'learn', path: '/learn' };
    }
    if (segments.length === 2 && second) {
      return { name: 'lesson', path: `/learn/${second}`, topicId: second };
    }
  }

  if (head === 'topics') {
    if (segments.length === 1) {
      return { name: 'topics', path: '/topics' };
    }
    if (segments.length === 2 && second) {
      return { name: 'topic', path: `/topics/${second}`, topicId: second };
    }
  }

  if (head === 'labs' && segments.length === 2 && second) {
    return { name: 'lab', path: `/labs/${second}`, labId: second };
  }

  const path = `/${segments.join('/')}`;
  return { name: 'not-found', path };
}

/** Build an `href` usable by an anchor tag. */
export function hrefFor(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `#${normalized === '/' ? '/' : normalized}`;
}

export const ROUTES = {
  home: '/',
  topics: '/topics',
  challenges: '/challenges',
  quizzes: '/quizzes',
  learn: '/learn',
  about: '/about',
  topic: (topicId: string) => `/topics/${topicId}`,
  lab: (labId: string) => `/labs/${labId}`,
  lesson: (topicId: string) => `/learn/${topicId}`,
} as const;

/** Does the current route point at (or below) the given path? */
export function isRouteActive(route: Route, path: string): boolean {
  if (path === '/') return route.name === 'home';
  if (route.path === path) return true;
  return route.path.startsWith(`${path}/`);
}
