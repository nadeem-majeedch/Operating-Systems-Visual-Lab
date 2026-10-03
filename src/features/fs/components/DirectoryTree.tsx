import type { FsStepData } from '@/engine';
import { cn } from '@/utils';
import { formatBytes } from '../fsPresentation';

export interface DirectoryTreeProps {
  readonly data: FsStepData;
  readonly className?: string;
}

/**
 * The directory tree, drawn from the preorder node list the engine emits.
 *
 * Depth is the only thing that changes the layout — each row is indented by its
 * `depth`, so a rename or move visibly relocates an entry while its inode number
 * (and therefore its identity) stays put.
 */
export function DirectoryTree({ data, className }: DirectoryTreeProps) {
  return (
    <section className={cn('fs-tree', className)} aria-label="Directory tree">
      <header className="fs-tree__header">
        <h4 className="fs-tree__title">Directory tree</h4>
        <span className="fs-tree__meta">
          {data.nodes.length} entr{data.nodes.length === 1 ? 'y' : 'ies'}
        </span>
      </header>

      <ul className="fs-tree__list" role="tree" aria-label="Files and directories">
        {data.nodes.map((node) => (
          <li
            key={node.id}
            role="treeitem"
            aria-level={node.depth + 1}
            className={cn(
              'fs-tree__row',
              node.type === 'dir' ? 'is-dir' : 'is-file',
              node.active && 'is-active',
              node.open && 'is-open',
            )}
            style={{ paddingLeft: `${node.depth * 1.1}rem` }}
          >
            <span className="fs-tree__icon" aria-hidden="true">
              {node.type === 'dir' ? (node.open ? '📂' : '📁') : '📄'}
            </span>
            <span className="fs-tree__name">{node.name || '/'}</span>
            <span className="fs-tree__inode" title={`inode ${node.inode}`}>
              inode {node.inode}
            </span>
            <span className="fs-tree__perms" title={node.permissions}>
              {node.permissions}
            </span>
            {node.type === 'file' ? (
              <span className="fs-tree__size">{formatBytes(node.size)}</span>
            ) : null}
            {node.blockCount > 0 ? (
              <span className="fs-tree__blocks">
                {node.blockCount} block{node.blockCount === 1 ? '' : 's'}
              </span>
            ) : null}
            {node.open ? <span className="fs-tree__badge">open</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
