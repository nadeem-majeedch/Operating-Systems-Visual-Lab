# Challenges and the Quiz Bank

The lab has **two** kinds of self-testing, and they are deliberately different:

| | **Practice challenges** (`#/challenges`) | **Graded quiz bank** (`#/quizzes`) |
|---|---|---|
| How many | 16 | 110 |
| Format | An open task plus the evidence a correct answer must contain | Five machine-graded question formats |
| Where you answer | In the matching lab, on paper, or in a document | In the runner, with instant feedback |
| Marking | You compare against a stated reference outcome | The engine marks it immediately |
| Best for | Reasoning, derivations, "show your working" | Recall, repetition, catching gaps |

Both are built on the same rule: **nothing is hand-typed that an engine can compute.**

---

## Why the answers are trustworthy

Every expected answer in the quiz bank is *derived by running the real simulation engine* when the
question is created. A question about average waiting time runs the scheduler; a question about head
movement runs the disk engine; a question about a safe sequence runs the banker's algorithm.

Two consequences follow, and both matter for study:

1. **Nothing in the quiz can contradict the lab.** If you disagree with a marked answer, open the lab
   and load the same input — you can reproduce the number.
2. **Explanations are always available.** Each question carries the reasoning for its answer, not just
   the correct option.

A test suite also asserts that every challenge is well-formed, every referenced lab exists, and every
answer is resolvable — so a broken question fails the build rather than reaching you.

---

## The five question formats

| Format | You are asked to… | Marked how |
|--------|-------------------|------------|
| **Multiple choice** | Pick one option | Exact option id match |
| **Numerical** | Type a number (and, where relevant, its unit) | Within a stated tolerance of the engine's value |
| **Prediction** | Say what will happen next — which process runs, which page is evicted, whether a request is granted | Exact option id match |
| **Sequence** | Put events or entities in the correct order | Exact order match |
| **Decision** | Choose a course of action or a policy for a described situation | Exact option id match |

Distribution across the 110 graded questions:

| Format | Questions |
|--------|:---------:|
| Numerical | 54 |
| Prediction | 22 |
| Decision | 15 |
| Multiple choice | 14 |
| Sequence | 5 |

Because numerical questions dominate, this bank rewards actually doing the arithmetic. That is
intentional: the identity `waiting = turnaround − burst` is worth more to you in an exam than any amount
of multiple-guessing.

Difficulty spread: **30 beginner, 52 intermediate, 28 advanced**. The questions cover **18 different
labs**.

---

## The 20 banks

A **bank** is a coherent slice of one learning area, grouped so you can drill a single idea. Choose a
bank in the runner, or filter by learning area and difficulty.

| Learning area | Bank | Questions | Reproduce it in |
|---------------|------|:---------:|-----------------|
| Process Management | `process-management` | 12 | `#/labs/lab-process-lifecycle` |
| CPU Scheduling | `cpu-scheduling` | 12 | `#/labs/lab-fcfs` |
| Synchronization | `race-conditions` | 5 | `#/labs/lab-mutex` |
| Synchronization | `producer-consumer` | 3 | `#/labs/lab-bounded-buffer` |
| Synchronization | `dining-philosophers` | 3 | `#/labs/lab-dining-philosophers` |
| Synchronization | `readers-writers` | 2 | `#/labs/lab-readers-writers` |
| Deadlocks | `bankers-algorithm` | 7 | `#/labs/lab-bankers` |
| Deadlocks | `wait-for-graph` | 6 | `#/labs/lab-wait-for-graph` |
| Memory Management | `placement` | 5 | `#/labs/lab-contiguous-allocation` |
| Memory Management | `fragmentation` | 5 | `#/labs/lab-contiguous-allocation` |
| Virtual Memory | `address-translation` | 7 | `#/labs/lab-tlb-translation` |
| Virtual Memory | `tlb` | 4 | `#/labs/lab-tlb-translation` |
| Virtual Memory | `page-faults` | 2 | `#/labs/lab-tlb-translation` |
| Virtual Memory | `page-replacement` | 12 | `#/labs/lab-page-replacement` |
| Disk Scheduling | `disk-scheduling` | 12 | `#/labs/lab-disk-scheduling` |
| File Systems | `allocation` | 5 | `#/labs/lab-file-allocation` |
| File Systems | `inodes` | 3 | `#/labs/lab-file-allocation` |
| File Systems | `space` | 2 | `#/labs/lab-file-allocation` |
| File Systems | `behaviour` | 2 | `#/labs/lab-file-allocation` |
| File Systems | `pointers` | 1 | `#/labs/lab-file-allocation` |

Per learning area: Process Management 12 · CPU Scheduling 12 · Synchronization 13 · Deadlocks 13 ·
Memory Management 10 · Virtual Memory 25 · Disk Scheduling 12 · File Systems 13.

---

## Using the quiz runner

- **Filters** — narrow by *learning area*, *bank* and *difficulty*. Start broad to find a weakness, then
  narrow to drill it.
- **Session progress** — the runner tracks `correct / answered / percentage` for the current session.
- **Feedback** — after each answer you get correct/incorrect, the expected answer, and the explanation.
- **Mastery** — questions you have already answered correctly are tagged *Mastered earlier* so you can
  tell new material from revision.
- **Reset session** — clears the current session's counters.
- **Progress is stored locally** under `osvl-quiz-mastered`, so it survives a reload but not clearing
  site data, and it does not follow you to another device.

Each question's bank is linked to the lab where its answer can be reproduced, so a wrong answer always
has somewhere concrete to go next.

---

## The 16 practice challenges

These are open tasks. Each states a scenario, the task, and — most importantly — **the requirements**:
the evidence a correct answer must contain. Then it tells you where to do the work.

| Area | Challenge | Where it is done |
|------|-----------|------------------|
| Process Management | Trace one process end to end | `#/labs/lab-process-lifecycle` |
| Process Management | Count the processes | `#/labs/lab-fork-exec` *(planned — answer on paper)* |
| CPU Scheduling | Quantify the convoy effect | `#/labs/lab-fcfs` |
| CPU Scheduling | Choose a time quantum | `#/labs/lab-round-robin` |
| CPU Scheduling | Break the optimality of SJF | `#/labs/lab-sjf` |
| Synchronization | Produce a lost update by hand | `#/labs/lab-mutex` |
| Synchronization | Deadlock the bounded buffer | `#/labs/lab-bounded-buffer` |
| Deadlocks | Find a safe sequence | `#/labs/lab-bankers` |
| Deadlocks | Cycle does not always mean deadlock | `#/labs/lab-wait-for-graph` |
| Memory Management | Prove external fragmentation | `#/labs/lab-contiguous-allocation` |
| Memory Management | Measure buddy allocator waste | `#/labs/lab-buddy-system` *(planned — answer on paper)* |
| Virtual Memory | Reproduce Bélády's anomaly | `#/labs/lab-page-replacement` |
| Virtual Memory | Cost a TLB miss | `#/labs/lab-tlb-translation` |
| Disk Scheduling | Does head direction matter? | `#/labs/lab-disk-scheduling` |
| Disk Scheduling | Starve a request with SSTF | `#/labs/lab-disk-scheduling` |
| File Systems | Walk an inode to a byte | `#/labs/lab-file-allocation` |

Difficulty spread: **2 beginner, 6 intermediate, 8 advanced**.

Each challenge also lists **hints** and an **expected outcome** — the shape a correct answer takes — so
you can judge your own work honestly rather than just "feeling done".

> **Why open tasks?** Because multiple-choice can be passed by recognition. These challenges ask you to
> *produce* the state sequence, the interleaving, the safe sequence — the same thing an exam asks. The
> reference outcome tells you what a good answer contains, not a word-perfect answer to copy.

---

## A study routine that works

1. **Read the concepts first.** Work the guided lesson for an area so you have the vocabulary.
2. **Do the experiments.** The lesson stages tell you exactly what to run and what to look for.
3. **Attempt the practice challenges while the idea is fresh.** Reason it out; do not look at the
   expected outcome until you have something written down.
4. **Drill the bank.** Filter to that area's banks and answer until you stop being surprised. Numerical
   questions are the ones that will catch you out.
5. **Return later and re-do the *mastered* ones.** Mastery today is not mastery in three weeks; spaced
   repetition is why the *Mastered earlier* tag exists.
6. **Before an exam, work the open challenges under time pressure.** They resemble exam questions far
   more closely than the quiz does.

### If you get a question wrong

Do not just read the explanation and move on. Open the linked lab, load the same input, and step through
it until you can see where your reasoning diverged. The lab exists precisely so that a wrong answer has
a fixable cause.

---

## Related

- [getting-started.md](getting-started.md) — the controls and the recommended first session.
- [architecture.md](architecture.md#the-challenge-engine) — how questions are built from the engines.
- [contributing.md](contributing.md#adding-a-challenge-bank) — how to add a bank or a new question.
