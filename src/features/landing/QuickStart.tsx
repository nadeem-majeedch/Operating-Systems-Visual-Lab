import { SectionHeading } from '@/components';
import { getContentStats } from '@/content';
import { ENGINE_CHALLENGES } from '@/engine';
import { ROUTES, hrefFor } from '@/utils';

interface QuickLink {
  readonly glyph: string;
  readonly title: string;
  readonly body: string;
  readonly href: string;
}

/** Fastest ways into the material for a returning learner. */
export function QuickStart() {
  const stats = getContentStats();

  const links: readonly QuickLink[] = [
    {
      glyph: '🧭',
      title: 'Guided learning',
      body: 'Follow a six-stage lesson from first principles to reflection.',
      href: hrefFor(ROUTES.learn),
    },
    {
      glyph: '🗺️',
      title: 'Pick a learning area',
      body: `Browse ${stats.topicCount} areas and ${stats.availableLabCount} runnable labs.`,
      href: hrefFor(ROUTES.topics),
    },
    {
      glyph: '✅',
      title: 'Graded quiz bank',
      body: `${ENGINE_CHALLENGES.length} questions whose answers come from the real engines.`,
      href: hrefFor(ROUTES.quizzes),
    },
    {
      glyph: '🧱',
      title: 'How it is built',
      body: 'Pure engines, no backend, no tracking, works offline.',
      href: hrefFor(ROUTES.about),
    },
  ];

  return (
    <section className="section" aria-labelledby="quick-start-heading">
      <SectionHeading
        id="quick-start-heading"
        eyebrow="Quick start"
        title="Jump straight in"
        description="Already know the theory? Go directly to the experiments, questions or the architecture notes."
      />
      <ul className="quick-grid">
        {links.map((link) => (
          <li key={link.title} className="quick-grid__item">
            <a className="quick-card" href={link.href}>
              <span className="quick-card__glyph" aria-hidden="true">
                {link.glyph}
              </span>
              <h3 className="quick-card__title">{link.title}</h3>
              <p className="quick-card__body">{link.body}</p>
              <span className="quick-card__cta" aria-hidden="true">
                Open →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
