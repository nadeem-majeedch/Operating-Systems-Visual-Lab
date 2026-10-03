import type { RagEdgeView, RagNodeView, RagStepData } from '@/engine';
import { cn } from '@/utils';

export interface RagGraphProps {
  readonly data: RagStepData;
  readonly className?: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

function processPositions(nodes: readonly RagNodeView[], height: number): Map<string, Point> {
  const processes = nodes.filter((node) => node.kind === 'process');
  const map = new Map<string, Point>();
  const top = 64;
  const span = height - top - 40;
  processes.forEach((node, index) => {
    const y = processes.length <= 1 ? height / 2 : top + (span * index) / (processes.length - 1);
    map.set(node.id, { x: 120, y });
  });
  return map;
}

function resourcePositions(
  nodes: readonly RagNodeView[],
  width: number,
  height: number,
): Map<string, Point> {
  const resources = nodes.filter((node) => node.kind === 'resource');
  const map = new Map<string, Point>();
  const top = 64;
  const span = height - top - 40;
  resources.forEach((node, index) => {
    const y = resources.length <= 1 ? height / 2 : top + (span * index) / (resources.length - 1);
    map.set(node.id, { x: width - 120, y });
  });
  return map;
}

function trim(from: Point, to: Point, fromRadius: number, toRadius: number): { start: Point; end: Point } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return {
    start: { x: from.x + ux * fromRadius, y: from.y + uy * fromRadius },
    end: { x: to.x - ux * toRadius, y: to.y - uy * toRadius },
  };
}

function edgeClass(kind: RagEdgeView['kind'], highlight: boolean): string {
  return cn('rag-edge', `rag-edge--${kind}`, highlight && 'is-highlight');
}

const WIDTH = 660;
const HEIGHT = 380;

/**
 * The resource-allocation graph.
 *
 * Processes are circles on the left, resource types are rectangles on the
 * right (with one dot per instance). Allocation edges point resource → process,
 * request edges point process → resource, and any edge that takes part in a
 * cycle is highlighted.
 */
export function RagGraph({ data, className }: RagGraphProps) {
  const processes = processPositions(data.nodes, HEIGHT);
  const resources = resourcePositions(data.nodes, WIDTH, HEIGHT);
  const radius = (id: string): number => (processes.has(id) ? 24 : 42);

  const waitNodes = data.nodes.filter((node) => node.kind === 'process');
  const waitCenter = { x: 210, y: 165 };
  const waitRadius = 105;
  const waitPositions = new Map<string, Point>();
  waitNodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(1, waitNodes.length) - Math.PI / 2;
    waitPositions.set(node.id, {
      x: waitCenter.x + waitRadius * Math.cos(angle),
      y: waitCenter.y + waitRadius * Math.sin(angle),
    });
  });

  return (
    <section className={cn('rag-graph', className)} aria-label="Resource allocation graph">
      <div className="rag-graph__figure">
        <svg
          className="rag-graph__canvas"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={
            data.deadlocked
              ? 'Resource allocation graph containing a cycle'
              : 'Resource allocation graph'
          }
        >
          <defs>
            <marker id="rag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="rag-arrow-head" />
            </marker>
          </defs>

          {data.edges.map((edge) => {
            const from = processes.get(edge.from) ?? resources.get(edge.from);
            const to = processes.get(edge.to) ?? resources.get(edge.to);
            if (!from || !to) return null;
            const { start, end } = trim(from, to, radius(edge.from), radius(edge.to));
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            return (
              <g key={edge.id} className={edgeClass(edge.kind, edge.highlight)}>
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} markerEnd="url(#rag-arrow)" />
                <text x={midX} y={midY - 4} className="rag-edge__label">
                  {edge.label}
                </text>
              </g>
            );
          })}

          {data.nodes.map((node) =>
            node.kind === 'process' ? (
              <g
                key={node.id}
                className={cn('rag-node', 'rag-node--process', node.tone && `is-${node.tone}`)}
                transform={`translate(${processes.get(node.id)?.x ?? 0}, ${processes.get(node.id)?.y ?? 0})`}
              >
                <circle r={24} />
                <text textAnchor="middle" dy="0.32em">
                  {node.name}
                </text>
              </g>
            ) : (
              <g
                key={node.id}
                className={cn('rag-node', 'rag-node--resource', node.tone && `is-${node.tone}`)}
                transform={`translate(${resources.get(node.id)?.x ?? 0}, ${resources.get(node.id)?.y ?? 0})`}
              >
                <rect x={-46} y={-24} width={92} height={48} rx={8} />
                <text textAnchor="middle" dy="-0.1em">
                  {node.name}
                </text>
                <text textAnchor="middle" dy="1.1em" className="rag-node__instances">
                  {node.free ?? 0}/{node.instances ?? 0} free
                </text>
              </g>
            ),
          )}
        </svg>
      </div>

      <div className="rag-graph__figure rag-graph__figure--wait">
        <svg
          className="rag-graph__canvas"
          viewBox="0 0 420 340"
          role="img"
          aria-label="Collapsed wait-for graph"
        >
          <defs>
            <marker id="rag-wait-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="rag-arrow-head" />
            </marker>
          </defs>
          {data.waitForEdges.map((edge) => {
            const from = waitPositions.get(edge.from);
            const to = waitPositions.get(edge.to);
            if (!from || !to) return null;
            const { start, end } = trim(from, to, 22, 22);
            return (
              <line
                key={edge.id}
                className={cn('rag-edge', 'rag-edge--wait', edge.cycle && 'is-highlight')}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                markerEnd="url(#rag-wait-arrow)"
              />
            );
          })}
          {waitNodes.map((node) => {
            const point = waitPositions.get(node.id);
            return (
              <g
                key={node.id}
                className={cn('rag-node', 'rag-node--process', node.tone && `is-${node.tone}`)}
                transform={`translate(${point?.x ?? 0}, ${point?.y ?? 0})`}
              >
                <circle r={22} />
                <text textAnchor="middle" dy="0.32em">
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="rag-graph__caption">
          {data.singleInstance
            ? 'Wait-for graph — one instance per resource, so a cycle is a deadlock.'
            : 'Wait-for graph — with multiple instances a cycle is only a hint.'}
        </p>
      </div>
    </section>
  );
}
