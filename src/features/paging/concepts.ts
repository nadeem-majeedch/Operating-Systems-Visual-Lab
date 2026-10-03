export interface PagingConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

export const PAGING_CONCEPT: PagingConcept = {
  title: 'Paging, address translation and the TLB',
  paragraphs: [
    'Physical memory is chopped into fixed-size blocks called **frames**, and each process’s address space is chopped into the same-sized blocks called **pages**. Paging removes external fragmentation because any page can sit in any frame — the two are no longer required to be contiguous, so a large process may be spread across scattered frames.',
    'A process therefore never speaks physical addresses. It speaks **logical (virtual) addresses**, which the hardware translates on every access. A logical address is split by bit fields: the low `log2(pageSize)` bits are the **offset** into a page, and the remaining high bits are the **page number**. The page number is looked up in the **page table**, which maps it to a **frame number**; the offset is copied through unchanged, and frame number + offset form the **physical address**. Changing the page size is purely a matter of moving the boundary between the two fields.',
    'The page table maps every page of the address space to its frame and carries a valid (present) bit. Walking it costs a memory access per reference, which is why processors keep a **translation lookaside buffer** — a small, fast cache of recent page → frame translations. A **TLB hit** resolves the address with no page-table access at all. A **TLB miss** falls back to the page table and then caches the result, so misses are not errors, just slower.',
    'A **page fault** is different: the page’s valid bit is clear, meaning the page is not in memory right now. The hardware traps to the operating system, which brings the page in from backing store — into a free frame if one exists, otherwise by evicting a victim page and invalidating its entry — and then restarts the faulting instruction. A fault costs orders of magnitude more than a TLB miss because it touches the disk.',
    'Finally, an address can be **invalid**: larger than the logical address space. There is no page for it to name, so the hardware traps before any translation. That is a protection fault, not a page fault — the distinction is between an address that cannot exist and a valid address whose page happens to be on disk.',
  ],
  keyPoints: [
    'Pages are logical blocks; frames are physical blocks of the same size.',
    'Logical address = page number | offset, split at log2(pageSize) bits.',
    'Physical address = frame number | offset; the offset never changes.',
    'The page table maps page → frame and holds the valid bit.',
    'A TLB hit skips the page-table walk; a TLB miss costs one.',
    'A page fault means the page is not in memory; the OS loads it in.',
    'An out-of-range address is invalid and traps — it is not a page fault.',
  ],
};
