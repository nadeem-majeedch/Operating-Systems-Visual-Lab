# Operating Systems Visual Lab

**Explore operating system concepts through interactive simulations, visual experiments, and guided challenges.**

The Operating Systems Visual Lab is a free, browser-based study companion for an introductory
operating systems course. Instead of reading about a scheduler and imagining the Gantt chart, you
build the chart, press play, and read the reason for every decision the scheduler makes. Every
simulation is deterministic and step-by-step: you can pause it, rewind it, and replay it as slowly as
you like.

It runs entirely in your browser. There is no account, no server, and no tracking, and once the page
has loaded it keeps working with the network switched off.

> **Live site:** <https://nadeem-majeedch.github.io/Operating-Systems-Visual-Lab/>
> _(served from GitHub Pages — see [docs/getting-started.md](docs/getting-started.md))_

---

## Why this lab exists

Operating systems are hard for a specific reason: the interesting behaviour is invisible. You cannot
watch a page be evicted, a deadlock close its cycle, or a race condition lose an update. Traditional
diagrams show a *result*; this lab shows the *process*, one recorded step at a time.

The design principle throughout is **learn by manipulating, not by memorising**:

- Every algorithm is a simulation you drive, not a picture you look at.
- Every step carries an explanation of *why* it happened, not just what happened.
- Every metric you compute by hand is then reported by the engine, so you can check your arithmetic
  against a reproducible run.

## Where it fits

The lab is written for **undergraduate computer science and data science students** taking a first
operating systems course, and for anyone revising the same material for interviews. It assumes you
can read a little pseudocode and that you know what a process is. It does **not** assume you have
written a kernel.

It is a supplement, not a replacement for your course: the lab gives you something to *do* with the
theory, and each area links back to the standard textbook treatment.

---

## Learning objectives

By working through the lab you should be able to:

1. **Describe** the five process states and the legal transitions between them, and explain what a
   process control block records.
2. **Compute**, for any arrival table, the Gantt chart and the turnaround, waiting and response time
   of every process under FCFS, SJF, SRTF, Round Robin and priority scheduling.
3. **Explain** why a non-atomic read–modify–write can lose an update, and fix it with a mutex, a
   semaphore, or a correctly ordered pair of `wait()` calls.
4. **Apply** the four Coffman conditions, detect a deadlock with a wait-for graph, and decide whether a
   resource request keeps the system in a safe state using the banker's algorithm.
5. **Contrast** first-fit, best-fit, worst-fit and next-fit placement, and distinguish internal from
   external fragmentation.
6. **Translate** a logical address into a physical one through a page table and TLB, and compare FIFO,
   LRU, OPT and Clock page replacement — including Bélády's anomaly.
7. **Compute** total and average head movement for FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK disk
   scheduling, and explain each policy's fairness property.
8. **Compare** contiguous, linked and indexed file allocation, and trace a path from a directory entry
   through an inode to the data blocks on disk.
9. **Choose** an algorithm for a workload and justify the trade-off in terms of the metrics the engine
   reports.

---

## The eight learning areas

| Area | What you will be able to do | Simulations | Difficulty | Guide |
|------|-----------------------------|-------------|------------|-------|
| **Process Management** | Trace a process through every state and inspect its PCB | 2 (1 live) | Beginner | [docs/process-management.md](docs/process-management.md) |
| **CPU Scheduling** | Build Gantt charts and score policies on turnaround, waiting and response time | 4 | Beginner → Intermediate | [docs/cpu-scheduling.md](docs/cpu-scheduling.md) |
| **Process Synchronization** | Reproduce a race condition, then repair it with locks and semaphores | 4 | Intermediate | [docs/synchronization.md](docs/synchronization.md) |
| **Deadlocks** | Detect a cycle, and decide whether a request keeps the system safe | 2 | Intermediate → Advanced | [docs/deadlocks.md](docs/deadlocks.md) |
| **Memory Management** | Place processes into memory and measure the fragmentation you cause | 3 (2 live) | Intermediate | [docs/memory-management.md](docs/memory-management.md) |
| **Virtual Memory** | Translate addresses and choose a page to evict | 2 | Intermediate → Advanced | [docs/virtual-memory.md](docs/virtual-memory.md) |
| **Disk Scheduling** | Turn a request queue into head movement and compare six policies | 1 | Intermediate | [docs/disk-scheduling.md](docs/disk-scheduling.md) |
| **File Systems** | Build a virtual file system and follow a path down to physical blocks | 1 | Intermediate | [docs/file-systems.md](docs/file-systems.md) |

In total the lab ships **19 interactive labs**, **35 algorithm reference entries**, **43 worked
examples**, **8 guided lessons**, **16 practice challenges** and **110 graded quiz questions**. Two
labs are scaffolded with objectives and worked examples while their simulators are still being built;
they are labelled `Planned` and never pretend to run.

Every area is reachable from the sidebar, and every lab is a deep link (for example
`#/labs/lab-disk-scheduling`) that survives a page refresh.

---

## How a guided lesson works

Each learning area has a **guided lesson** (`#/learn`) that walks the same six stages in the same
order, so you always know what comes next:

1. **Concept** — the idea in plain language, with the key terms you should be able to define.
2. **Visualization** — the lab that makes the idea visible, with three things to watch for.
3. **Experiment** — a concrete setup to run, with the observations you should expect.
4. **Walkthrough** — a numbered trace of one full run you can replay in the lab.
5. **Challenge** — graded questions drawn from the matching question bank.
6. **Reflection** — prompts you answer privately, in your own words.

Each lesson also lists its **objectives**, **prerequisites**, **key terms** and **common mistakes**
before the stages, and records your progress locally as you tick stages off.

## How to use a simulator

Every lab uses the same controls, so once you have learned them you can use any of the nineteen:

- **Play / Pause** starts and stops the recording of the run.
- **Step** moves forward or backward exactly one recorded step — the fastest way to see a single
  scheduling decision or page eviction.
- **Speed** changes playback rate without changing the result.
- **Reset** returns the lab's inputs to their defaults.
- **View switches** (where a lab offers them, such as *Simulate / Compare / Challenge*) change what
  the same panel shows without losing your work.
- **Example selector** loads a worked example with a ready-made input, so you can start from a known
  scenario instead of inventing one.

Every step writes to a shared **timeline**, **explanation panel** and **event log**: the log names the
event, the explanation panel says why it happened, and the metrics tiles show the numbers at that
moment.

---

## The recommended learning path

Work through the areas in this order. Each one builds on the vocabulary of the one before it.

```
Processes → Scheduling → Synchronization → Deadlocks → Memory → Virtual Memory → Storage
```

Storage covers both **Disk Scheduling** and **File Systems**. You can also jump straight to the area
you are revising — the topics are self-contained, and each one declares its prerequisites at the top
of its guide.

---

## Practice and self-testing

- **Challenges** (`#/challenges`) — 16 open tasks that state a problem and the evidence a correct
  answer must contain. They are answered in the matching lab, then compared against the reference
  outcome.
- **Quiz bank** (`#/quizzes`) — 110 graded questions across 20 banks, in five formats: multiple
  choice, numerical, prediction, sequence and simulation-decision. Every expected answer is *computed
  by the same engine the lab uses*, never typed by hand, so nothing in the quiz can contradict what
  you see in the simulator.

See [docs/challenges.md](docs/challenges.md) for a bank-by-bank breakdown and a suggested study
routine.

---

## Screenshots

The lab asks users to manipulate diagrams rather than look at pictures, so it deliberately ships no
image assets — the home page's CPU timeline, every chart, memory map and graph are drawn with CSS and
SVG at runtime. To add you own captures for a course page, drop them in `docs/images/` and embed them
here:

```markdown
![Home dashboard](docs/images/home-dashboard.png)
![CPU scheduling Gantt chart](docs/images/cpu-scheduling.png)
![Deadlock wait-for graph](docs/images/wait-for-graph.png)
![File-system block map](docs/images/file-systems.png)
```

Suggested captures: the **home dashboard**, a **Gantt chart mid-run**, a **deadlocked wait-for
graph**, a **memory map with a fragmented hole**, a **TLB translation step**, and the **file-system
block map with the free-space bitmap**.

---

## Accessibility

The lab aims to be usable with a keyboard alone and readable in both light and dark themes:

- **Semantic structure** — real landmarks (header, navigation, main, footer), one `h1` per page, and a
  "skip to main content" link as the first focusable element.
- **Keyboard support** — every control is a native button, link, or labelled form control, and the
  simulator playback (including the step scrubber) is fully keyboard-operable.
- **Visible focus** — a consistent, high-contrast focus ring on every interactive element.
- **Accessible names** — decorative glyphs are hidden from assistive technology, and charts that carry
  meaning are paired with a text table or an `aria-label`.
- **Reduced motion** — animation and transitions are effectively disabled when the operating system
  requests `prefers-reduced-motion`.
- **Higher contrast** — a `prefers-contrast: more` mode strengthens borders and text contrast.
- **Theme** — light, dark and "match your system", applied before first paint so there is no flash of
  the wrong theme.

Known limitations are documented in [docs/architecture.md](docs/architecture.md#accessibility-notes):
SVG charts are described in text but are not yet a fully equivalent screen-reader experience.

---

## Technologies

| Layer | Choice |
|-------|--------|
| Language | TypeScript 5.6 (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) |
| UI | React 18 |
| Build tool | Vite 7 (static bundle; assets served under the `/Operating-Systems-Visual-Lab/` base path) |
| Tests | Vitest 4 (635 unit tests over engines, models, utilities and content) |
| Lint | ESLint 9 (flat config) with `react-hooks` and `react-refresh` |
| Styling | Hand-written CSS with custom-property design tokens — no CSS framework |
| Runtime deps | React and React DOM only |

No backend, no database, no authentication, no external APIs, and no analytics.

---

## Roadmap

**Shipped today** — all eight learning areas with 17 runnable simulators, the eight guided lessons,
the 110-question graded bank, the 16 open challenges, and the dashboard home page.

**In progress**

- **`fork`, `exec` and process trees** (Process Management) — copy-on-write address spaces, descriptor
  inheritance and PID assignment, visualised.
- **Buddy allocator** (Memory Management) — split and coalesce power-of-two blocks and measure the
  internal fragmentation that buys.

**Planned**

- Aging added to the priority policies so the starvation lesson has a built-in remedy.
- Linking each guided-experiment stage straight to a lab preset, so the setup text and the lab state
  cannot drift apart.
- Progress export: turning guided-lesson and quiz results into a downloadable worksheet.

The engines behind every shipped lab and every quiz answer already exist, so new work adds
visualisations and content rather than duplicating algorithms. See
[docs/architecture.md](docs/architecture.md#extending-the-lab) for how the pieces fit together.

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/getting-started.md](docs/getting-started.md) | Open the lab, learn the controls, and start your first lesson |
| [docs/process-management.md](docs/process-management.md) | Process states, the PCB, context switches |
| [docs/cpu-scheduling.md](docs/cpu-scheduling.md) | FCFS, SJF, SRTF, Round Robin, priority — and the metrics that score them |
| [docs/synchronization.md](docs/synchronization.md) | Race conditions, critical sections, mutexes, semaphores |
| [docs/deadlocks.md](docs/deadlocks.md) | Coffman conditions, wait-for graphs, safe states |
| [docs/memory-management.md](docs/memory-management.md) | Placement strategies, fragmentation, compaction |
| [docs/virtual-memory.md](docs/virtual-memory.md) | Paging, the TLB, page faults, replacement policies |
| [docs/disk-scheduling.md](docs/disk-scheduling.md) | Six head-scheduling policies and how to compare them |
| [docs/file-systems.md](docs/file-systems.md) | Inodes, allocation strategies, free-space management |
| [docs/challenges.md](docs/challenges.md) | The question banks, the five question formats, and how marking works |
| [docs/architecture.md](docs/architecture.md) | How the app is built, and how to extend it |
| [docs/contributing.md](docs/contributing.md) | Set up locally, run the checks, and add a lab or an engine |

---

## License

Released under the **MIT License**, as declared in `package.json`. You are free to use, adapt and
redistribute the lab for teaching, including in your own course, with attribution.

Standard references for the material covered here, useful alongside the labs:

- Silberschatz, Galvin & Gagne, *Operating System Concepts*.
- Arpaci-Dusseau & Arpaci-Dusseau, *Operating Systems: Three Easy Pieces* (available free online).
