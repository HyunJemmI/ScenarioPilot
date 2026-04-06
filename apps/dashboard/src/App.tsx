import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CITY_NODES,
  ROADS,
  type ScenarioCondition,
  generateScenario,
  materializeDemand,
  optimizeRoutes,
  roadColor,
  roadPath,
  routePath,
} from "./engine";

function useClock() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const loop = () => {
      setTime((performance.now() - start) / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return time;
}

export function App() {
  const time = useClock();
  const [condition, setCondition] = useState<ScenarioCondition>({
    hour: "evening",
    weather: "rain",
    incident: "downtown-event",
    shortcut: true,
  });
  const field = useMemo(() => generateScenario(condition, time), [condition, time]);
  const teacherField = useMemo(() => generateScenario({ ...condition, shortcut: false }, time, 12), [condition, time]);
  const demands = useMemo(() => materializeDemand(field), [field]);
  const optimized = useMemo(() => optimizeRoutes(demands, time, field), [demands, field, time]);
  const qualityGap = Math.abs(teacherField.score - field.score) / Math.max(teacherField.score, 1);
  const maxCongestion = Math.max(...field.roadCongestion);

  return (
    <main className="shell">
      <div className="fragment fragment-a" />
      <div className="fragment fragment-b" />
      <div className="fragment fragment-c" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ScenarioPilot</p>
          <h1>Adaptive fleet routing under generated traffic futures.</h1>
          <p>조건부 diffusion으로 교통 시나리오를 만들고, 혼잡도 기반으로 차량 경로를 다시 선택합니다.</p>
        </div>
        <div className="hero-stack">
          <Metric label="sampler" value={condition.shortcut ? "4-step shortcut" : "12-step teacher"} />
          <Metric label="quality gap" value={`${Math.round(qualityGap * 100)}%`} />
          <Metric label="rerouted" value={`${optimized.reroutedCount}/${optimized.vehicles.length}`} />
          <Metric label="max traffic" value={`${Math.round(maxCongestion * 100)}%`} />
        </div>
      </section>

      <section className="control-panel" aria-label="scenario controls">
        <Toggle active={condition.hour === "morning"} onClick={() => setCondition((prev) => ({ ...prev, hour: "morning" }))}>
          Morning
        </Toggle>
        <Toggle active={condition.hour === "evening"} onClick={() => setCondition((prev) => ({ ...prev, hour: "evening" }))}>
          Evening
        </Toggle>
        <Toggle active={condition.weather === "rain"} onClick={() => setCondition((prev) => ({ ...prev, weather: prev.weather === "rain" ? "clear" : "rain" }))}>
          Rain
        </Toggle>
        <Toggle
          active={condition.incident === "bridge-delay"}
          onClick={() =>
            setCondition((prev) => ({
              ...prev,
              incident: prev.incident === "bridge-delay" ? "downtown-event" : "bridge-delay",
            }))
          }
        >
          Incident
        </Toggle>
        <Toggle active={condition.shortcut} onClick={() => setCondition((prev) => ({ ...prev, shortcut: !prev.shortcut }))}>
          Shortcut
        </Toggle>
      </section>

      <section className="workspace">
        <article className="map-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Traffic Field</p>
              <h2>Generated city map</h2>
            </div>
            <span className="pill">{optimized.rlAction}</span>
          </div>

          <div className="map-stage">
            <svg viewBox="0 0 860 560" className="map" role="img" aria-label="Generated traffic map with fleet vehicles">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="street-body" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="860" height="560" rx="34" fill="#050505" />
              <g className="city-grid">
                {Array.from({ length: 14 }, (_, index) => (
                  <line key={`v-${index}`} x1={index * 68} y1="0" x2={index * 68 + 90} y2="560" />
                ))}
                {Array.from({ length: 9 }, (_, index) => (
                  <line key={`h-${index}`} x1="0" y1={index * 70} x2="860" y2={index * 70 - 70} />
                ))}
              </g>

              <g className="roads-base">
                {ROADS.map((road) => (
                  <path key={`${road.id}-base`} d={roadPath(road)} />
                ))}
              </g>

              <g className="roads-traffic">
                {ROADS.map((road, index) => (
                  <path
                    key={road.id}
                    d={roadPath(road)}
                    stroke={roadColor(field.roadCongestion[index])}
                    strokeWidth={8 + field.roadCongestion[index] * 8}
                    opacity={0.42 + field.roadCongestion[index] * 0.5}
                    filter={field.roadCongestion[index] > 0.72 ? "url(#glow)" : undefined}
                  />
                ))}
              </g>

              <g className="routes">
                {optimized.vehicles.map((vehicle) => (
                  <path key={`${vehicle.id}-route`} d={routePath(vehicle)} stroke={vehicle.color} className={vehicle.rerouted ? "route rerouted" : "route"} />
                ))}
              </g>

              <g className="nodes">
                {CITY_NODES.map((node) => (
                  <g key={node.id}>
                    {node.kind === "depot" ? (
                      <rect x={node.point.x - 17} y={node.point.y - 17} width="34" height="34" rx="6" className="depot" />
                    ) : (
                      <circle cx={node.point.x} cy={node.point.y} r={node.kind === "demand" ? 10 : 5} className={node.kind === "demand" ? "demand-node" : "junction"} />
                    )}
                    {node.kind !== "junction" && (
                      <text x={node.point.x + 16} y={node.point.y - 12} className="map-label">
                        {node.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>

              <g className="vehicles">
                {optimized.vehicles.map((vehicle) => (
                  <g key={vehicle.id} transform={`translate(${vehicle.position.x} ${vehicle.position.y})`}>
                    <rect x="-13" y="-8" width="26" height="16" rx="5" fill={vehicle.color} />
                    <circle cx="-7" cy="9" r="3" fill="#050505" />
                    <circle cx="8" cy="9" r="3" fill="#050505" />
                    <text x="18" y="5" className="vehicle-label">
                      {vehicle.target}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </article>

        <aside className="ops-panel">
          <p className="eyebrow">Algorithm</p>
          <h2>Generate → optimize → re-route</h2>
          <p className="panel-copy">생성된 혼잡 field가 빨간 도로를 만들고, optimizer는 우회 경로를 선택합니다.</p>
          <div className="legend">
            <span className="calm" /> free
            <span className="warn" /> slow
            <span className="hot" /> congested
          </div>
          <div className="vehicle-list">
            {optimized.vehicles.slice(0, 6).map((vehicle) => (
              <div className="vehicle-card" key={vehicle.id}>
                <span style={{ background: vehicle.color }} />
                <strong>{vehicle.label}</strong>
                <p>
                  {vehicle.target} · eta {vehicle.eta}m · {vehicle.rerouted ? "bypass" : "direct"}
                </p>
              </div>
            ))}
          </div>
          <div className="objective-card">
            <strong>{optimized.objective}</strong>
            <p>routing objective · estimated saving {optimized.rerouteSavings}m</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Toggle({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={active ? "active" : ""} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
