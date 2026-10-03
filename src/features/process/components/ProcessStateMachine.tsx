import { useId } from 'react';
import { PROCESS_STATES, PROCESS_STATE_INFO, countByState, findProcess } from '@/engine';
import type { ProcessEvent, ProcessState, ProcessSystem, ProcessTransition } from '@/engine';
import { cn } from '@/utils';
import { STATE_COLOR, stateLabel } from '../processPresentation';

export interface ProcessStateMachineProps {
  readonly system: ProcessSystem;
  /** Most recent event, used to animate the transition it describes. */
  readonly event: ProcessEvent | null;
  readonly selectedPid: number | null;
  readonly className?: string;
}

const NODE_W = 138;
const NODE_H = 54;

const LAYOUT: Record<ProcessState, { x: number; y: number }> = {
  new: { x: 16, y: 54 },
  ready: { x: 190, y: 54 },
  running: { x: 364, y: 54 },
  terminated: { x: 538, y: 54 },
  waiting: { x: 364, y: 190 },
};

interface Edge {
  readonly transition: ProcessTransition;
  readonly path: string;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
}

/**
 * Every edge of the state machine, laid out so the diagram reads exactly like
 * the textbook figure: New → Ready → Running → Terminated across the top, with
 * Waiting hanging underneath and looping back to Ready.
 */
const EDGES: readonly Edge[] = [
  { transition: 'admit', path: 'M 154 81 L 190 81', label: 'admit', labelX: 172, labelY: 81 },
  { transition: 'dispatch', path: 'M 328 81 L 364 81', label: 'dispatch', labelX: 346, labelY: 81 },
  { transition: 'terminate', path: 'M 502 81 L 538 81', label: 'terminate', labelX: 520, labelY: 81 },
  { transition: 'block', path: 'M 433 108 L 433 190', label: 'block', labelX: 448, labelY: 149 },
  { transition: 'unblock', path: 'M 364 217 L 310 217 L 310 108', label: 'unblock', labelX: 322, labelY: 150 },
  { transition: 'preempt', path: 'M 433 54 C 433 6 259 6 259 54', label: 'preempt', labelX: 346, labelY: 18 },
];

function describe(system: ProcessSystem): string {
  const parts = PROCESS_STATES.map(
    (state) => `${PROCESS_STATE_INFO[state].label} ${countByState(system, state)}`,
  );
  return `Process state machine. ${parts.join(', ')}.`;
}

/**
 * The process state machine, drawn as SVG.
 *
 * Each state shows how many processes are in it, the selected process's current
 * state is emphasised, and the most recent transition animates a token along its
 * edge so the learner can see the move rather than infer it.
 */
export function ProcessStateMachine({
  system,
  event,
  selectedPid,
  className,
}: ProcessStateMachineProps) {
  const idPrefix = useId().replace(/:/g, '');
  const arrowId = `${idPrefix}-arrow`;
  const arrowActiveId = `${idPrefix}-arrow-active`;

  const selected = selectedPid === null ? undefined : findProcess(system, selectedPid);
  const active = event?.transition ?? null;
  const activeEdge = active ? EDGES.find((edge) => edge.transition === active) : undefined;

  return (
    <section className={cn('state-machine', className)} aria-label="Process state machine">
      <svg
        className="state-machine__svg"
        viewBox="0 0 700 290"
        role="img"
        aria-label={describe(system)}
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="psm-arrowhead" />
          </marker>
          <marker
            id={arrowActiveId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="psm-arrowhead psm-arrowhead--active" />
          </marker>
        </defs>

        {EDGES.map((edge) => {
          const isActive = active === edge.transition;
          return (
            <g key={edge.transition} className={cn('psm-edge', isActive && 'psm-edge--active')}>
              <path
                className="psm-edge__path"
                d={edge.path}
                markerEnd={`url(#${isActive ? arrowActiveId : arrowId})`}
              />
              <g className="psm-edge__label">
                <rect
                  x={edge.labelX - edge.label.length * 3.4 - 5}
                  y={edge.labelY - 8}
                  width={edge.label.length * 6.8 + 10}
                  height={16}
                  rx={5}
                />
                <text x={edge.labelX} y={edge.labelY + 4}>
                  {edge.label}
                </text>
              </g>
            </g>
          );
        })}

        {PROCESS_STATES.map((state) => {
          const { x, y } = LAYOUT[state];
          const count = countByState(system, state);
          const isSelected = selected?.state === state;
          const isInvolved = event?.fromState === state || event?.toState === state;
          return (
            <g
              key={state}
              className={cn(
                'psm-node',
                isInvolved && 'psm-node--involved',
                isSelected && 'psm-node--selected',
              )}
              style={{ ['--state-color' as string]: STATE_COLOR[state] }}
            >
              <title>{PROCESS_STATE_INFO[state].description}</title>
              <rect className="psm-node__box" x={x} y={y} width={NODE_W} height={NODE_H} rx={12} />
              <text className="psm-node__label" x={x + NODE_W / 2} y={y + 23}>
                {stateLabel(state)}
              </text>
              <text className="psm-node__count" x={x + NODE_W / 2} y={y + 41}>
                {count} {count === 1 ? 'process' : 'processes'}
              </text>
            </g>
          );
        })}

        {activeEdge ? (
          <circle key={event?.id ?? 'token'} className="psm-token" r={6}>
            <animateMotion dur="0.7s" fill="freeze" path={activeEdge.path} begin="0s" />
          </circle>
        ) : null}
      </svg>
    </section>
  );
}
