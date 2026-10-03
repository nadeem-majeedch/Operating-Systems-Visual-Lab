import type { ProcessLifecycleInput } from './types';

export interface ProcessScenePreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: ProcessLifecycleInput;
}

/**
 * Predefined scenarios for the lifecycle lab.
 *
 * A preset seeds a system; the learner then drives it. The `script` on a preset
 * is optional and only used so `run()` can demonstrate a complete, deterministic
 * walkthrough in tests and content tooling.
 */
export const PROCESS_SCENE_PRESETS: readonly ProcessScenePreset[] = [
  {
    id: 'single-lifecycle',
    name: 'Single process',
    description: 'One process walks new → ready → running → terminated.',
    input: {
      seeds: [{ name: 'P1', priority: 3, burstTime: 3 }],
      script: [
        { action: 'admit', name: 'P1' },
        { action: 'dispatch', name: 'P1' },
        { action: 'tick', units: 3 },
      ],
    },
  },
  {
    id: 'io-wait',
    name: 'Block on I/O',
    description: 'A running process blocks on I/O and another is dispatched behind it.',
    input: {
      seeds: [
        { name: 'P1', priority: 2, burstTime: 4 },
        { name: 'P2', priority: 4, burstTime: 3 },
      ],
      script: [
        { action: 'admit', name: 'P1' },
        { action: 'admit', name: 'P2' },
        { action: 'dispatch', name: 'P1' },
        { action: 'tick', units: 1 },
        { action: 'block', name: 'P1' },
        { action: 'schedule' },
        { action: 'tick', units: 2 },
        { action: 'unblock', name: 'P1' },
      ],
    },
  },
  {
    id: 'fork-tree',
    name: 'Fork tree',
    description: 'A parent process creates two children, each with its own PCB.',
    input: {
      seeds: [
        { name: 'init', priority: 1, burstTime: 5 },
        { name: 'P1', priority: 3, burstTime: 2, parent: 'init' },
        { name: 'P2', priority: 6, burstTime: 2, parent: 'init' },
      ],
      script: [
        { action: 'admit', name: 'init' },
        { action: 'admit', name: 'P1' },
        { action: 'admit', name: 'P2' },
        { action: 'schedule' },
        { action: 'tick', units: 2 },
        { action: 'schedule' },
        { action: 'tick', units: 2 },
        { action: 'schedule' },
      ],
    },
  },
];

export function findScenePreset(id: string): ProcessScenePreset | undefined {
  return PROCESS_SCENE_PRESETS.find((preset) => preset.id === id);
}
