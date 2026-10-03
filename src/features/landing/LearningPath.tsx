import type { TopicId } from '@/types';
import { SectionHeading } from '@/components';
import { getTopic } from '@/content';
import { ROUTES, hrefFor } from '@/utils';

interface PathStop {
  readonly label: string;
  readonly blurb: string;
  /** Learning areas reached from this stop. */
  readonly topicIds: readonly TopicId[];
}

/**
 * The recommended route through the curriculum, in teaching order. "Storage"
 * gathers the two storage areas so the path reads as one sequence.
 */
const PATH_STOPS: readonly PathStop[] = [
  {
    label: 'Processes',
    blurb: 'States, the PCB and context switches.',
    topicIds: ['process-management'],
  },
  {
    label: 'Scheduling',
    blurb: 'Who runs next, and how fairly.',
    topicIds: ['cpu-scheduling'],
  },
  {
    label: 'Synchronization',
    blurb: 'Races, mutexes and semaphores.',
    topicIds: ['synchronization'],
  },
  {
    label: 'Deadlocks',
    blurb: 'Detection, avoidance and recovery.',
    topicIds: ['deadlocks'],
  },
  {
    label: 'Memory',
    blurb: 'Placement and fragmentation.',
    topicIds: ['memory-management'],
  },
  {
    label: 'Virtual Memory',
    blurb: 'Translation, TLB and replacement.',
    topicIds: ['virtual-memory'],
  },
  {
    label: 'Storage',
    blurb: 'Disk scheduling and file systems.',
    topicIds: ['disk-scheduling', 'file-systems'],
  },
];

/** The order to work through the curriculum, with a deep link per area. */
export function LearningPath() {
  return (
    <section className="section" aria-labelledby="learning-path-heading">
      <SectionHeading
        id="learning-path-heading"
        eyebrow="Recommended route"
        title="Learning path"
        description="Follow the sequence from processes to storage, or jump to the area you are revising."
      />
      <ol className="learning-path">
        {PATH_STOPS.map((stop, index) => (
          <li className="path-stop" key={stop.label}>
            <span className="path-stop__index" aria-hidden="true">
              {index + 1}
            </span>
            <h3 className="path-stop__title">{stop.label}</h3>
            <p className="path-stop__blurb">{stop.blurb}</p>
            <div className="path-stop__links">
              {stop.topicIds.map((topicId) => {
                const topic = getTopic(topicId);
                if (!topic) return null;
                return (
                  <a key={topicId} className="path-stop__link" href={hrefFor(ROUTES.topic(topicId))}>
                    {topic.title}
                  </a>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
