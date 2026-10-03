# Contributing

This guide is for anyone changing the lab: adding a simulator, extending a lesson, writing a challenge
bank, or fixing a bug. Read [architecture.md](architecture.md) first if you have not — it explains the
layers that the conventions below assume.

---

## Setting up locally

**Requirements:** Node 20.19 or newer (`package.json` declares `engines.node`) and npm.

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173/Operating-Systems-Visual-Lab/
```

The app is a static single-page application with hash routing, so there is no backend to start and no
environment variables to set.

### Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server with hot reload |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over the whole repo |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Typecheck, then a production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run check` | **typecheck → lint → test → build.** Run this before you finish. |

---

## House rules

These are the conventions the codebase already follows; following them keeps it coherent.

1. **The dependency direction is one-way.** `features → engine / content / components`. Engines and
   content import `types` only. Nothing imports *upwards*.
2. **Engines are pure and React-free.** No timers, no randomness, no I/O, no `useState`. Same input,
   same steps. If your engine needs to be decided by a clock, it belongs in the playback hook instead.
3. **Every step explains itself.** A `SimulationStep` without an explanation is a step a student cannot
   learn from.
4. **Content is data, not code.** Cross-reference by id (`algorithmIds`, `topicId`, `labId`). Never reach
   into a visualisation from content.
5. **Nothing is hand-typed that an engine can compute.** This applies most sharply to challenge answers.
6. **No new dependencies without a reason.** The runtime dependency list is deliberately just React and
   React DOM. Check whether the platform already provides what you need.
7. **Match the existing style.** Prettier-ish formatting is manual, but the shape is consistent: 2-space
   indent, single quotes, semicolons, trailing commas, `readonly` on content/interface fields, explicit
   return types on exported functions.

### TypeScript

`strict`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax` are all on. Two consequences you will
meet often:

- Indexing an array yields `T | undefined`. Handle it — do not reach for a non-null assertion unless the
  invariant is genuinely local and obvious.
- Type-only imports must be marked: `import type { Lab } from '@/types'` or
  `import { thing, type Other } from '...'`.

### Lint

One rule catches people out: `react-refresh/only-export-components` requires that a file exporting a
React component exports **only** components. If you need to export a helper or a constant from a
component file, move it to its own module. This is why the codebase has small files like
`buttonStyles.ts` and `speedOptions.ts` next to their components.

### CSS

Style layers are imported in a fixed order in `src/styles/index.css`:

```
tokens → base → layout → components → lab → process → synchronization → deadlock
       → memory → paging → replacement → disk → fs → features → challenges → quiz → learning
```

Put a new area's rules in its own file and add it to that list — never into `components.css`.
Use tokens (`var(--space-4)`, `var(--text-sm)`, `var(--border)`) rather than literal values, so both
themes keep working. Check any new colour in **light and dark**.

---

## Recipes

### Adding an algorithm reference

1. Append an `Algorithm` object to `src/content/algorithms.ts`: `id`, `name`, `topicId`, `summary`,
   `description`, `difficulty`, `status`, `parameters`, `properties`, `tags`.
2. Set `status: 'planned'` if there is no simulator yet — the UI is honest about it and the curriculum
   stays browsable.
3. If the algorithm has knobs, describe them in `parameters` (`kind: 'number' | 'boolean' | 'select'`)
   with bounds and a default. The parameter panel renders them for you.
4. Add teaching `pseudocode` if you have it. Omit it rather than inventing a listing.
5. Run `npm run test` — `tests/content/content.test.ts` asserts content integrity and will catch a
   dangling reference.

### Adding a simulation engine

Follow `src/engine/scheduling/fcfs.ts` as the reference.

1. Create the engine in the area folder (`src/engine/<area>/`), implementing
   `SimulationEngine<TInput, TData>`.
2. Shape the run: `validate()` reports issues as `{ path, message }`; `run()` returns
   `{ algorithmId, labId, input, steps, state, summary }`.
3. Register a **descriptor** in `src/engine/registry.ts` (`implemented: true`). The registry stores
   descriptors, not run functions — do not change that; it is what avoids circular imports.
4. Export the engine and its ids from the area's `index.ts`, then from `src/engine/index.ts`.
5. Write tests: determinism (same input twice), the algorithm's documented behaviour, edge cases
   (empty input, single item, ties), validation failures, and the metrics in `summary`.

### Adding a lab or a data-entry view

1. Add the `Lab` to `src/content/labs.ts`. Keep the invariants the tests check: **at least three
   objectives** and **at least one `algorithmId`**.
2. Build the workstation under `src/features/<area>/`.
3. Register it in the `SIMULATORS` map in `src/pages/LabPage.tsx` (lab id → component). A lab with no
   entry renders `PlannedLab`, which is the correct fallback, not a bug.
4. Compose it inside `LabShell`, and use the shared components (`ConceptBlock`, `MetricsPanel`,
   `Timeline`, `EventLog`, `ExplanationPanel`, `SimulationControls`). Do not hand-roll controls — a
   learner should not have to relearn them.
5. Add styles to the area's stylesheet.

### Adding a challenge bank

1. Create a builder in `src/engine/challenge/builders/` that returns `readonly Challenge[]`.
2. **Compute every expected answer by running the engine.** Never type a number that a simulator could
   produce. Use the builders' shared helpers.
3. Register the bank in `CHALLENGE_BANKS` (`id`, `topic`, `title`, `labId`) and add the builder to
   `buildAll()` in `bank.ts`.
4. `tests/engine/challenge.test.ts` will check the catalogue: unique ids, valid per-kind fields, a
   resolvable `relatedLab`, and that every answer is resolvable. Make it pass, do not weaken it.

### Adding a guided lesson or a stage

1. Add or edit the `GuidedLesson` in `src/content/lessons.ts`. Every lesson has the same six stages in
   the same order: `concept → visualization → experiment → walkthrough → challenge → reflection`.
2. Stages are a discriminated union on `kind`. If you add a new kind, extend `LessonStage`, the stage
   order array, and the lesson view — the compiler will list every place you must handle.
3. Reference real labs and real challenge banks by id; `tests/content/lessons.test.ts` checks that they
   resolve to the right area.
4. Keep numbers exact. If a walkthrough quotes a result, reproduce it in the lab first. (A past version
   of this content quoted two averages and a service order that did not match the engines; the docs and
   the lesson now use the engine's values.)

---

## Tests

`npm run test` runs **635 tests across 36 files**. Tests live in `tests/` and are organised by layer:

| Folder | What it covers |
|--------|----------------|
| `tests/engine/*` | One file per engine: schedules, metrics, edge cases, validation, determinism |
| `tests/features/*Drafts.test.ts` | The draft ↔ engine-input adapters that back each lab's editors |
| `tests/content/*` | Content integrity and guided-lesson structure |
| `tests/utils/*` | Formatting, arrays, routing, theme resolution, learning helpers |
| `tests/types/model.test.ts` | Domain-model contracts |

What to test, in order of value:

1. **Determinism** — run the same input twice and deep-equal the steps.
2. **Documented behaviour** — the specific schedule, order or victim the algorithm promises.
3. **Edge cases** — empty input, one element, ties, boundary values, zero-size requests.
4. **Validation** — that bad input is rejected with the right `path`.
5. **Derived answers** — anything the challenge builders read.

Engines are pure, so their tests need no DOM and no mocks. Keep it that way.

---

## Documentation conventions

- Every doc starts with a one-line purpose and lists prerequisites.
- Quote numbers only if you reproduced them from the app. If you cannot, describe the shape of the
  result instead of inventing a figure.
- Prefer a table for comparisons and a numbered list for procedures.
- Link between docs rather than repeating the same explanation twice.

The document set lives in `docs/` and is indexed from `README.md`. If you add a doc, add it to that
index.

---

## Accessibility requirements

New UI must not regress these, all of which currently hold:

- Semantic landmarks, one `h1` per page, and a working skip link.
- Keyboard reachability and operation for every control; no click-only handlers on non-interactive
  elements.
- A visible focus state (inherit the global `:focus-visible` ring; do not remove it).
- An accessible name for every control; decorative glyphs hidden with `aria-hidden`.
- A text equivalent for anything a chart conveys: a table, a metrics panel, an event log or a caption.
- Correct behaviour under `prefers-reduced-motion` and `prefers-contrast: more`.
- Sufficient contrast in **both** themes.

---

## Deployment (brief)

`.github/workflows/deploy.yml` runs on pushes to `main` and on manual dispatch. It installs with
`npm ci`, runs typecheck → lint → tests, builds with Vite, and publishes `dist/` to GitHub Pages. Enable
**Settings → Pages → Source: GitHub Actions** once in the repository.

Three details make GitHub Pages work under the repository path, and you should not break them:

- `vite.config.ts` sets `base: '/Operating-Systems-Visual-Lab/'`, so every emitted asset URL is
  prefixed with the project path.
- Routing is hash-based, so no server-side rewrite is needed for deep links and a refresh always
  re-requests the same document from the Pages root.
- `public/.nojekyll` stops Jekyll from touching the bundle, and `public/404.html` recovers non-hash
  deep links such as `/Operating-Systems-Visual-Lab/labs/lab-fcfs`.

Use the helpers in `src/utils/base.ts` / `src/utils/router.ts` (`assetUrl`, `hrefFor`) rather than
building URLs by hand.

---

## Before you finish

```
npm run check
```

That is typecheck, lint, tests and a production build — the same sequence the deployment workflow runs.
Then check your own change in the browser at **desktop, tablet and phone widths**, in **both themes**,
and with the **keyboard only**. Confirm there is no horizontal overflow and that the console is clean.

---

## License

The project is released under the **MIT License** (declared in `package.json`). Contributions are
accepted under the same terms.
