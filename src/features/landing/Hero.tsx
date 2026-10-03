import { Badge, ButtonLink, Stat } from '@/components';
import { getContentStats } from '@/content';
import { ROUTES, formatDuration, hrefFor } from '@/utils';

/**
 * A decorative CPU-scheduling strip drawn entirely with CSS. It stands in for a
 * screenshot without shipping an image, so the home page stays a few kilobytes.
 */
const HERO_BARS: readonly { readonly grow: number; readonly color: string; readonly label: string }[] = [
  { grow: 3, color: '#6366f1', label: 'P1' },
  { grow: 2, color: '#22d3ee', label: 'P2' },
  { grow: 4, color: '#34d399', label: 'P3' },
  { grow: 2, color: '#f59e0b', label: 'P1' },
  { grow: 3, color: '#fb7185', label: 'P4' },
  { grow: 2, color: '#a78bfa', label: 'P2' },
];

/** Above-the-fold introduction: name, promise, and the primary call to action. */
export function Hero() {
  const stats = getContentStats();
  const entryLab = 'lab-fcfs';

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__body">
        <Badge tone="accent">Learn by manipulating, not by memorising</Badge>

        <h1 className="hero__title" id="hero-title">
          Operating Systems Visual Lab
        </h1>

        <p className="hero__subtitle">
          Explore operating system concepts through interactive simulations, visual experiments, and
          guided challenges.
        </p>

        <div className="hero__actions">
          <ButtonLink variant="primary" size="lg" href={hrefFor(ROUTES.topics)}>
            Start Learning
          </ButtonLink>
          <ButtonLink variant="ghost" size="lg" href={hrefFor(ROUTES.lab(entryLab))}>
            Try a live simulator
          </ButtonLink>
        </div>

        <div className="hero__stats">
          <Stat label="Learning areas" value={stats.topicCount} hint="curriculum modules" />
          <Stat
            label="Interactive labs"
            value={stats.labCount}
            hint={`${stats.availableLabCount} built, rest planned`}
          />
          <Stat label="Algorithms" value={stats.algorithmCount} hint="mapped to simulators" />
          <Stat
            label="Guided time"
            value={formatDuration(stats.totalMinutes * 60)}
            hint="of structured practice"
          />
        </div>
      </div>

      <div className="hero__visual" aria-hidden="true">
        <div className="hero__visual-head">
          <span className="hero__visual-dot" />
          <span className="hero__visual-caption">CPU timeline</span>
        </div>
        <div className="hero__gantt">
          {HERO_BARS.map((bar, index) => (
            <span
              key={`${bar.label}-${index}`}
              className="hero__gantt-bar"
              style={{ flexGrow: bar.grow, backgroundColor: bar.color }}
            >
              {bar.label}
            </span>
          ))}
        </div>
        <div className="hero__visual-legend">
          <span>Arrival</span>
          <span>Burst</span>
          <span>Preemption</span>
        </div>
      </div>
    </section>
  );
}
