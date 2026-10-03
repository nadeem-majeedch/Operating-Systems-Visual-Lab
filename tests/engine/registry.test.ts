import { describe, expect, it } from 'vitest';
import {
  getEngineDescriptor,
  isSimulationImplemented,
  listEngineDescriptors,
  listImplementedAlgorithmIds,
} from '@/engine';

describe('engine registry', () => {
  it('registers the FCFS engine', () => {
    const descriptor = getEngineDescriptor('fcfs');
    expect(descriptor).toBeDefined();
    expect(descriptor?.implemented).toBe(true);
    expect(descriptor?.labId).toBe('lab-fcfs');
  });

  it('reports implemented algorithms', () => {
    expect(isSimulationImplemented('fcfs')).toBe(true);
    expect(isSimulationImplemented('bankers-algorithm')).toBe(true);
    expect(isSimulationImplemented('wait-for-graph')).toBe(true);
    expect(isSimulationImplemented('address-translation')).toBe(true);
    expect(isSimulationImplemented('fifo-page')).toBe(true);
    expect(isSimulationImplemented('optimal-page')).toBe(true);
    expect(isSimulationImplemented('lru-page')).toBe(true);
    expect(isSimulationImplemented('clock-page')).toBe(true);
    expect(isSimulationImplemented('fcfs-disk')).toBe(true);
    expect(isSimulationImplemented('sstf')).toBe(true);
    expect(isSimulationImplemented('scan')).toBe(true);
    expect(isSimulationImplemented('c-scan')).toBe(true);
    expect(isSimulationImplemented('look')).toBe(true);
    expect(isSimulationImplemented('c-look')).toBe(true);
    expect(isSimulationImplemented('contiguous-allocation')).toBe(true);
    expect(isSimulationImplemented('linked-allocation')).toBe(true);
    expect(isSimulationImplemented('indexed-allocation')).toBe(true);
    expect(listImplementedAlgorithmIds()).toContain('fcfs');
  });

  it('returns undefined for unknown algorithms', () => {
    expect(getEngineDescriptor('does-not-exist')).toBeUndefined();
  });

  it('keeps descriptors uniquely keyed', () => {
    const descriptors = listEngineDescriptors();
    const algorithmIds = descriptors.map((descriptor) => descriptor.algorithmId);
    expect(new Set(algorithmIds).size).toBe(algorithmIds.length);
  });
});
