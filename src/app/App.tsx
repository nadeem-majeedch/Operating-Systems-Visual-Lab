import { useEffect } from 'react';
import { useHashRoute } from '@/hooks';
import { AppLayout } from './layout/AppLayout';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from './providers/ThemeProvider';
import { RouteView } from './RouteView';

/** Root component: theme provider, responsive shell and hash-routed content. */
export function App() {
  const route = useHashRoute();

  // Each navigation should start at the top of the new page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.path]);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppLayout route={route}>
          <RouteView route={route} />
        </AppLayout>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
