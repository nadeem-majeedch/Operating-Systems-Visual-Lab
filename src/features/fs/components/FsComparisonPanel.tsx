import { useMemo } from 'react';
import {
  ALLOCATION_LABELS,
  FS_STRATEGY_PROFILES,
  compareFsAllocation,
  type AllocationStrategy,
  type FsOperation,
} from '@/engine';
import { cn, formatNumber } from '@/utils';

export interface FsComparisonPanelProps {
  readonly blockCount: number;
  readonly blockSize: number;
  readonly inodeCount: number;
  readonly operations: readonly FsOperation[];
  readonly className?: string;
}

/**
 * Comparison mode: the same script run under all three allocation strategies.
 *
 * The number that matters is how many operations succeed — contiguous allocation
 * drops the ones that need a run it cannot find, while linked and indexed keep
 * going until the volume truly runs out of room or inodes.
 */
export function FsComparisonPanel({
  blockCount,
  blockSize,
  inodeCount,
  operations,
  className,
}: FsComparisonPanelProps) {
  const outcomes = useMemo(
    () => compareFsAllocation({ blockCount, blockSize, inodeCount, operations }),
    [blockCount, blockSize, inodeCount, operations],
  );

  const best = outcomes.length > 0 ? Math.max(...outcomes.map((outcome) => outcome.succeeded)) : 0;
  const total = outcomes.reduce((sum, outcome) => sum + outcome.steps, 0);

  return (
    <section className={cn('fs-compare', className)} aria-label="Allocation comparison">
      <header className="fs-compare__header">
        <h4 className="fs-compare__title">Same script, every strategy</h4>
        <span className="fs-compare__meta">
          {blockCount} blocks × {blockSize} B · {inodeCount} inodes · {operations.length} operation
          {operations.length === 1 ? '' : 's'}
        </span>
      </header>

      {operations.length === 0 ? (
        <p className="fs-compare__empty">Add operations in Simulate mode to compare strategies.</p>
      ) : (
        <div className="data-table__scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Strategy</th>
                <th scope="col">Succeeded</th>
                <th scope="col">Refused</th>
                <th scope="col">Used blocks</th>
                <th scope="col">Free blocks</th>
                <th scope="col">Inodes</th>
                <th scope="col">Failures</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome) => (
                <tr key={outcome.strategy} className={cn(outcome.succeeded === best && 'is-best')}>
                  <th scope="row">
                    {ALLOCATION_LABELS[outcome.strategy as AllocationStrategy]}
                  </th>
                  <td className="fs-compare__strong">
                    {formatNumber(outcome.succeeded, 0)}
                    {outcome.succeeded === best && outcome.failed === 0 ? (
                      <span className="fs-compare__flag">all</span>
                    ) : null}
                  </td>
                  <td className={cn(outcome.failed > 0 && 'fs-compare__refused')}>
                    {formatNumber(outcome.failed, 0)}
                  </td>
                  <td>{formatNumber(outcome.usedBlocks, 0)}</td>
                  <td>{formatNumber(outcome.freeBlocks, 0)}</td>
                  <td>{formatNumber(outcome.usedInodes, 0)}</td>
                  <td className="fs-compare__failures">
                    {outcome.failures.length > 0 ? outcome.failures.join('; ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="fs-compare__note">
        Contiguous allocation is the only strategy that can refuse an operation while free blocks
        remain — external fragmentation. Linked and indexed allocation keep allocating until the
        bitmap or the inode table is genuinely empty. {total} steps were produced in total.
      </p>

      <div className="fs-compare__profiles">
        <h5 className="fs-compare__profiles-title">The design space</h5>
        <p className="fs-compare__profiles-lead">
          The live table above is one script; this is the property that holds for every script.
          Notice the trade: contiguous allocation buys the cheapest reads and pays with fragmentation
          and inflexible growth, while linked and indexed allocation trade pointer overhead for the
          freedom to use any free block.
        </p>
        <div className="data-table__scroll">
          <table className="data-table fs-compare__profile-table">
            <thead>
              <tr>
                <th scope="col">Strategy</th>
                <th scope="col">Sequential read</th>
                <th scope="col">Random read</th>
                <th scope="col">Growth</th>
                <th scope="col">External fragmentation</th>
                <th scope="col">Overhead</th>
              </tr>
            </thead>
            <tbody>
              {FS_STRATEGY_PROFILES.map((profile) => (
                <tr key={profile.strategy}>
                  <th scope="row">{ALLOCATION_LABELS[profile.strategy as AllocationStrategy]}</th>
                  <td>{profile.sequential}</td>
                  <td>{profile.random}</td>
                  <td>{profile.growth}</td>
                  <td>{profile.fragmentation}</td>
                  <td>{profile.overhead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
