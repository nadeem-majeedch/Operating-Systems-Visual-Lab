import { ButtonLink, SectionHeading } from '@/components';
import { listImplementedAlgorithmIds } from '@/engine';
import { ROUTES, hrefFor } from '@/utils';

interface Principle {
  readonly glyph: string;
  readonly title: string;
  readonly body: string;
}

const PRINCIPLES: readonly Principle[] = [
  {
    glyph: '🎞️',
    title: 'Step-by-step, never a black box',
    body: 'Each simulator emits a recorded sequence of steps. Scrub backwards, read why each decision was made, and replay the run at any speed.',
  },
  {
    glyph: '🧩',
    title: 'Engines separated from pixels',
    body: 'Simulation engines are pure TypeScript with no React imports, so they are unit-tested directly and can be reused by any visualisation.',
  },
  {
    glyph: '🎯',
    title: 'Measurable outcomes',
    body: 'Turnaround, waiting time, page faults, head movement, fragmentation: every lab reports the numbers the theory predicts.',
  },
  {
    glyph: '📴',
    title: 'Offline and private',
    body: 'A static bundle with no backend, no authentication and no external API calls. Once the page loads, it works with the network switched off.',
  },
];

/** What the lab is, how it is built, and where to read more. */
export function AboutLab() {
  const implemented = listImplementedAlgorithmIds().length;

  return (
    <section className="section" aria-labelledby="about-lab-heading">
      <SectionHeading
        id="about-lab-heading"
        eyebrow="The lab"
        title="About the Lab"
        description="A deliberate architecture keeps simulations testable and lessons editable: content, algorithms and presentation are independent."
      />
      <ul className="feature-grid">
        {PRINCIPLES.map((principle) => (
          <li className="feature-grid__item" key={principle.title}>
            <span className="feature-grid__glyph" aria-hidden="true">
              {principle.glyph}
            </span>
            <h3 className="feature-grid__title">{principle.title}</h3>
            <p className="feature-grid__body">{principle.body}</p>
          </li>
        ))}
      </ul>
      <div className="about-lab__foot">
        <p className="feature-grid__footnote">
          {implemented} reference engine{implemented === 1 ? '' : 's'} shipped today; the remaining
          labs are scaffolded with objectives and worked examples while their simulators are built.
        </p>
        <ButtonLink variant="ghost" href={hrefFor(ROUTES.about)}>
          Read the architecture
        </ButtonLink>
      </div>
    </section>
  );
}
