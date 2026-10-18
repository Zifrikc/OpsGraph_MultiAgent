"use client";
import type { Graph } from "@/lib/useOpsGraph";
export default function Topology({
  graph,
  affected,
  incident,
  selected,
  onSelect,
  focus,
}: {
  graph: Graph;
  affected: string[];
  incident: boolean;
  selected: string;
  onSelect: (id: string) => void;
  focus: boolean;
}) {
  const services = graph.services;
  const edges = graph.edges
    .map((e) => [
      services.findIndex((s) => s.id === e.source),
      services.findIndex((s) => s.id === e.target),
    ])
    .filter(([a, b]) => a >= 0 && b >= 0);
  return (
    <svg
      className="topology"
      viewBox="0 0 920 590"
      role="group"
      aria-label="Mapa de dependencias de ocho servicios simulados"
    >
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#303543" />
        </pattern>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#62697c" />
        </marker>
        <marker
          id="bad-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#fb9b67" />
        </marker>
      </defs>
      <rect width="920" height="590" fill="url(#dots)" opacity=".5" />
      {edges.map(([a, b]) => {
        const source = services[a],
          target = services[b];
        const bad =
          incident &&
          affected.includes(source.id) &&
          affected.includes(target.id);
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        return (
          <g key={a + "-" + b} opacity={focus && !bad ? 0.15 : 1}>
            <line
              x1={source.x + Math.cos(angle) * 36}
              y1={source.y + Math.sin(angle) * 36}
              x2={target.x - Math.cos(angle) * 43}
              y2={target.y - Math.sin(angle) * 43}
              stroke={bad ? "#fb9b67" : "#434b60"}
              strokeWidth={bad ? 2 : 1.5}
              strokeDasharray={
                target.id === "notification-service" ? "5 5" : undefined
              }
              markerEnd={`url(#${bad ? "bad-arrow" : "arrow"})`}
            />
            {bad && (
              <circle className="flow-particle" r="3" fill="#ffc49b">
                <animateMotion
                  dur="2.5s"
                  repeatCount="indefinite"
                  path={`M${source.x},${source.y} L${target.x},${target.y}`}
                />
              </circle>
            )}
          </g>
        );
      })}
      {services.map((s, i) => {
        const bad = incident && affected.includes(s.id);
        const root = bad && s.id === "bank-connector";
        return (
          <g
            key={s.id}
            className="graph-node"
            role="button"
            tabIndex={0}
            aria-label={`${s.label}, ${root ? "con error" : bad ? "impactado" : "saludable"}`}
            onClick={() => onSelect(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s.id);
              }
            }}
            opacity={focus && !bad ? 0.22 : 1}
          >
            {(selected === s.id || root) && (
              <circle
                cx={s.x}
                cy={s.y}
                r="48"
                fill="none"
                stroke={root ? "#ff7c83" : "#9d8dff"}
                strokeOpacity=".5"
                strokeDasharray={root ? "4 5" : undefined}
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r="35"
              fill={root ? "#422431" : bad ? "#352e28" : "#1b2a2d"}
              stroke={root ? "#ff7c83" : bad ? "#dcad75" : "#54887e"}
              strokeWidth="1.5"
            />
            <text
              x={s.x}
              y={s.y + 6}
              textAnchor="middle"
              fill={root ? "#ff9da4" : bad ? "#f1c696" : "#8ce4c6"}
              fontSize="19"
              fontFamily="monospace"
            >
              {s.id === "transaction-database"
                ? "▤"
                : s.id === "bank-connector"
                  ? "↗"
                  : s.id === "api-gateway"
                    ? "⌘"
                    : s.id === "notification-service"
                      ? "✉"
                      : "‹/›"}
            </text>
            <rect
              x={s.x - 79}
              y={s.y + 47}
              width="158"
              height="26"
              rx="6"
              fill="#11151e"
            />
            <text
              x={s.x}
              y={s.y + 64}
              textAnchor="middle"
              fill="#e4e6ee"
              fontSize="12"
            >
              {s.label}
            </text>
            <text
              x={s.x}
              y={s.y + 84}
              textAnchor="middle"
              fill={root ? "#ff8c97" : "#717b90"}
              fontSize="10"
            >
              {root
                ? "TIMEOUT · 5,000 ms"
                : bad
                  ? "IMPACTADO"
                  : `${s.latency} ms · healthy`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
