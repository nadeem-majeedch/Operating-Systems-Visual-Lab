import { PROCESS_STATE_INFO, TRANSITION_RULES } from './states';
import type { ProcessState, ProcessTransition } from './types';

/** The state a transition leads to. */
export function transitionTarget(transition: ProcessTransition): ProcessState {
  return TRANSITION_RULES[transition].to;
}

/** The state a transition must start from. */
export function transitionSource(transition: ProcessTransition): ProcessState {
  return TRANSITION_RULES[transition].from;
}

/** Is this transition legal from the given state? */
export function canTransition(state: ProcessState, transition: ProcessTransition): boolean {
  return TRANSITION_RULES[transition].from === state;
}

/** Every legal transition out of a state, in display order. */
export function legalTransitions(state: ProcessState): ProcessTransition[] {
  return (Object.keys(TRANSITION_RULES) as ProcessTransition[]).filter((transition) =>
    canTransition(state, transition),
  );
}

/**
 * Human-readable reason a transition is not allowed, or `null` when it is.
 *
 * Returned as prose so the UI can surface it directly rather than translating an
 * error code, and so the message names the exact states involved.
 */
export function transitionProblem(
  state: ProcessState,
  transition: ProcessTransition,
): string | null {
  if (canTransition(state, transition)) return null;
  const rule = TRANSITION_RULES[transition];
  const from = PROCESS_STATE_INFO[state].label;
  const expected = PROCESS_STATE_INFO[rule.from].label;
  const target = PROCESS_STATE_INFO[rule.to].label;
  return `“${rule.verb}” moves a process from ${expected} to ${target}, but this process is ${from}.`;
}

/** True when the transition ends the process. */
export function isTerminal(transition: ProcessTransition): boolean {
  return transition === 'terminate';
}
