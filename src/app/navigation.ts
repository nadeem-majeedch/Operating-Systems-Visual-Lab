import { CHALLENGES, LESSONS, TOPICS } from '@/content';
import { ENGINE_CHALLENGES } from '@/engine';
import { ROUTES } from '@/utils';

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  /** Decorative glyph rendered before the label. */
  readonly glyph?: string;
  /** Small trailing hint, e.g. `"3 labs"`. */
  readonly meta?: string;
  /** One-line description used in tooltips and accessible labels. */
  readonly description?: string;
}

export interface NavSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavItem[];
}

/**
 * The eleven sections of the lab, in reading order:
 * Home, the eight learning areas, Challenges, About.
 */
export const OVERVIEW_SECTION: NavSection = {
  id: 'overview',
  label: 'Overview',
  items: [
    {
      id: 'home',
      label: 'Home',
      path: ROUTES.home,
      glyph: '🏠',
      description: 'What the lab is and how to start',
    },
  ],
};

/** The guided six-stage lessons, one per learning area. */
export const LEARN_SECTION: NavSection = {
  id: 'learn',
  label: 'Learn',
  items: [
    {
      id: 'guided-learning',
      label: 'Guided learning',
      path: ROUTES.learn,
      glyph: '🧭',
      meta: `${LESSONS.length} lessons`,
      description: 'Concept → visualization → experiment → walkthrough → challenge → reflection',
    },
  ],
};

/** The eight learning areas, in teaching order. */
export const TOPIC_SECTION: NavSection = {
  id: 'topics',
  label: 'Learning areas',
  items: TOPICS.map((topic) => ({
    id: topic.id,
    label: topic.title,
    path: ROUTES.topic(topic.id),
    glyph: topic.glyph,
    meta: `${topic.labs.length} lab${topic.labs.length === 1 ? '' : 's'}`,
    description: topic.tagline,
  })),
};

/** Practice and reference material that sits outside the curriculum. */
export const PRACTICE_SECTION: NavSection = {
  id: 'practice',
  label: 'Practice & reference',
  items: [
    {
      id: 'quizzes',
      label: 'Quiz bank',
      path: ROUTES.quizzes,
      glyph: '🧪',
      meta: `${ENGINE_CHALLENGES.length} graded`,
      description: 'Graded questions with instant feedback',
    },
    {
      id: 'challenges',
      label: 'Challenges',
      path: ROUTES.challenges,
      glyph: '🎯',
      meta: `${CHALLENGES.length} tasks`,
      description: 'Problems to solve with the lab',
    },
    {
      id: 'about',
      label: 'About',
      path: ROUTES.about,
      glyph: '🧭',
      description: 'Architecture and how simulations run',
    },
  ],
};

export const NAV_SECTIONS: readonly NavSection[] = [
  OVERVIEW_SECTION,
  LEARN_SECTION,
  TOPIC_SECTION,
  PRACTICE_SECTION,
];

/** Flattened list of every destination, in sidebar order. */
export const ALL_NAV_ITEMS: readonly NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * Compact top navigation.
 *
 * A short, curated set of primary destinations shown in the header on wide
 * screens. The sidebar remains the complete map of the curriculum; this is the
 * fast path for the sections a learner moves between most.
 */
export const TOP_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'topics',
    label: 'Learning areas',
    path: ROUTES.topics,
    glyph: '📚',
    description: 'Browse the eight areas of operating systems',
  },
  {
    id: 'guided-learning',
    label: 'Guided learning',
    path: ROUTES.learn,
    glyph: '🧭',
    description: 'Six-stage lessons for every area',
  },
  {
    id: 'quizzes',
    label: 'Quiz bank',
    path: ROUTES.quizzes,
    glyph: '🧪',
    description: 'Graded questions with instant feedback',
  },
  {
    id: 'challenges',
    label: 'Challenges',
    path: ROUTES.challenges,
    glyph: '🎯',
    description: 'Problems to solve with the lab',
  },
  {
    id: 'about',
    label: 'Architecture',
    path: ROUTES.about,
    glyph: '🧱',
    description: 'How the lab is built',
  },
];

