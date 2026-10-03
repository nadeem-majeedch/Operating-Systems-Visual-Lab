import { ButtonLink, Card, SectionHeading } from '@/components';
import { getContentStats } from '@/content';
import { ENGINE_CHALLENGES } from '@/engine';
import { ROUTES, hrefFor } from '@/utils';

interface ChallengeTrack {
  readonly glyph: string;
  readonly count: number;
  readonly unit: string;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly cta: string;
  readonly variant: 'primary' | 'secondary';
}

/** How learners can test themselves: open challenges and a graded bank. */
export function ChallengeMode() {
  const stats = getContentStats();

  const tracks: readonly ChallengeTrack[] = [
    {
      glyph: '🎯',
      count: stats.challengeCount,
      unit: 'practice challenges',
      title: 'Work through a challenge',
      body: 'State the evidence a correct answer needs, attempt it in the matching lab, then compare against the reference outcome.',
      href: hrefFor(ROUTES.challenges),
      cta: 'Browse challenges',
      variant: 'secondary',
    },
    {
      glyph: '🧮',
      count: ENGINE_CHALLENGES.length,
      unit: 'graded questions',
      title: 'Attempt the quiz bank',
      body: 'Multiple choice, numeric, prediction, sequence and simulation-decision questions. Every expected answer is computed by the same engine the lab uses.',
      href: hrefFor(ROUTES.quizzes),
      cta: 'Open the quiz bank',
      variant: 'primary',
    },
  ];

  return (
    <section className="section" aria-labelledby="challenge-mode-heading">
      <SectionHeading
        id="challenge-mode-heading"
        eyebrow="Challenge mode"
        title="Prove you can apply it"
        description="Active recall beats rereading. Every question is marked against an engine-computed answer, never a hidden key."
      />
      <div className="challenge-grid">
        {tracks.map((track) => (
          <Card key={track.title} className="challenge-mode-card" accent="var(--accent)">
            <span className="challenge-mode-card__glyph" aria-hidden="true">
              {track.glyph}
            </span>
            <p className="challenge-mode-card__count">
              <strong>{track.count}</strong> {track.unit}
            </p>
            <h3 className="challenge-mode-card__title">{track.title}</h3>
            <p className="challenge-mode-card__body">{track.body}</p>
            <div className="challenge-mode-card__actions">
              <ButtonLink variant={track.variant} href={track.href}>
                {track.cta}
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
