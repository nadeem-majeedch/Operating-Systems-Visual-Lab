export interface FsConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

export const FS_CONCEPT: FsConcept = {
  title: 'From a filename to a physical block',
  paragraphs: [
    'A **file** is a named, ordered sequence of bytes that the operating system stores for you. Everything else in a file system exists to answer two questions: given a path, where is the data, and how do we keep track of which blocks are free? A **directory** is itself a file whose contents are entries that map a name to a number — the **inode number** — which is the real identity of the file. Renaming or moving a file only ever edits those entries.',
    'An **inode** (index node) is the metadata record for one file: its type, size, permission bits, owner, **timestamps** (created, modified, accessed), link count and, crucially, the **block pointers** that say which disk blocks hold the data. The name is deliberately absent — that is what lets two names (hard links) or a rename leave the inode untouched.',
    'Allocating a file across blocks is a design choice. **Contiguous allocation** stores a file in one unbroken run and keeps just a start block and a length, giving instant sequential *and* random access — but it fragments the disk externally and cannot grow a file whose next block is taken. **Linked allocation** stores the next-block pointer inside each block, so any free block anywhere can join the chain and fragmentation disappears; random access becomes a walk of the list. **Indexed allocation** keeps the pointers in the inode itself: the first dozen are direct, and a larger file pulls in an **index block** holding hundreds more. It gives contiguous access characteristics with linked growth, at the cost of extra blocks for pointers.',
    '**Free-space management** tracks which blocks are in use. The simplest scheme is a **bitmap** — one bit per block, `0` free and `1` used — which is compact and lets the system find runs for contiguous allocation. Alternatives include a linked list of free blocks, a grouping count and a counting tree, but the bitmap is what this lab draws because every allocation and free is one bit flipping in front of you.',
    '**Permissions** are three bits per class — read, write, execute — for the owner, the group and everyone else, written in octal: `755` means `rwxr-xr-x`. They live in the inode, so changing them moves no data blocks at all. Around the block pointers and permissions sit the file-system invariants: an inode is either free or owned by exactly one path, a directory cannot be deleted while it still has children, and a file cannot be deleted while it is open.',
  ],
  keyPoints: [
    'A directory entry maps a name to an inode number; the name is not metadata.',
    'An inode records size, permissions, timestamps and block pointers.',
    'Contiguous allocation is fast but external-fragments and resists growth.',
    'Linked allocation never fragments but loses O(1) random access.',
    'Indexed allocation keeps pointers in the inode, adding an index block when needed.',
    'The free-space bitmap has one bit per block; 1 means used.',
    'Permissions live in the inode, so chmod moves no data.',
  ],
};
