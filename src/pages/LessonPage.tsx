import { Breadcrumb } from '@/components';
import { getLesson, getTopic } from '@/content';
import { useDocumentTitle } from '@/hooks';
import { ROUTES } from '@/utils';
import { GuidedLessonView } from '@/features/learning';
import { NotFoundPage } from './NotFoundPage';

export interface LessonPageProps {
  readonly topicId: string;
}

/** Hosts one guided lesson for a learning area. */
export function LessonPage({ topicId }: LessonPageProps) {
  const lesson = getLesson(topicId);
  const topic = getTopic(topicId);
  useDocumentTitle(lesson?.title ?? 'Guided lesson');

  if (!lesson) {
    return (
      <NotFoundPage
        title="Lesson not found"
        description={`No guided lesson matches "${topicId}". Browse the guided learning index instead.`}
      />
    );
  }

  return (
    <div className="page">
      <Breadcrumb
        items={[
          { label: 'Home', path: ROUTES.home },
          { label: 'Guided learning', path: ROUTES.learn },
          { label: topic?.title ?? lesson.title },
        ]}
      />
      <GuidedLessonView key={lesson.topicId} lesson={lesson} />
    </div>
  );
}
