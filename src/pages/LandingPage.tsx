import { useDocumentTitle } from '@/hooks';
import { AboutLab } from '@/features/landing/AboutLab';
import { ChallengeMode } from '@/features/landing/ChallengeMode';
import { DomainGrid } from '@/features/landing/DomainGrid';
import { FeaturedSimulation } from '@/features/landing/FeaturedSimulation';
import { Hero } from '@/features/landing/Hero';
import { LearningPath } from '@/features/landing/LearningPath';
import { QuickStart } from '@/features/landing/QuickStart';

/**
 * Public dashboard: what the lab is, the eight learning domains, the
 * recommended route, a featured simulation, and the fastest ways in.
 */
export function LandingPage() {
  useDocumentTitle();

  return (
    <div className="page">
      <Hero />
      <DomainGrid />
      <LearningPath />
      <FeaturedSimulation />
      <QuickStart />
      <ChallengeMode />
      <AboutLab />
    </div>
  );
}
