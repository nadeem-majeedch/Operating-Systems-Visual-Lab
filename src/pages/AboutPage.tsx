import { Badge, Breadcrumb, Card, SectionHeading } from '@/components';
import { getContentStats } from '@/content';
import { useDocumentTitle } from '@/hooks';
import { ROUTES } from '@/utils';

interface Layer {
  readonly path: string;
  readonly title: string;
  readonly body: string;
}

const LAYERS: readonly Layer[] = [
  {
    path: 'src/engine',
    title: 'Simulation engines',
    body: 'Pure TypeScript, no React. Each engine validates its input and returns an ordered list of explainable steps. Deterministic and directly unit-testable.',
  },
  {
    path: 'src/types',
    title: 'Domain model',
    body: 'The shared vocabulary: Lab, Topic, Algorithm, SimulationState, SimulationStep and EducationalExample. Every other layer speaks these types.',
  },
  {
    path: 'src/content',
    title: 'Educational content',
    body: 'Curriculum data only — topics, labs, algorithms, worked examples and practice challenges. Editing a lesson never requires touching a component.',
  },
  {
    path: 'src/features',
    title: 'Feature visualisations',
    body: 'One folder per domain (scheduling, paging, disk ...). Each feature renders the current step’s snapshot as SVG, canvas or a table.',
  },
  {
    path: 'src/components',
    title: 'Presentation primitives',
    body: 'Buttons, cards, badges, callouts: small, accessible building blocks shared by every feature and page.',
  },
  {
    path: 'src/app',
    title: 'Application shell',
    body: 'Layout, theming, hash routing and navigation. The only layer that knows the app exists as a whole.',
  },
];

const PRINCIPLES: readonly string[] = [
  'Client-only: no backend, no authentication, no database, no external API calls.',
  'Offline-first: a static bundle that keeps working with the network disabled.',
  'Hash routing, so every deep link survives a refresh on GitHub Pages.',
  'Accessible by default: real landmarks, visible focus, keyboard-operable controls, reduced-motion support.',
  'Testable core: engines, utilities and content integrity are covered by unit tests.',
];

/** Explains how the lab is built and how to run it. */
export function AboutPage() {
  useDocumentTitle('Architecture');
  const stats = getContentStats();

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Home', path: ROUTES.home }, { label: 'Architecture' }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Under the hood</p>
        <h1 className="page-header__title">Architecture</h1>
        <p className="page-header__lead">
          The lab separates what is simulated from how it is drawn and what is taught. That keeps
          algorithms verifiable, lessons editable and visualisations swappable.
        </p>
        <div className="page-header__badges">
          <Badge tone="accent">TypeScript</Badge>
          <Badge tone="neutral">React</Badge>
          <Badge tone="neutral">Vite</Badge>
          <Badge tone="neutral">Zero runtime dependencies beyond React</Badge>
        </div>
      </header>

      <SectionHeading
        title="Layers"
        id="layers-heading"
        eyebrow="Structure"
        description="Dependencies point in one direction: features depend on engines, effects, content and primitives — never the other way round."
      />
      <ul className="layer-grid">
        {LAYERS.map((layer) => (
          <li className="layer-grid__item" key={layer.path}>
            <Card className="layer-card">
              <code className="layer-card__path">{layer.path}</code>
              <h3 className="layer-card__title">{layer.title}</h3>
              <p className="layer-card__body">{layer.body}</p>
            </Card>
          </li>
        ))}
      </ul>

      <SectionHeading
        title="How a simulation runs"
        id="pipeline-heading"
        eyebrow="Pattern"
        description="Every simulator follows the same pipeline, which is why the FCFS lab generalises to the other seven areas."
      />
      <ol className="pipeline">
        <li>
          <strong>Input</strong> — the learner edits a workload (processes, reference strings, blocks).
        </li>
        <li>
          <strong>Validate</strong> — the engine rejects malformed input and reports the exact field.
        </li>
        <li>
          <strong>Simulate</strong> — a pure function returns typed steps plus metrics. No timers, no
          randomness, no side effects.
        </li>
        <li>
          <strong>Play</strong> — <code>useSimulation</code> moves through the step list and owns
          timing only.
        </li>
        <li>
          <strong>Render</strong> — the feature draws the current snapshot as a Gantt chart, table or
          diagram.
        </li>
        <li>
          <strong>Explain</strong> — each step carries the sentence that says why it happened.
        </li>
      </ol>

      <SectionHeading title="Principles" id="principles-heading" eyebrow="Constraints" />
      <ul className="check-list">
        {PRINCIPLES.map((principle) => (
          <li key={principle}>{principle}</li>
        ))}
      </ul>

      <SectionHeading title="Local development" id="commands-heading" eyebrow="Tooling" />
      <Card className="code-card">
        <pre>
          <code>{`npm install        # install dependencies
npm run dev        # start the dev server
npm run typecheck  # strict TypeScript, no emit
npm run lint       # ESLint (flat config)
npm run test       # Vitest unit tests
npm run build      # typecheck + production bundle in dist/`}</code>
        </pre>
      </Card>

      <p className="page-note">
        Currently shipping {stats.algorithmCount} algorithm definitions across {stats.topicCount}{' '}
        learning areas, {stats.labCount} labs ({stats.availableLabCount} interactive) and{' '}
        {stats.challengeCount} practice challenges.
      </p>
    </div>
  );
}
