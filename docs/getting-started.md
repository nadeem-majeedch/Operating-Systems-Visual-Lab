# Getting started

This guide takes you from opening the lab to completing your first full lesson. It is written for
students, not for people setting up a development environment — if you want to run the project from
source, see [contributing.md](contributing.md).

---

## What you need

- A modern browser (Chrome, Edge, Firefox or Safari from the last couple of years).
- JavaScript enabled. The lab is an interactive application and cannot fall back to static pages.
- No account, no install, no network connection once the page has loaded.
- About 30 minutes for a first sitting, 355 minutes for the whole curriculum.

The lab works on a phone, but the simulations are much easier to read on a tablet or laptop. Nothing
is lost on a small screen — wide data tables scroll horizontally inside their own panel rather than
stretching the page.

## Opening the lab

Use the deployed site:

```
https://nadeem-majeedch.github.io/Operating-Systems-Visual-Lab/
```

If you fork the project, the same path works under your own account — only the host name changes.
Everything is a **hash link**, so any page you reach can be bookmarked and will still open correctly
after a refresh — for example `#/labs/lab-fcfs` or `#/learn/virtual-memory`.

If you prefer to work offline, you can also download the built site once and open `index.html`; the
lab keeps working with no connection.

---

## The 60-second tour

| Where | What it is for |
|-------|----------------|
| **Home** (`#/`) | The map: eight learning areas, the recommended path, a featured simulation and quick-start tiles |
| **Learning areas** (`#/topics`) | The index of all eight areas, each with its labs, algorithms and outcomes |
| **A learning area** (`#/topics/cpu-scheduling`) | Everything for one area: prerequisites, objectives, algorithms, labs |
| **A lab** (`#/labs/lab-fcfs`) | The simulator itself — inputs, visualisation, timeline, explanation, metrics |
| **Guided learning** (`#/learn`) | Eight six-stage lessons, one per area |
| **Quiz bank** (`#/quizzes`) | 110 graded questions across 20 banks |
| **Challenges** (`#/challenges`) | 16 open tasks you attempt in the matching lab |
| **Architecture** (`#/about`) | How the lab is built, if you are curious or studying software design |

The **sidebar** lists every area; the **top navigation** links the five main entry points. On a narrow
screen the sidebar collapses into a drawer behind the menu button.

---

## Your first 30 minutes

1. **Read one concept.** Open **Guided learning** (`#/learn`) and start
   *Process Management → How processes live and die*. Read only stage 1, *Concept*.
2. **Watch it move.** Continue to stage 2, *Visualization*, and follow its link into the
   **Process Lifecycle** lab (`#/labs/lab-process-lifecycle`).
3. **Drive it yourself.** In that lab, use the scene presets to load *Block on I/O*, then press
   **Step forward** one action at a time. Watch the state diagram, the PCB panel and the event log
   change together.
4. **Run the experiment.** Back in the lesson, stage 3 gives you an exact setup. Do it. The stage
   lists the observations you should be able to make; if you cannot make them, that is your signal to
   ask a question in class.
5. **Check yourself.** Finish the lesson's challenge stage, then try a few questions from the matching
   bank in the **Quiz bank** (`#/quizzes`), filtered to *Process Management*.
6. **Reflect.** Answer the reflection prompts in your own words — out loud or in your notes. If you
   can explain the answer to "why can a process not go straight from waiting to running?", you have
   the idea.

That is the loop for every area: **read → watch → drive → run → check → reflect.**

---

## How to use a simulator

Every one of the 19 labs uses the same controls, in the same order, with the same meanings.

| Control | What it does |
|---------|--------------|
| **Play / Pause** | Runs or freezes the recorded steps of the simulation |
| **Step backward / Step forward** | Moves exactly one recorded step — the most useful control in the whole lab |
| **Speed** | Changes playback rate only; it never changes the result |
| **Reset** | Returns the lab's inputs to their defaults |
| **View switches** | Change what the panel shows (`Simulate`, `Compare`, `Challenge`, …) without losing your work |
| **Example selector** | Loads a worked example with a ready-made input and an expected outcome |
| **Workload editor** | Adds, edits and removes the processes, requests or operations the lab simulates |

### The four panels every lab shares

- **Timeline** — the recorded steps as a scrubber. Drag it to jump anywhere in the run.
- **Explanation** — the sentence that says *why* the current step happened. This is the part to read
  if you only read one thing.
- **Event log** — the running list of events with their clock values, so you can reconstruct the run
  after it finishes.
- **Metrics** — the numbers at this exact step: turnaround, faults, head movement, free bytes, and so
  on. They update as you step, which is how you connect the arithmetic to the picture.

> **Tip:** press **Play**, watch the shape of the run, then press **Reset** and **Step** through it
> slowly. The first pass gives you intuition; the second gives you understanding.

---

## Where your work is stored

The lab has no accounts and no server, so there is nothing to log in to and nothing leaves your
machine. Your progress is saved in your browser's local storage under two keys:

| Key | What it holds |
|-----|---------------|
| `osvl-learning-progress` | Which guided-lesson stages you have completed |
| `osvl-quiz-mastered` | Which quiz questions you have answered correctly |
| `osvl.theme` | Your light/dark/system choice |
| `osvl-sidebar-collapsed` | Whether you collapsed the sidebar |

Clearing site data resets your progress. Because progress is per-browser, it will not follow you to
another device — that is the trade for not needing an account.

---

## Keyboard and accessibility

- Press **Tab** on first load to reach the **skip-to-content** link, then Tab through the navigation.
- Every button, link and input is reachable and operable from the keyboard; focus is always visible.
- Charts are labelled for assistive technology and are accompanied by the metrics and event log in
  text form.
- If you prefer less motion, turn on *Reduce motion* in your operating system and the lab's
  animations and transitions are effectively disabled.
- Light, dark and "match your system" themes are available from the toggle in the header.

---

## Choosing what to study

- **Following the course in order?** Use the [learning path](../README.md#the-recommended-learning-path):
  Processes → Scheduling → Synchronization → Deadlocks → Memory → Virtual Memory → Storage.
- **Revising for an exam?** Go straight to the **Quiz bank** (`#/quizzes`), filter to the bank you are
  weakest on, and answer until you stop getting surprised. Each question links to the lab where you can
  reproduce the answer.
- **Want something open-ended?** Try a **Challenge** (`#/challenges`) — you state the evidence a
  correct answer needs, then check it against the reference outcome computed by the engine.
- **Not sure the theory is worth it?** Open any lab and press play. Seeing the convoy effect build is
  usually faster than being convinced by a paragraph.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| The page is blank | JavaScript is disabled or blocked. The `<noscript>` notice only appears if it is. |
| Progress disappeared | Site data was cleared, or you are in a different browser or a private window. |
| A lab says *Planned* | Its simulator is still being built. The objectives and worked examples are still readable. |
| A wide table is cut off on my phone | Swipe the table itself; wide tables scroll inside their own panel. |
| Nothing happens when I press Play | Check that the workload is valid — most labs explain the exact field that needs fixing. |

Next: pick your area from the [documentation index](../README.md#documentation) or jump straight to
[cpu-scheduling.md](cpu-scheduling.md), the most common starting point.
