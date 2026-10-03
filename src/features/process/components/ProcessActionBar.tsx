import { Button } from '@/components';
import { TRANSITION_RULES, runningProcess, transitionProblem } from '@/engine';
import type { ProcessAction, ProcessControlBlock, ProcessSystem, ProcessTransition } from '@/engine';

export interface ProcessActionBarProps {
  readonly system: ProcessSystem;
  readonly selected: ProcessControlBlock | undefined;
  readonly onAction: (action: ProcessAction) => void;
  readonly onReset: () => void;
}

const TRANSITIONS: readonly ProcessTransition[] = [
  'admit',
  'dispatch',
  'preempt',
  'block',
  'unblock',
  'terminate',
];

/** Literal-preserving action factories, so the union discriminant stays narrow. */
const TRANSITION_ACTIONS: Record<ProcessTransition, (pid: number) => ProcessAction> = {
  admit: (pid) => ({ kind: 'admit', pid }),
  dispatch: (pid) => ({ kind: 'dispatch', pid }),
  preempt: (pid) => ({ kind: 'preempt', pid }),
  block: (pid) => ({ kind: 'block', pid }),
  unblock: (pid) => ({ kind: 'unblock', pid }),
  terminate: (pid) => ({ kind: 'terminate', pid }),
};

/** Why a transition button is disabled, or `null` when it can be pressed. */
function blockedReason(
  system: ProcessSystem,
  process: ProcessControlBlock | undefined,
  transition: ProcessTransition,
): string | null {
  if (!process) return 'Select a process first.';
  const problem = transitionProblem(process.state, transition);
  if (problem) return problem;
  if (transition === 'dispatch') {
    const running = runningProcess(system);
    if (running && running.pid !== process.pid) {
      return `${running.name} is on the CPU. Preempt or block it first.`;
    }
  }
  return null;
}

/**
 * The kernel controls.
 *
 * Every button maps to exactly one legal transition, and a disabled button
 * states the reason in its tooltip — so an illegal move is explained rather than
 * silently hidden.
 */
export function ProcessActionBar({ system, selected, onAction, onReset }: ProcessActionBarProps) {
  const readyCount = system.processes.filter((process) => process.state === 'ready').length;
  const running = runningProcess(system);
  const schedulePossible = readyCount > 0 || running !== undefined;

  return (
    <section className="process-actions" aria-label="Process actions">
      <div className="process-actions__group">
        <span className="process-actions__group-label">Transitions</span>
        <div className="process-actions__buttons">
          {TRANSITIONS.map((transition) => {
            const reason = blockedReason(system, selected, transition);
            const rule = TRANSITION_RULES[transition];
            return (
              <Button
                key={transition}
                size="sm"
                disabled={reason !== null}
                title={reason ?? rule.explanation}
                onClick={() => {
                  if (selected) onAction(TRANSITION_ACTIONS[transition](selected.pid));
                }}
              >
                {rule.verb}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="process-actions__group">
        <span className="process-actions__group-label">Scheduler</span>
        <div className="process-actions__buttons">
          <Button
            size="sm"
            variant="primary"
            disabled={!schedulePossible}
            title={
              schedulePossible
                ? 'Let the priority scheduler choose the next process to run.'
                : 'Nothing is ready and the CPU is idle.'
            }
            onClick={() => onAction({ kind: 'schedule' })}
          >
            Scheduler next
          </Button>
          <Button
            size="sm"
            title="Advance the clock one time unit; the running process consumes CPU time."
            onClick={() => onAction({ kind: 'tick', units: 1 })}
          >
            Tick +1
          </Button>
          <Button
            size="sm"
            title="Advance the clock five time units."
            onClick={() => onAction({ kind: 'tick', units: 5 })}
          >
            Tick +5
          </Button>
        </div>
      </div>

      <div className="process-actions__group process-actions__group--end">
        <Button size="sm" variant="ghost" onClick={onReset} title="Remove every process and reset the clock.">
          Reset system
        </Button>
      </div>
    </section>
  );
}
