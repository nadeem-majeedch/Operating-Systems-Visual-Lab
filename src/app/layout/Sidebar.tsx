import { NAV_SECTIONS } from '../navigation';
import { cn, hrefFor, isRouteActive, type Route } from '@/utils';

export interface SidebarProps {
  readonly id: string;
  readonly route: Route;
  readonly isOpen: boolean;
  /** Desktop rail mode: labels collapse to glyphs. */
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
  /** Called after a navigation happens, so the mobile drawer can close. */
  readonly onNavigate: () => void;
}

/**
 * Primary navigation.
 *
 * A sticky rail on desktop (which can collapse to a glyph rail) and a drawer on
 * smaller screens. Collapsing never removes an accessible name: labels are
 * visually hidden but remain in the accessibility tree, and every link carries a
 * tooltip.
 */
export function Sidebar({
  id,
  route,
  isOpen,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      id={id}
      className={cn(
        'app-sidebar',
        isOpen && 'app-sidebar--open',
        collapsed && 'app-sidebar--collapsed',
      )}
      aria-label="Primary navigation"
    >
      {onToggleCollapse ? (
        <div className="app-sidebar__head">
          <button
            type="button"
            className="app-sidebar__collapse"
            aria-pressed={collapsed}
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <span className="app-sidebar__collapse-glyph" aria-hidden="true">
              {collapsed ? '»' : '«'}
            </span>
            <span className="sr-only">
              {collapsed ? 'Expand navigation' : 'Collapse navigation'}
            </span>
          </button>
        </div>
      ) : null}

      <nav className="app-sidebar__nav">
        {NAV_SECTIONS.map((section) => (
          <div className="app-sidebar__section" key={section.id}>
            <p className="app-sidebar__section-label" id={`nav-${section.id}`}>
              {section.label}
            </p>
            <ul className="app-sidebar__list" aria-labelledby={`nav-${section.id}`}>
              {section.items.map((item) => {
                const active = isRouteActive(route, item.path);
                return (
                  <li key={item.id}>
                    <a
                      className={cn('app-sidebar__link', active && 'app-sidebar__link--active')}
                      href={hrefFor(item.path)}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : item.description}
                      onClick={onNavigate}
                    >
                      {item.glyph ? (
                        <span className="app-sidebar__glyph" aria-hidden="true">
                          {item.glyph}
                        </span>
                      ) : null}
                      <span className="app-sidebar__label">{item.label}</span>
                      {item.meta ? <span className="app-sidebar__meta">{item.meta}</span> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="app-sidebar__note">
        Runs entirely in your browser · no server, no tracking, no network calls.
      </p>
    </aside>
  );
}
