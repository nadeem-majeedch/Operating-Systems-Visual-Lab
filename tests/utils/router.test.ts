import { describe, expect, it } from 'vitest';
import { ROUTES, hrefFor, isRouteActive, isRouteHash, parseQuery, parseRoute, toSegments } from '@/utils';

describe('toSegments', () => {
  it('accepts hashes, paths and trailing slashes', () => {
    expect(toSegments('#/labs/lab-fcfs')).toEqual(['labs', 'lab-fcfs']);
    expect(toSegments('/topics/cpu-scheduling/')).toEqual(['topics', 'cpu-scheduling']);
    expect(toSegments('')).toEqual([]);
  });

  it('drops query strings and decodes escapes', () => {
    expect(toSegments('#/topics/cpu%2Dscheduling?tab=labs')).toEqual([
      'topics',
      'cpu-scheduling',
    ]);
  });
});

describe('parseRoute', () => {
  it('resolves the home route', () => {
    expect(parseRoute('#/')).toMatchObject({ name: 'home', path: '/' });
    expect(parseRoute('')).toMatchObject({ name: 'home' });
  });

  it('resolves the topics index', () => {
    expect(parseRoute('#/topics')).toMatchObject({ name: 'topics', path: '/topics' });
  });

  it('resolves a topic detail route', () => {
    expect(parseRoute('#/topics/cpu-scheduling')).toMatchObject({
      name: 'topic',
      topicId: 'cpu-scheduling',
      path: '/topics/cpu-scheduling',
    });
  });

  it('resolves a lab route', () => {
    expect(parseRoute('#/labs/lab-fcfs')).toMatchObject({
      name: 'lab',
      labId: 'lab-fcfs',
      path: '/labs/lab-fcfs',
    });
  });

  it('resolves the about route', () => {
    expect(parseRoute('#/about')).toMatchObject({ name: 'about' });
  });

  it('resolves the challenges route', () => {
    expect(parseRoute('#/challenges')).toMatchObject({
      name: 'challenges',
      path: '/challenges',
    });
  });

  it('resolves the guided-learning index and a lesson', () => {
    expect(parseRoute('#/learn')).toMatchObject({ name: 'learn', path: '/learn' });
    expect(parseRoute('#/learn/cpu-scheduling')).toMatchObject({
      name: 'lesson',
      topicId: 'cpu-scheduling',
      path: '/learn/cpu-scheduling',
    });
  });

  it('reports unknown paths as not-found', () => {
    expect(parseRoute('#/nope/whatever')).toMatchObject({
      name: 'not-found',
      path: '/nope/whatever',
    });
  });
});

describe('isRouteHash', () => {
  it('accepts router paths', () => {
    expect(isRouteHash('#/')).toBe(true);
    expect(isRouteHash('#/labs/lab-fcfs')).toBe(true);
    expect(isRouteHash('')).toBe(true);
  });

  it('rejects in-page anchors such as the skip link target', () => {
    expect(isRouteHash('#main-content')).toBe(false);
  });
});

describe('hrefFor', () => {
  it('builds hash hrefs', () => {
    expect(hrefFor('/topics')).toBe('#/topics');
    expect(hrefFor('/')).toBe('#/');
  });

  it('adds a leading slash when missing', () => {
    expect(hrefFor('about')).toBe('#/about');
  });
});

describe('ROUTES', () => {
  it('builds content paths', () => {
    expect(ROUTES.topic('deadlocks')).toBe('/topics/deadlocks');
    expect(ROUTES.lab('lab-fcfs')).toBe('/labs/lab-fcfs');
    expect(ROUTES.lesson('deadlocks')).toBe('/learn/deadlocks');
  });
});

describe('parseQuery', () => {
  it('reads a lab deep link', () => {
    expect(parseQuery('#/labs/lab-round-robin?algorithm=round-robin&quantum=2&workload=convoy')).toEqual({
      algorithm: 'round-robin',
      quantum: '2',
      workload: 'convoy',
    });
  });

  it('returns an empty object when there is no query string', () => {
    expect(parseQuery('#/labs/lab-fcfs')).toEqual({});
    expect(parseQuery('')).toEqual({});
  });

  it('decodes escaped keys and values', () => {
    expect(parseQuery('#/labs/lab-fcfs?name=first%20come')).toEqual({ name: 'first come' });
  });

  it('keeps a key with no value as an empty string', () => {
    expect(parseQuery('#/x?debug')).toEqual({ debug: '' });
  });
});

describe('isRouteActive', () => {
  it('marks the home route', () => {
    expect(isRouteActive(parseRoute('#/'), '/')).toBe(true);
    expect(isRouteActive(parseRoute('#/topics'), '/')).toBe(false);
  });

  it('keeps parent sections active on child routes', () => {
    const route = parseRoute('#/topics/cpu-scheduling');
    expect(isRouteActive(route, '/topics')).toBe(true);
    expect(isRouteActive(route, '/topics/cpu-scheduling')).toBe(true);
    expect(isRouteActive(route, '/labs')).toBe(false);
  });
});
