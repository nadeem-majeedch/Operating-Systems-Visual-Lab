import type { FsInodeView, FsStepData } from '@/engine';
import { cn } from '@/utils';
import { formatBytes } from '../fsPresentation';

export interface InodeTableProps {
  readonly data: FsStepData;
  readonly className?: string;
}

/** Compact rendering of an inode's block pointers. */
function pointerLabel(inode: FsInodeView): string {
  if (!inode.used) return '—';
  if (inode.dataBlocks.length === 0) return '—';
  const list = inode.dataBlocks.join(', ');
  return inode.indexBlocks.length > 0 ? `${list} + index ${inode.indexBlocks.join(', ')}` : list;
}

/**
 * The inode table.
 *
 * Each row is one metadata record: type, path, size, mode, link count, open
 * count and the block pointers that actually locate the data. `start` is the
 * first block for contiguous and linked files; indexed files list every pointer
 * and call out the extra index block when the file outgrows the direct pointers.
 */
export function InodeTable({ data, className }: InodeTableProps) {
  return (
    <section className={cn('fs-inodes', className)} aria-label="Inode table">
      <header className="fs-inodes__header">
        <h4 className="fs-inodes__title">Inode table</h4>
        <span className="fs-inodes__meta">
          {data.usedInodes} of {data.usedInodes + data.freeInodes} inodes in use
        </span>
      </header>

      <div className="data-table__scroll">
        <table className="data-table fs-inodes__table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Type</th>
              <th scope="col">Path</th>
              <th scope="col">Size</th>
              <th scope="col">Mode</th>
              <th scope="col">Links</th>
              <th scope="col">Open</th>
              <th scope="col">Block pointers</th>
            </tr>
          </thead>
          <tbody>
            {data.inodes.map((inode) => (
              <tr
                key={inode.number}
                className={cn(!inode.used && 'is-unused', inode.active && 'is-active')}
              >
                <th scope="row">{inode.number}</th>
                <td>{inode.used ? (inode.type === 'dir' ? 'dir' : 'file') : 'free'}</td>
                <td className="fs-inodes__path">{inode.path ?? '—'}</td>
                <td>{inode.used ? formatBytes(inode.size) : '—'}</td>
                <td className="fs-inodes__mode">
                  {inode.used ? (
                    <>
                      <span className="fs-inodes__octal">{inode.mode.toString(8).padStart(3, '0')}</span>{' '}
                      {inode.permissions}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{inode.links}</td>
                <td>{inode.openCount > 0 ? inode.openCount : '—'}</td>
                <td className="fs-inodes__blocks">{pointerLabel(inode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
