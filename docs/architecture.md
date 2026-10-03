# Architecture

How the Operating Systems Visual Lab is put together, and why. This document is for anyone reading the
source, extending the lab, or teaching from it and wanting to know what is real underneath.

The shape in one sentence: **content, algorithms and presentation are three independent layers, and the
simulation engines in the middle are pure functions with no UI in them.**

---

## Directory layout

```
src/
  app/        application shell — layout, theming, hash routing, error boundary
  components/ presentation primitives — buttons, cards, badges, tables, callouts
  content/    educational content — topics, labs, algorithms, examples, lessons, challenges
  engine/     simulation engines — pure TypeScript, zero React imports
  features/   feature visualisations — one folder per domain area
  hooks/      reusable React hooks — theme, routing, playback, storage, progress
  pages/      route-level screens
  styles/     design tokens and layered CSS
  types/      the shared domain model
tests/        unit tests for engines, utilities, content and models
public/       static files copied as-is (favicon, 404 page, .nojekyll)
```

### The dependency rule

```
features → engine / content / components
pages    → features / content / components
engine   → types only
content  → types only
```

- **Engines never import React.** That is what makes them unit-testable without a DOM.
- **Components never import content.** A button does not know what CPU scheduling is.
- **Content never imports a visualisation.** A lab describes itself in data; the UI decides how to
  draw it.

The rule is enforced socially (review) and practically (types): content stores ids and plain data, so
there is nothing for it to call.

---

## The domain model (`src/types`)

| Type | What it is |
|------|------------|
| `Topic` | One of the eight learning areas: title, tagline, difficulty, objectives, prerequisites and its labs |
| `Lab` | One interactive activity: summary, objectives, difficulty, status, estimated time, algorithm ids, examples |
| `Algorithm` | Reference metadata for an algorithm: name, summary, properties, tunable parameters, teaching pseudocode |
| `EducationalExample` | A worked example with a ready-to-load `input` and an expected outcome |
| `SimulationStep<TData>` | One recorded moment: label, description, explanation, clock, highlights, the snapshot to draw, and optional metrics |
| `SimulationState<TData>` | The playback state: status, speed, current step index, the step list, parameters, error |
| `GuidedLesson` / `LessonStage` | The six-stage lesson and its discriminated stage union |
| `Challenge` (content) | An open practice task: prompt, scenario, requirements, hints, expected outcome |
| `Challenge` (engine) | A graded question: kind, expected answer, explanation, related lab |
| `ValidationResult` | `{ valid: true }` or `{ valid: false, issues: [{ path, message }] }` |

`SimulationStep` is the keystone: it is *both* what the UI draws and what the text says about it. A step
cannot be rendered without its explanation, which is why every lab can say *why* something happened at
every point in the run.

---

## The simulation engine contract

```ts
interface SimulationEngine<TInput, TData> {
  readonly id: Id;
  readonly algorithmId: Id;
  readonly labId: Id;
  readonly name: string;
  readonly description: string;
  validate(input: TInput): ValidationResult;
  run(input: TInput, config?: SimulationConfig): SimulationRun<TData>;
}

interface SimulationRun<TData> {
  readonly algorithmId: Id;
  readonly labId: Id;
  readonly input: Record<string, number | string | boolean>;
  readonly steps: readonly SimulationStep<TData>[];
  readonly state: SimulationState<TData>;
  readonly summary: Readonly<Record<string, number>>;
}
```

Engine properties that the rest of the app depends on:

- **Pure.** Same input, same steps, every time. No timers, no randomness, no I/O.
- **Validating.** `validate()` rejects malformed input and reports the exact field path, so the UI can
  point at the offending control instead of failing later.
- **Explaining.** Every step carries a sentence that says why it happened.
- **Summarising.** `summary` holds the run's numbers, which is what the tests assert against and what
  the challenge builders read to derive expected answers.

Because engines are pure and untyped-when-it-comes-to-React, they are tested directly, with no DOM and
no mocking. That is where most of the test suite's value sits.

### The registry

`src/engine/registry.ts` holds **descriptors**, not run functions:

```ts
interface EngineDescriptor {
  readonly engineId, algorithmId, labId;
  readonly name, description: string;
  readonly implemented: boolean;   // false until the engine can produce steps
}
```

Storing descriptors rather than implementations keeps discovery type-safe with no `any` and no circular
imports: the UI can show "available / planned" badges without importing every engine, while the feature
that actually renders a lab imports the one engine it needs.

---

## The simulation pipeline

```
1. Input      the learner edits a workload (processes, references, blocks, requests)
2. Validate   the engine rejects malformed input and names the exact field
3. Simulate   a pure function returns typed steps plus a numeric summary
4. Play       useSimulation moves through the step list and owns timing only
5. Render     the feature draws the current snapshot (SVG chart, table, diagram)
6. Explain    every step ships the sentence that says why it happened
```

Steps 1–3 are engine work; 4 is the only stateful, time-dependent part; 5–6 are presentation. Playback
speed changes *how fast* you watch the run and never what the run is.

`useSimulation` owns: the current step index, play/pause, speed, step forward/backward, reset, and
cleanup of any interval. Every lab's controls (`SimulationControls`, `SpeedControl`, `Timeline`) are
thin wrappers over it, which is why all nineteen labs behave identically.

---

## Content and the challenge engine

### Content

`src/content/` holds `topics`, `labs`, `algorithms`, `examples`, `lessons`, `challenges`, plus
`index.ts` with lookups (`getTopic`, `getLab`, `getAlgorithms`, `getLesson`, ...) and aggregates
(`getContentStats`, `searchContent`).

Everything cross-references by **id**, never by object identity, so content is data rather than code.
A test suite (`tests/content/`) asserts that ids are unique, that every cross-reference resolves, and
that every available lab example carries an input — so a typo in a lab's `algorithmIds` fails the build.

### The challenge engine

`src/engine/challenge/` turns the simulators into a graded quiz bank:

```
types.ts     ChallengeKind, ChallengeAnswer (discriminated), Challenge, ChallengeBankInfo
builders/    one file per area; each question's expected answer is computed by running the engine
bank.ts      CHALLENGE_BANKS (20) + CHALLENGES (110), ordered by bank, with filters and bank counts
grade.ts     pure grader for the five answer kinds
session.ts   per-session scoring and progress
validate.ts  structural validation of the whole catalogue
```

The five kinds are `multiple-choice`, `numerical`, `prediction`, `sequence` and `decision`, and each maps
to exactly one answer shape:

| Kind | Answer | Comparison |
|------|--------|------------|
| `multiple-choice` | `{ kind: 'choice', optionId }` | Exact option id |
| `numerical` | `{ kind: 'number', value, tolerance }` | Within tolerance |
| `prediction` | `{ kind: 'choice', optionId }` | Exact option id |
| `sequence` | `{ kind: 'sequence', order }` | Exact order |
| `decision` | `{ kind: 'decision', optionId }` | Exact option id |

Because the answers come from the same engines the labs use, a quiz question can never disagree with a
simulation. Validation also asserts that every question's referenced lab resolves, which is how the
"reproduce it in the lab" links stay honest.

### Guided learning

`GuidedLesson` is one object per area with a fixed six-stage shape, and `LessonStage` is a discriminated
union (`concept | visualization | experiment | walkthrough | challenge | reflection`). Each variant
carries its own content — the experiment carries `setup` and `observations`, the challenge stage carries
`bankIds` — so the lesson view is a single map over stages with no per-topic branching.

Progress is pure data: `src/utils/learning.ts` holds the functions (percentages, next incomplete stage,
immutable stage toggles) and `src/hooks/useLearningProgress.ts` persists them. The functions are tested
directly as pure utilities.

---

## Routing

`src/utils/router.ts` is a small hash router, and hash routing is a deliberate choice rather than a
limitation:

- A static host like GitHub Pages cannot rewrite unknown paths to `index.html`, so `/labs/lab-fcfs`
  would 404 on refresh. Everything after `#` is resolved on the client instead.
- Deep links therefore survive a refresh anywhere the bundle is served — the deployed GitHub Pages
  base path, a custom domain, or a local preview.
- Labs accept query parameters (for example `#/labs/lab-round-robin?algorithm=round-robin&quantum=2`),
  so a specific configuration can be shared as a link.

`parseRoute` returns a discriminated `Route`; `hrefFor(path)` builds the `#/...` href; `isRouteActive`
decides which navigation item is current. There is no router dependency.

---

## Styling and the design system

Styling is hand-written CSS with custom-property tokens (`src/styles/tokens.css`) — no CSS framework, no
CSS-in-JS. Layers are imported in a deliberate order in `src/styles/index.css`:

```
tokens → base → layout → components → lab → process → synchronization → deadlock
       → memory → paging → replacement → disk → fs → features → challenges → quiz → learning
```

Later files may build on earlier ones but not vice versa. Each lab area owns one stylesheet, so a change
to the disk lab cannot break the paging lab.

What the design system guarantees across every screen:

- One type scale, one spacing ramp, one radius/shadow set, one focus ring, one set of motion easings.
- A fluid type scale and a responsive grid; layouts are desktop-first with tablet and phone breakpoints.
- Light, dark and system themes driven entirely by token overrides on `data-theme`.
- A compact top navigation, a collapsible sidebar (persisted in `localStorage`), and breadcrumbs on every
  deep route.
- One `SimulationControls` cluster shared by all labs, so the controls are learned once.

### Accessibility notes

Implemented: semantic landmarks and a skip link, one `h1` per page, `aria-current` on active navigation,
labelled form controls, keyboard-operable playback including a step scrubber, a visible focus ring
everywhere, `prefers-reduced-motion` support that effectively disables animation and transitions, a
`prefers-contrast: more` mode that strengthens borders and text, and text equivalents for charts via the
metrics panel, event log and captions.

Known limitations, stated honestly:

- SVG charts are described in text and paired with data tables or an event log, but they are not yet a
  fully equivalent screen-reader experience for every visualisation.
- The wait-for graph, memory map and file-system block map rely heavily on position and colour; the
  accompanying panels are the accessible path to the same information, not a true substitute.

---

## State and storage

Nothing is on a server. Persistent state lives in `localStorage`:

| Key | Holds |
|-----|-------|
| `osvl-learning-progress` | Completed guided-lesson stages |
| `osvl-quiz-mastered` | Quiz questions answered correctly |
| `osvl.theme` | Light / dark / system |
| `osvl-sidebar-collapsed` | Sidebar rail state |

All reads are guarded for a non-browser environment, and the theme is applied by an inline script before
first paint so there is no flash of the wrong theme. `useLocalStorage` JSON-serialises values and is safe
when storage is unavailable (private windows, disabled storage).

---

## Build and tooling

| Concern | Choice |
|---------|--------|
| Bundler | Vite, `base: '/Operating-Systems-Visual-Lab/'` matching the GitHub Pages project path |
| Language | TypeScript `strict`, plus `noUncheckedIndexedAccess` and `verbatimModuleSyntax` |
| Lint | ESLint flat config, with `react-hooks` and `react-refresh`; non-component exports live in their own files |
| Tests | Vitest, run in `tests/` against the engines, content and utilities |
| Scripts | `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `check` |

`npm run check` runs typecheck → lint → tests → production build, which is exactly what the deployment
workflow runs. The test suite currently holds **635 tests across 36 files**, all passing.

### Performance notes

The app ships **no image assets**: the home page's CPU timeline, every Gantt chart, memory map, track and
graph is drawn with CSS or SVG at runtime. The only runtime dependencies are React and React DOM.

The production bundle is currently around 900 kB minified (~260 kB gzipped) and trips Rollup's default
chunk-size warning. That is the clearest next optimisation: lazy-loading the nineteen simulator
workstations behind route-level code splitting would shrink the initial bundle substantially, since a
learner opening the home page does not need the file-system simulator yet. It is listed as future work
rather than silently ignored.

---

## Extending the lab

The layering is what makes extension cheap. In rough order of effort:

1. **Add an algorithm reference** — append an `Algorithm` to `src/content/algorithms.ts`. Status
   `planned` is honest and renders without a simulator.
2. **Add a simulator to an existing lab** — implement `SimulationEngine` for the new algorithm, register
   a descriptor, and add the workstation wiring. Existing labs show the pattern.
3. **Add a lab** — add a `Lab` to `src/content/labs.ts` (objectives, difficulty, algorithm ids), then a
   workstation and its `SIMULATORS` entry.
4. **Add a challenge bank** — create a builder under `src/engine/challenge/builders/`, register the bank,
   and derive every expected answer from an engine run.
5. **Add a guided lesson stage** — extend the `LessonStage` union and the lesson view; the stage types are
   discriminated, so the compiler lists what you must handle.

Step-by-step instructions, including the tests each change should come with, are in
[contributing.md](contributing.md).

A worked reference exists for each layer: `src/engine/scheduling/fcfs.ts` is the reference engine, and
`src/features/scheduling/SchedulingWorkstation.tsx` is the reference visualisation. Together they show
the whole pattern — a lab component that contains no algorithm logic at all, only composition.
