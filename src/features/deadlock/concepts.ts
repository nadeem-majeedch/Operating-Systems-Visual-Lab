export type DeadlockConceptKind = 'bankers' | 'rag';

export interface DeadlockConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

/** The four necessary conditions, shared by both deadlock labs. */
export const COFFMAN_CONDITIONS: readonly string[] = [
  'Mutual exclusion: a resource is held by at most one process at a time.',
  'Hold and wait: a process holds one resource while requesting another.',
  'No preemption: a resource cannot be taken away; it must be released voluntarily.',
  'Circular wait: a closed chain of processes each waiting for a resource the next holds.',
];

export const DEADLOCK_CONCEPTS: Record<DeadlockConceptKind, DeadlockConcept> = {
  bankers: {
    title: 'Deadlock avoidance and the banker’s algorithm',
    paragraphs: [
      'A deadlock is a set of processes each waiting for a resource that only another member of the set holds, so none can ever proceed. It is not a crash — the system simply stops making progress. Deadlock can only happen when all four Coffman conditions hold at once: mutual exclusion, hold-and-wait, no preemption, and a circular wait.',
      'There are three classic responses. **Prevention** removes one of the four conditions up front — for example, requiring a process to ask for everything at once (no hold-and-wait) or imposing a global order on resources (no circular wait). **Avoidance** keeps the conditions in place but refuses to make an allocation that could lead to a deadlock, using advance knowledge of each process’s maximum demand. **Detection** lets deadlocks happen and then finds them, for instance with a resource-allocation graph.',
      'The banker’s algorithm is the canonical avoidance scheme. Every process declares a maximum claim, and `Need = Max − Allocation` is what it might still ask for. The system is *safe* when there exists a safe sequence — an order in which every process could finish if each one asked for its full remaining need. If such an order exists, the banker may keep granting requests; if granting a request would destroy the last safe sequence, the request is made to wait and the state is rolled back.',
      'Safety is a worst-case guarantee, and it is conservative. An **unsafe** state is not a deadlock and does not even mean a deadlock will happen — it means there is no completion order under the assumption that every process eventually asks for its maximum. Avoidance trades utilisation for that guarantee, which is why general-purpose operating systems rarely use it directly.',
    ],
    keyPoints: [
      ...COFFMAN_CONDITIONS,
      'Need = Max − Allocation, always.',
      'Safe: a sequence exists in which every process can finish.',
      'Unsafe: no such sequence — avoid it, but it is not itself a deadlock.',
      'A request is granted only if the resulting state stays safe.',
    ],
  },
  rag: {
    title: 'Resource-allocation and wait-for graphs',
    paragraphs: [
      'A resource-allocation graph makes a deadlock visible. Processes are circles, resource types are rectangles, and an allocation edge points from a resource to the process holding it. A request edge points from a process to a resource it wants. If a process holds something while requesting something else, that is hold-and-wait drawn out on the page.',
      'Collapsing the graph gives the wait-for graph: whenever a request edge reaches a resource that another process holds, draw a single process → process edge instead. A cycle in this collapsed graph is the circular wait condition. With exactly one instance per resource, a cycle is necessary *and* sufficient — its presence proves a deadlock and its absence proves there is none.',
      'When resources have several instances the collapse can over-approximate: a process may be satisfiable from a free instance without waiting for any holder. There the reliable test is the **reduction algorithm**, which repeatedly finishes any process whose entire request can be met, returning its resources, and reports a deadlock if some process can never be finished.',
      'Detection is reactive — it finds a deadlock after it exists. Prevention removes a Coffman condition before the fact, and avoidance reasons about the future so the deadlock is never entered at all. Real systems combine the ideas: ordered locking to prevent circular waits, and timeouts or detection as a backstop.',
    ],
    keyPoints: [
      'Allocation edge: resource → process (who holds it).',
      'Request edge: process → resource (who wants it).',
      'A cycle in the wait-for graph is a circular wait.',
      'Single instance per resource: a cycle is necessary and sufficient.',
      'Multiple instances: collapse can over-approximate — use the reduction algorithm.',
    ],
  },
};
