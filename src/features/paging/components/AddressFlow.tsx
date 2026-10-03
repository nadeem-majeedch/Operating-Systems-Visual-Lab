import type { PagingStepData } from '@/engine';
import { formatBinary, formatHex } from '@/engine';
import { cn } from '@/utils';

export interface AddressFlowProps {
  readonly data: PagingStepData;
  readonly className?: string;
}

interface Bits {
  readonly value: number;
  readonly bits: number;
  readonly label: string;
  readonly kind: string;
}

function BitField({ bits }: { readonly bits: readonly Bits[] }) {
  const visible = bits.filter((field) => field.bits > 0);
  if (visible.length === 0) return null;
  return (
    <div className="addr-bits">
      {visible.map((field) => (
        <span
          key={field.kind}
          className={cn('addr-bits__field', `addr-bits__field--${field.kind}`)}
          style={{ flexGrow: field.bits, flexBasis: 0 }}
        >
          <span className="addr-bits__label">{field.label}</span>
          <span className="addr-bits__value">{formatBinary(field.value, field.bits)}</span>
        </span>
      ))}
    </div>
  );
}

function stage(event: PagingStepData['event'], active: PagingStepData['event']): string {
  if (event === active) return 'is-active';
  return '';
}

/**
 * The translation flow, drawn as a vertical pipeline: logical address → page
 * number + offset → page table → frame number + offset → physical address. Each
 * stage lights up as the corresponding step runs, and the bit-field bars show
 * exactly which bits move where.
 */
export function AddressFlow({ data, className }: AddressFlowProps) {
  const logicalBits = data.pageBits + data.offsetBits;
  const physicalBits = data.frameBits + data.offsetBits;
  const active = data.event;

  return (
    <section className={cn('paging-flow', className)} aria-label="Address translation flow">
      <header className="paging-flow__header">
        <h4 className="paging-flow__title">
          {data.referenceIndex >= 0 ? `Reference ${data.referenceIndex + 1}` : 'Translation pipeline'}
        </h4>
        {data.invalid ? (
          <span className="deadlock-flag is-danger">Address rejected</span>
        ) : data.faulted ? (
          <span className="deadlock-flag is-warning">Page fault</span>
        ) : data.tlbOutcome === 'hit' ? (
          <span className="deadlock-flag is-positive">TLB hit</span>
        ) : data.tlbOutcome === 'miss' ? (
          <span className="deadlock-flag is-neutral">TLB miss</span>
        ) : null}
      </header>

      <ol className="paging-flow__stages">
        <li className={cn('paging-stage', stage('decompose', active))}>
          <span className="paging-stage__tag">Logical address</span>
          <div className="paging-stage__body">
            <strong className="paging-stage__value">
              {data.logicalAddress} · {formatHex(data.logicalAddress, logicalBits)}
            </strong>
            <BitField
              bits={[
                { value: data.logicalAddress, bits: logicalBits, label: `logical (${logicalBits} bits)`, kind: 'logical' },
              ]}
            />
          </div>
        </li>

        <li className="paging-flow__arrow" aria-hidden="true">
          split at {data.offsetBits} bits ↓
        </li>

        <li className={cn('paging-stage', stage('decompose', active))}>
          <span className="paging-stage__tag">Page number + offset</span>
          <div className="paging-stage__body">
            <BitField
              bits={[
                { value: data.pageNumber, bits: data.pageBits, label: 'page number', kind: 'page' },
                { value: data.offset, bits: data.offsetBits, label: 'offset', kind: 'offset' },
              ]}
            />
            <p className="paging-stage__calc">
              {data.logicalAddress} ÷ {2 ** data.offsetBits} → page {data.pageNumber}, offset {data.offset}
            </p>
          </div>
        </li>

        <li className="paging-flow__arrow" aria-hidden="true">
          look up page {data.pageNumber} ↓
        </li>

        <li className={cn('paging-stage', stage('tlb', active), stage('page-table', active))}>
          <span className="paging-stage__tag">TLB &amp; page table</span>
          <div className="paging-stage__body">
            <p className="paging-stage__calc">
              {data.tlbOutcome === 'hit'
                ? `TLB hit — frame ${data.frameNumber}`
                : data.tlbOutcome === 'miss'
                  ? data.pagePresent === false
                    ? 'TLB miss — valid bit clear, page fault'
                    : `TLB miss — page table says frame ${data.frameNumber}`
                  : 'not yet looked up'}
            </p>
            {data.faulted ? (
              <p className="paging-stage__calc paging-stage__calc--warning">
                {data.victimPage === null
                  ? 'loaded into a free frame'
                  : `evicted page ${data.victimPage} from frame ${data.victimFrame}`}
              </p>
            ) : null}
          </div>
        </li>

        <li className="paging-flow__arrow" aria-hidden="true">
          frame + offset ↓
        </li>

        <li className={cn('paging-stage', stage('address', active))}>
          <span className="paging-stage__tag">Frame number + offset</span>
          <div className="paging-stage__body">
            {data.frameNumber === null ? (
              <p className="paging-stage__calc paging-stage__calc--muted">no frame assigned</p>
            ) : (
              <>
                <BitField
                  bits={[
                    { value: data.frameNumber, bits: data.frameBits, label: 'frame number', kind: 'frame' },
                    { value: data.offset, bits: data.offsetBits, label: 'offset', kind: 'offset' },
                  ]}
                />
                <p className="paging-stage__calc">
                  frame {data.frameNumber} × {2 ** data.offsetBits} + offset {data.offset} ={' '}
                  {data.physicalAddress}
                </p>
              </>
            )}
          </div>
        </li>

        <li className="paging-flow__arrow" aria-hidden="true">
          recombine ↓
        </li>

        <li
          className={cn(
            'paging-stage paging-stage--physical',
            stage('address', active),
            data.invalid && 'is-rejected',
          )}
        >
          <span className="paging-stage__tag">Physical address</span>
          <div className="paging-stage__body">
            {data.physicalAddress === null ? (
              <p className="paging-stage__calc paging-stage__calc--muted">
                {data.invalid ? 'translation aborted' : 'not yet translated'}
              </p>
            ) : (
              <>
                <strong className="paging-stage__value">
                  {data.physicalAddress} · {formatHex(data.physicalAddress, physicalBits)}
                </strong>
                <BitField
                  bits={[
                    {
                      value: data.physicalAddress,
                      bits: physicalBits,
                      label: `physical (${physicalBits} bits)`,
                      kind: 'physical',
                    },
                  ]}
                />
              </>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}
