# Process Management

**Prerequisites:** none — this is the first area. **Guided lesson:** `#/learn/process-management`
**Area page:** `#/topics/process-management`

A program on disk is just a file. A **process** is that program in execution, and everything that
makes it different from the file — a PID, an address space, the kernel's bookkeeping — exists so the
operating system can stop it, resume it, and switch away from it at any time.

## Why it matters

Every other area of the course assumes this vocabulary. A scheduler chooses between *ready*
processes; a mutex blocks a *running* process; a deadlock is a set of *waiting* processes. If the
five states and the process control block are fuzzy, everything downstream feels arbitrary. Get this
area solid first and the rest reads much more easily.

## Learning objectives

By the end of this area you should be able to:

- Name all five process states and the legal transitions between them.
- Explain which transitions are caused by the scheduler and which by the process itself.
- Describe the contents of a process control block (PCB) and why it is the unit of a context switch.
- Trace a process that blocks on I/O and is resumed later.
- Explain `fork`, `exec` and copy-on-write, and how a child process relates to its parent.

## Key terminology

| Term | Meaning |
|------|---------|
| **Process** | A program in execution, with its own address space and PCB. |
| **PCB** | Process Control Block — the kernel's record of one process: PID, state, registers, priority, timings. |
| **Context switch** | Saving one process's context and restoring another's when the CPU changes hands. |
| **Preemption** | Taking the CPU away from a running process before it finishes, moving it back to **ready**. |
| **Copy-on-write** | A `fork` shares memory pages until one process writes to them, then copies only the changed page. |

### The five states

```
        admit            dispatch           terminate
  NEW --------> READY --------> RUNNING --------> TERMINATED
                  ^                 |
                  |   preempt       |  block (I/O request)
                  +-----------------+
                                    |
                                    v
                                 WAITING
                                    |
                                    |  unblock (I/O completion)
                                    +----------> READY
```

The only ways out of **running** are preempt (back to ready), block (to waiting) and terminate. A
process can never move straight from **waiting** to **running**: it must be unblocked back to ready
first, and only the scheduler may dispatch it. At most one process is **running** on a single CPU.

## Algorithms in this area

| Algorithm | What it does | Reference lab | Status |
|-----------|--------------|---------------|--------|
| **Process State Machine** | Drives a process through new → ready → running → waiting → terminated while recording PCB bookkeeping | `#/labs/lab-process-lifecycle` | Live |
| **fork / exec** | Shows how a process duplicates itself and then replaces its image | `#/labs/lab-fork-exec` | Planned |

The state machine has no tuning parameters: the policy *is* the set of legal transitions. Notice that
the engine also counts **context switches** and only increments the counter when the CPU changes hands
between two processes — dispatching onto an idle CPU saves nothing, so it is not a switch.

## Labs

| Lab | Route | Difficulty | Time | What you do |
|-----|-------|------------|------|-------------|
| **Process Lifecycle** | `#/labs/lab-process-lifecycle` | Beginner | ~15 min | Create processes, drive every transition, and inspect the PCB fields the kernel updates |
| **fork, exec and Process Trees** | `#/labs/lab-fork-exec` | Intermediate | ~20 min | *(Planned)* copy-on-write address spaces, descriptor inheritance, PID assignment |

In the **Process Lifecycle** lab you can:

- Load a scene preset (*Single process*, *Block on I/O*, *Fork tree*) or create your own process.
- Trigger each transition with a button: admit, dispatch, preempt, block, complete I/O, terminate.
- Step the scheduler one tick at a time and watch exactly one process hold the CPU.
- Read the PCB panel: state, priority, CPU time, waiting time, completion time, and the parent link.

## Guided lesson

`#/learn/process-management` — *How processes live and die* (Beginner, ~30 minutes, 6 stages).

**Experiment (stage 3).** Load the *Block on I/O* scene; dispatch P1, run it for one unit, then block
it; schedule P2; then complete P1's I/O. You should observe that:

- P1 moves `running → waiting`, and the CPU is handed to P2 rather than left idle — blocking *frees*
  the CPU, it does not waste it.
- Completing the I/O moves P1 to `ready`, **not** `running`, so it still has to wait its turn.
- Exactly one context switch is counted for the whole handover.

## Worked walkthrough

One process, start to finish, exactly as the lesson walks it:

| Step | What happens |
|------|--------------|
| **Create** | The kernel builds a PCB and the process sits in **new**. It is not competing for the CPU yet. |
| **Admit** | The process moves `new → ready` and joins the ready queue. |
| **Dispatch** | The scheduler moves it `ready → running`; the CPU loads its saved context and begins executing. |
| **Block on I/O** | A disk read moves it `running → waiting`. Another ready process is dispatched in its place. |
| **Unblock, then exit** | I/O completes (`waiting → ready`), it is dispatched again, and its final instruction moves it to `terminated`. |

The full state sequence therefore visits both **ready** and **waiting** twice around the I/O request
and the preemption.

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Thinking a process can jump straight from **waiting** back to **running** | It must be unblocked to **ready** first; only the scheduler may dispatch it. |
| Believing blocking wastes the CPU | Blocking is exactly what frees the CPU for another process instead of leaving it idle. |
| Counting the first dispatch as a context switch | A switch needs a previous process to save; dispatching onto an idle CPU saves nothing. |

## Challenge bank

**Bank:** `process-management` — 12 graded questions, all reproducible in `#/labs/lab-process-lifecycle`.

Open **Quiz bank** (`#/quizzes`) and filter to *Process Management*. Typical questions ask which
transition is legal from a given state, how many context switches a described run produces, which PCB
field changes on a given transition, and what a fork returns in parent and child.

**Open challenge:** *Trace one process end to end* (`#/challenges`) — write the full state sequence for
a program that reads a file, is preempted once, and exits, naming the trigger for each transition.
Also *Count the processes*: three unchecked `fork()` calls produce 2³ = 8 processes; the challenge asks
you to justify the doubling and explain what copy-on-write changes about the cost.

## Check yourself

- Why can a process not go straight from **waiting** to **running**?
- What exactly is saved and restored during a context switch, and why is it pure overhead?
- Give a real program you use that spends most of its life waiting, and explain what the OS does in
  the meantime.
- Predict how many processes a chain of `fork()` calls creates, and explain the rule.

## Related

- Next area: [cpu-scheduling.md](cpu-scheduling.md) — the scheduler that performs the `ready → running`
  transition.
- [synchronization.md](synchronization.md) — what happens when several processes share data.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, chapters on processes and
  threads.
