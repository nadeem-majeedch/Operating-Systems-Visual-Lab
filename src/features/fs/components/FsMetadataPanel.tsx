import type { FsStepData } from '@/engine';
import { cn } from '@/utils';
import { formatBytes } from '../fsPresentation';

export interface FsMetadataPanelProps {
  readonly data: FsStepData;
  readonly className?: string;
}

function stamp(value: number): string {
  return `t${value}`;
}

/**
 * Metadata for the file or directory the current step acted on.
 *
 * This is the inode drawn as a person would read it: identity (number, type,
 * path), attributes (size, mode, link and open counts), the block pointers that
 * map the file onto the disk, and the three timestamps every inode carries.
 */
export function FsMetadataPanel({ data, className }: FsMetadataPanelProps) {
  const inode = data.inodes.find((item) => item.number === data.activeInode);

  return (
    <section className={cn('fs-meta', className)} aria-label="File metadata">
      <header className="fs-meta__header">
        <h4 className="fs-meta__title">File metadata</h4>
        <span className="fs-meta__meta">
          {data.activePath ? data.activePath : 'no file selected'}
        </span>
      </header>

      {!inode || !inode.used ? (
        <p className="fs-meta__empty">
          Run an operation to inspect the inode it touched — its size, permissions, block pointers
          and timestamps appear here.
        </p>
      ) : (
        <>
          <dl className="fs-meta__facts">
            <div>
              <dt>Inode</dt>
              <dd>{inode.number}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{inode.type === 'dir' ? 'directory' : 'regular file'}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd className="fs-meta__path">{inode.path}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{formatBytes(inode.size)}</dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd className="fs-meta__mode">
                <span className="fs-inodes__octal">{inode.mode.toString(8).padStart(3, '0')}</span>{' '}
                {inode.permissions}
              </dd>
            </div>
            <div>
              <dt>Links</dt>
              <dd>{inode.links}</dd>
            </div>
            <div>
              <dt>Open count</dt>
              <dd>{inode.openCount}</dd>
            </div>
            <div>
              <dt>Start block</dt>
              <dd>{inode.start ?? '—'}</dd>
            </div>
          </dl>

          <div className="fs-meta__pointers">
            <span className="fs-meta__label">Block pointers</span>
            {inode.dataBlocks.length === 0 ? (
              <p className="fs-meta__empty">This entry owns no data blocks.</p>
            ) : (
              <ol className="fs-meta__pointer-list">
                {inode.dataBlocks.map((block, position) => (
                  <li key={`${block}-${position}`} className="fs-pointer">
                    <span className="fs-pointer__pos">#{position}</span>
                    <span className="fs-pointer__block">{block}</span>
                  </li>
                ))}
                {inode.indexBlocks.map((block) => (
                  <li key={`index-${block}`} className="fs-pointer is-index">
                    <span className="fs-pointer__pos">idx</span>
                    <span className="fs-pointer__block">{block}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <dl className="fs-meta__stamps">
            <div>
              <dt>Created</dt>
              <dd>{stamp(inode.created)}</dd>
            </div>
            <div>
              <dt>Modified</dt>
              <dd>{stamp(inode.modified)}</dd>
            </div>
            <div>
              <dt>Accessed</dt>
              <dd>{stamp(inode.accessed)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
