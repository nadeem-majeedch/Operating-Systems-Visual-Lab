import { TOPICS, getContentStats } from '@/content';
import { Breadcrumb, Stat } from '@/components';
import { useDocumentTitle } from '@/hooks';
import { ROUTES, formatDuration } from '@/utils';
import { TopicCard } from '@/features/topics/TopicCard';

/** Index of all eight learning areas. */
export function TopicsPage() {
  useDocumentTitle('Learning areas');
  const stats = getContentStats();

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Home', path: ROUTES.home }, { label: 'Learning areas' }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Curriculum</p>
        <h1 className="page-header__title">Learning areas</h1>
        <p className="page-header__lead">
          Eight areas of operating systems. Each one lists its labs, the algorithms behind them and
          the outcomes you should be able to explain afterwards.
        </p>
      </header>

      <div className="page-stats">
        <Stat label="Areas" value={stats.topicCount} />
        <Stat label="Labs" value={stats.labCount} hint={`${stats.availableLabCount} interactive`} />
        <Stat label="Algorithms" value={stats.algorithmCount} />
        <Stat label="Guided time" value={formatDuration(stats.totalMinutes * 60)} />
      </div>

      <ul className="topic-grid">
        {TOPICS.map((topic) => (
          <li className="topic-grid__item" key={topic.id}>
            <TopicCard topic={topic} showObjectives />
          </li>
        ))}
      </ul>
    </div>
  );
}
