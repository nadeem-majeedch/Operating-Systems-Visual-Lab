import { useCallback, useEffect, type ReactNode } from 'react';
import { ThemeToggle } from '@/components';
import { useDisclosure, useLocalStorage, useMediaQuery } from '@/hooks';
import { cn, type Route } from '@/utils';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SkipLink } from './SkipLink';

const NAV_ID = 'app-navigation';
const SIDEBAR_KEY = 'osvl-sidebar-collapsed';

export interface AppLayoutProps {
  readonly route: Route;
  readonly children: ReactNode;
}

/**
 * Application chrome: skip link, header, responsive sidebar and the main
 * content region. The drawer is closed automatically on desktop and on Escape;
 * the desktop rail can be collapsed and that choice is remembered locally.
 */
export function AppLayout({ route, children }: AppLayoutProps) {
  const drawer = useDisclosure(false);
  const isDesktop = useMediaQuery('(min-width: 62rem)');
  const sidebar = useLocalStorage(SIDEBAR_KEY, false);

  useEffect(() => {
    if (isDesktop && drawer.isOpen) drawer.close();
  }, [isDesktop, drawer]);

  useEffect(() => {
    if (!drawer.isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') drawer.close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawer]);

  const closeDrawer = useCallback(() => drawer.close(), [drawer]);
  const toggleCollapse = useCallback(
    () => sidebar.setValue(!sidebar.value),
    [sidebar],
  );

  return (
    <div className={cn('app-shell', isDesktop && sidebar.value && 'app-shell--rail')}>
      <SkipLink />

      <Header
        navOpen={drawer.isOpen}
        onToggleNav={drawer.toggle}
        navId={NAV_ID}
        route={route}
      />

      <div className={cn('app-body', isDesktop && sidebar.value && 'app-body--rail')}>
        <Sidebar
          id={NAV_ID}
          route={route}
          isOpen={drawer.isOpen}
          collapsed={isDesktop && sidebar.value}
          onToggleCollapse={isDesktop ? toggleCollapse : undefined}
          onNavigate={closeDrawer}
        />

        {drawer.isOpen ? (
          <button
            type="button"
            className="app-scrim"
            aria-label="Close navigation"
            onClick={closeDrawer}
          />
        ) : null}

        <main className="app-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <p>
            <strong>Operating Systems Visual Lab</strong> — a fully client-side teaching tool.
            Every simulation is deterministic and runs offline once the page has loaded.
          </p>
          <div className="app-footer__aside">
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
