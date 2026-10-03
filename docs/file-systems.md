# File Systems

**Prerequisites:** [Memory Management](memory-management.md) and [Disk Scheduling](disk-scheduling.md).
**Guided lesson:** `#/learn/file-systems`. **Area page:** `#/topics/file-systems`

A filename is not the file. Everything a file system does can be understood as three layers that have to
agree with each other: a **name** in a directory, an **inode** holding metadata and pointers, and the
**blocks** that actually hold the bytes.

## Why it matters

This area closes the loop between memory and storage. "Which blocks are free" is the same problem as
"which holes are free" in [memory management](memory-management.md), and "which block comes next" is the
same adjacency question that made contiguous allocation fragile there. It also explains a fact that
surprises people: a volume can be reported as having free space and still refuse to create a file.

## Learning objectives

- Compare contiguous, linked and indexed block allocation, including the cost of each on sequential and
  random reads.
- Trace a path from a directory entry to an inode, and from the inode to the data blocks.
- Explain what an inode records, and why the file's *name* is deliberately not one of those fields.
- Explain how the free-space bitmap tracks used blocks.
- Explain why a volume can run out of inodes while blocks remain free.

## Key terminology

| Term | Meaning |
|------|---------|
| **File** | A named, ordered sequence of bytes. |
| **Directory** | A file whose contents map names to inode numbers — it is a table, not a container. |
| **Directory entry** | One `name → inode number` mapping; the name lives here, not in the inode. |
| **Inode** | The metadata record for one file: type, size, permission bits, owner, timestamps, link count and block pointers. |
| **Contiguous allocation** | A file occupies one unbroken run of blocks (`start`, `length`). |
| **Linked allocation** | Each block holds a pointer to the next, so adjacency is irrelevant. |
| **Indexed allocation** | The inode holds block pointers, with an index block for larger files. |
| **Free-space bitmap** | One bit per block, saying whether it is in use. |

Why the name lives in the directory and not the inode: that separation is what makes **rename instant**
and **hard links possible**. Renaming edits one directory entry; the inode and its data never move.

## The three allocation strategies

| Strategy | Metadata | Sequential read | Random read | Growth | Fragmentation |
|----------|----------|:---------------:|:-----------:|--------|---------------|
| **Contiguous** | `start` block + length | Fast | **O(1)** | Only into the block directly after the file | **External** — needs an unbroken run |
| **Linked** | First block; each block points to the next | Fast | **O(i)** — follow *i* pointers | Any free block, anywhere | None external; a broken pointer loses the rest of the chain |
| **Indexed** | Pointers in the inode: 12 direct, then a single-indirect index block | Fast | **O(1)** | Any free block | A large file spends whole blocks on pointers |

For indexed allocation in this lab, a file uses up to **12 direct pointers** in the inode and then a
single **index block**; each index block holds `blockSize / 4` more block pointers.

## Lab

| Lab | Route | Difficulty | Time |
|-----|-------|------------|------|
| **File Allocation, Inodes & Free Space** | `#/labs/lab-file-allocation` | Intermediate | ~35 min |

The lab builds a **virtual file system entirely in memory** — no real disk, no real files. You choose the
geometry (number of blocks, block size, inode table size), choose an allocation strategy, and then run a
**script of real operations**:

`mkdir` · `create` · `delete` · `rename` · `move` · `open` · `close` · `chmod`

Every operation is a step you can inspect. Each step updates three views that always agree:

- the **directory tree**,
- the **inode table** (size, permissions, timestamps, block pointers),
- the **block map** and the **free-space bitmap**.

The lab also offers a **comparison view** that runs the same script under all three strategies at once,
and a **challenge view** that turns the engine into graded questions.

## Guided lesson

`#/learn/file-systems` — *Naming, storing and finding bytes* (Advanced, ~40 minutes, 6 stages).

**Experiment (stage 3).** Fill an eight-block disk, free two isolated blocks, then create a two-block
file — and switch the strategy between **contiguous** and **linked**. You should observe that:

- Contiguous allocation **refuses** the file: the two free blocks are not adjacent.
- Linked allocation **accepts** it and chains the two holes together.
- The fragmentation metrics show two free runs with a largest run of **one** block — plenty of free
  blocks, no usable pair.

That single experiment is the case for linked and indexed allocation in miniature.

## Worked walkthrough: create, grow, read, delete

| Step | What happens |
|------|--------------|
| **Create** | A name is added to the directory, an inode is taken from the free list, and blocks are marked used in the bitmap. |
| **Grow** | The file asks for another block: contiguous needs the block right after it; linked takes any free block and repoints the tail; indexed adds a pointer (or allocates an index block). |
| **Read** | The path resolves to an inode; the inode's pointers give the blocks. Linked files must follow the chain, which is why random access is linear for them. |
| **Shrink** | Trailing blocks return to the bitmap, and an index block is released once the file is small enough. |
| **Delete** | The directory entry goes and the inode returns to the free list — its blocks become reusable. |

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Thinking a rename rewrites the file | Only the directory entry changes; the inode and data blocks are untouched. |
| Assuming a contiguous file can always grow in place | It can extend only into the block directly after it, which may belong to another file. |
| Believing a disk is full only when no blocks are free | A volume can run out of **inodes** while hundreds of blocks remain free. |
| Thinking a directory "contains" its files | A directory maps names to inode numbers; the data lives in blocks. |
| Assuming linked allocation is bad at everything | It is fine for sequential reads and never fragments externally; it is random access that suffers. |

## Challenge banks and open challenges

**Banks** (13 graded questions total):

| Bank | Questions | Focus |
|------|:---------:|-------|
| `allocation` | 5 | Choosing and comparing the three strategies |
| `inodes` | 3 | Metadata, identity and free-inode exhaustion |
| `space` | 2 | The free-space bitmap and block accounting |
| `behaviour` | 2 | What operations do and do not change |
| `pointers` | 1 | Where block pointers physically live |

Open **Quiz bank** (`#/quizzes`) and filter to *File Systems*. Block counts, inode numbers and pointer
targets are all read out of the file-system engine.

**Open challenge** (`#/challenges`): *Walk an inode to a byte* — given a path, resolve it to an inode,
then to the block that holds a particular byte, and show the arithmetic that gets you there.

## Check yourself

- Why is renaming a multi-gigabyte file instant while copying it is slow?
- What would a workload of many tiny files do to an inode table?
- Which allocation strategy would you pick for random access, and which for streaming writes?
- Why can a volume report free blocks and still fail to create a file?
- What is the cost of deleting the first block of a linked file versus the last?

## Related

- Previous: [disk-scheduling.md](disk-scheduling.md) — the device the blocks live on.
- Also relevant: [memory-management.md](memory-management.md) — the same contiguity and fragmentation
  ideas at a different scale.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the file-system-interface and
  file-system-implementation chapters.
