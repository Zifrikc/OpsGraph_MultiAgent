"use client";
import { useRef, useState } from "react";
import type { Graph } from "@/lib/useOpsGraph";
export default function Topology({
  graph,
  affected,
  incident,
  selected,
  onSelect,
  focus,
  storeId,
  onStoreSelect,
  interactive = false,
  activeStores = [],
}: {
  graph: Graph;
  affected: string[];
  incident: boolean;
  selected: string;
  onSelect: (id: string) => void;
  focus: boolean;
  storeId: string;
  onStoreSelect: (id: string) => void;
  interactive?: boolean;
  activeStores?: string[];
}) {
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [frame, setFrame] = useState({
    x: interactive ? -285 : 0,
    y: 0,
    w: interactive ? 1220 : 920,
    h: 590,
  });
  const drag = useRef<{
    kind: "pan" | "service";
    id?: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const services = graph.services.map((service) => ({
    ...service,
    ...(positions[service.id] || {}),
  }));
  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current || !svg.current) return;
    const rect = svg.current.getBoundingClientRect();
    const dx = ((event.clientX - drag.current.x) * frame.w) / rect.width;
    const dy = ((event.clientY - drag.current.y) * frame.h) / rect.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.8) drag.current.moved = true;
    if (drag.current.kind === "pan")
      setFrame((old) => ({ ...old, x: old.x - dx, y: old.y - dy }));
    else if (drag.current.id) {
      const service = services.find((item) => item.id === drag.current?.id);
      if (service)
        setPositions((old) => ({
          ...old,
          [service.id]: { x: service.x + dx, y: service.y + dy },
        }));
    }
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  }
  const edges = graph.edges
    .map((e) => [
      services.findIndex((s) => s.id === e.source),
      services.findIndex((s) => s.id === e.target),
    ])
    .filter(([a, b]) => a >= 0 && b >= 0);
  return (
    <svg
      ref={svg}
      className="topology"
      viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
      onWheel={
        interactive
          ? (event) => {
              event.preventDefault();
              setFrame((old) => {
                const factor = event.deltaY > 0 ? 1.12 : 0.89;
                const width = Math.min(1800, Math.max(380, old.w * factor));
                const height = (old.h * width) / old.w;
                return {
                  x: old.x + (old.w - width) / 2,
                  y: old.y + (old.h - height) / 2,
                  w: width,
                  h: height,
                };
              });
            }
          : undefined
      }
      onPointerDown={
        interactive
          ? (event) => {
              if ((event.target as Element).closest(".graph-node")) return;
              drag.current = {
                kind: "pan",
                x: event.clientX,
                y: event.clientY,
                moved: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          : undefined
      }
      onPointerMove={interactive ? move : undefined}
      onPointerUp={
        interactive
          ? () => {
              drag.current = null;
            }
          : undefined
      }
      role="group"
      aria-label={`Interactive map of ${graph.stores.length} stores and eight simulated services`}
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
      {(interactive ? graph.stores : graph.stores.slice(0, 3)).map(
        (store, index) => {
          const x = interactive ? -235 + Math.floor(index / 10) * 75 : 65;
          const y = interactive ? 25 + (index % 10) * 56 : 105 + index * 185;
          const small = interactive;
          return (
            <g
              key={store.id}
              className="graph-node"
              role="button"
              tabIndex={0}
              aria-label={`${store.label}, ${store.region}; usa API Gateway`}
              onClick={() => onStoreSelect(store.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onStoreSelect(store.id);
                }
              }}
            >
              <line
                x1={x + (small ? 14 : 13)}
                y1={y}
                x2="113"
                y2="230"
                stroke={
                  activeStores.includes(store.id)
                    ? "#ff7c83"
                    : storeId === store.id
                      ? "#b4a0ff"
                      : "#465064"
                }
                strokeWidth={storeId === store.id ? 2 : 1}
                markerEnd="url(#arrow)"
              />
              <circle
                cx={x}
                cy={y}
                r={small ? 14 : 25}
                fill={
                  activeStores.includes(store.id)
                    ? "#512936"
                    : storeId === store.id
                      ? "#332c54"
                      : "#1b2031"
                }
                stroke={
                  activeStores.includes(store.id)
                    ? "#ff7c83"
                    : storeId === store.id
                      ? "#aa94ff"
                      : "#697289"
                }
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={y + (small ? 4 : 5)}
                textAnchor="middle"
                fill="#d4c9ff"
                fontSize={small ? "10" : "15"}
              >
                ⌂
              </text>
              <text
                x={x}
                y={y + (small ? 26 : 43)}
                textAnchor="middle"
                fill="#e1deef"
                fontSize={small ? "8" : "11"}
              >
                {small ? store.id.replace("store-", "") : store.label}
              </text>
              {!small && (
                <text
                  x="65"
                  y={y + 57}
                  textAnchor="middle"
                  fill="#8b92a8"
                  fontSize="9"
                >
                  {store.region}
                </text>
              )}
            </g>
          );
        },
      )}
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
            onClick={() => {
              if (!drag.current?.moved) onSelect(s.id);
            }}
            onPointerDown={
              interactive
                ? (event) => {
                    event.stopPropagation();
                    drag.current = {
                      kind: "service",
                      id: s.id,
                      x: event.clientX,
                      y: event.clientY,
                      moved: false,
                    };
                    svg.current?.setPointerCapture(event.pointerId);
                  }
                : undefined
            }
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
      {interactive && incident && (
        <g className="agent-flow">
          <path
            d="M760 150 Q830 395 620 555"
            fill="none"
            stroke="#ffa879"
            strokeWidth="2"
            strokeDasharray="7 6"
          />
          <path
            d="M620 555 L790 555"
            fill="none"
            stroke="#ac9bff"
            strokeWidth="2"
            strokeDasharray="7 6"
          />
          <path
            d="M790 555 Q900 390 760 150"
            fill="none"
            stroke="#83d8b9"
            strokeWidth="2"
            strokeDasharray="7 6"
          />
          <g>
            <circle cx="620" cy="555" r="22" fill="#462c32" stroke="#ffa879" />
            <text
              x="620"
              y="560"
              textAnchor="middle"
              fill="white"
              fontSize="17"
            >
              T
            </text>
            <text
              x="620"
              y="590"
              textAnchor="middle"
              fill="#ffd0b3"
              fontSize="11"
            >
              Triage Agent
            </text>
          </g>
          <g>
            <circle cx="790" cy="555" r="22" fill="#302b4f" stroke="#ac9bff" />
            <text
              x="790"
              y="560"
              textAnchor="middle"
              fill="white"
              fontSize="17"
            >
              I
            </text>
            <text
              x="790"
              y="590"
              textAnchor="middle"
              fill="#d6c9ff"
              fontSize="11"
            >
              Investigator Agent
            </text>
          </g>
          <text x="702" y="541" fill="#c7b8ff" fontSize="10">
            persisted handoff →
          </text>
        </g>
      )}
    </svg>
  );
}
