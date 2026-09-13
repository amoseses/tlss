// GIVIT's own take on the "connected, flowing network" ambient motif seen on
// deeptech/AI marketing sites (nodes linked by lines, gently pulsing and
// flowing) -- reskinned around gifting/relationships rather than literal
// science/molecule imagery, in GIVIT's own ember/coral/teal palette. Drop
// into any dark hero as a background layer; percentage-style node
// coordinates against a fixed viewBox scale cleanly across every hero's own
// aspect ratio without distorting the (deliberately circular) nodes.
type Node = { x: number; y: number; r: number; color: string; delay: number };

const NODE_COLORS = ["var(--givit-ember)", "var(--givit-coral)", "var(--givit-teal)"];

const NODES: Node[] = [
  { x: 12, y: 22, r: 3.4, color: NODE_COLORS[0]!, delay: 0 },
  { x: 34, y: 58, r: 2.4, color: NODE_COLORS[1]!, delay: 0.7 },
  { x: 56, y: 26, r: 2.9, color: NODE_COLORS[2]!, delay: 1.3 },
  { x: 78, y: 60, r: 2.2, color: NODE_COLORS[0]!, delay: 0.3 },
  { x: 98, y: 20, r: 3.1, color: NODE_COLORS[1]!, delay: 1.9 },
  { x: 118, y: 55, r: 2.4, color: NODE_COLORS[2]!, delay: 1.0 },
  { x: 140, y: 24, r: 2.9, color: NODE_COLORS[0]!, delay: 0.5 },
];

const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 5],
];

export function AmbientNetwork({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      {LINKS.map(([a, b], i) => {
        const from = NODES[a]!;
        const to = NODES[b]!;
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="white"
            strokeOpacity="0.3"
            strokeWidth="0.3"
            className="ambient-network-line"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        );
      })}
      {NODES.map((node, i) => (
        <circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={node.color}
          className="ambient-network-node"
          style={{
            animationDelay: `${node.delay}s`,
            transformBox: "fill-box",
            transformOrigin: "center",
            filter: `drop-shadow(0 0 3px ${node.color})`,
          }}
        />
      ))}
    </svg>
  );
}
