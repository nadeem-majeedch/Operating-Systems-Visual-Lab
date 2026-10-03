import { hrefFor } from '@/utils';

export interface BreadcrumbItem {
  readonly label: string;
  /** Path for the crumb; the final crumb should omit it. */
  readonly path?: string;
}

/** Breadcrumb trail; the last item is marked as the current page. */
export function Breadcrumb({ items }: { readonly items: readonly BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li className="breadcrumb__item" key={`${item.label}-${index}`}>
              {item.path && !isLast ? (
                <a className="breadcrumb__link" href={hrefFor(item.path)}>
                  {item.label}
                </a>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
