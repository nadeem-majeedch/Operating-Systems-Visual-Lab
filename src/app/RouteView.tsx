import type { Route } from '@/utils';
import { AboutPage } from '@/pages/AboutPage';
import { ChallengesPage } from '@/pages/ChallengesPage';
import { LabPage } from '@/pages/LabPage';
import { LandingPage } from '@/pages/LandingPage';
import { LearnPage } from '@/pages/LearnPage';
import { LessonPage } from '@/pages/LessonPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { QuizPage } from '@/pages/QuizPage';
import { TopicPage } from '@/pages/TopicPage';
import { TopicsPage } from '@/pages/TopicsPage';

/** Maps the typed route to a page. Exhaustive over the `Route` union. */
export function RouteView({ route }: { readonly route: Route }) {
  switch (route.name) {
    case 'home':
      return <LandingPage />;
    case 'topics':
      return <TopicsPage />;
    case 'challenges':
      return <ChallengesPage />;
    case 'quizzes':
      return <QuizPage />;
    case 'learn':
      return <LearnPage />;
    case 'lesson':
      return <LessonPage topicId={route.topicId} />;
    case 'topic':
      return <TopicPage topicId={route.topicId} />;
    case 'lab':
      return <LabPage labId={route.labId} />;
    case 'about':
      return <AboutPage />;
    case 'not-found':
      return (
        <NotFoundPage
          title="Page not found"
          description={`Nothing is routed at "${route.path}". Use the navigation to pick a learning area.`}
        />
      );
  }
}
