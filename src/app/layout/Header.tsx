import { ThemeToggle } from '@/components';
import { cn, hrefFor, isRouteActive, ROUTES, type Route } from '@/utils';
import { TOP_NAV_ITEMS } from '../navigation';

export interface HeaderProps {
  readonly navOpen: boolean;
  readonly onToggleNav: () => void;
  readonly navId: string;
  readonly route: Route;
}

/** Sticky, compact application header: brand, primary top navigation, theme switcher. */
export function Header({ navOpen, onToggleNav, navId, route }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <button
          type="button"
          className="app-header__nav-toggle"
          aria-expanded={navOpen}
          aria-controls={navId}
          onClick={onToggleNav}
        >
          <span className="app-header__nav-toggle-bars" aria-hidden="true" />
          <span className="sr-only">{navOpen ? 'Close navigation' : 'Open navigation'}</span>
        </button>

        <a className="app-header__brand" href={hrefFor(ROUTES.home)}>
          <span className="app-header__brand-mark" aria-hidden="true">
            OS
          </span>
          <span className="app-header__brand-text">
            <span className="app-header__brand-title">OS Visual Lab</span>
            <span className="app-header__brand-subtitle">Learn operating systems by running them</span>
          </span>
        </a>

        <nav className="app-header__nav" aria-label="Primary">
          <ul className="app-header__nav-list">
            {TOP_NAV_ITEMS.map((item) => {
              const active = isRouteActive(route, item.path);
              return (
                <li key={item.id}>
                  <a
                    className={cn('app-header__nav-link', active && 'app-header__nav-link--active')}
                    href={hrefFor(item.path)}
                    aria-current={active ? 'page' : undefined}
                    title={item.description}
                  >
                    <span className="app-header__nav-glyph" aria-hidden="true">
                      {item.glyph}
                    </span>
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="app-header__actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
