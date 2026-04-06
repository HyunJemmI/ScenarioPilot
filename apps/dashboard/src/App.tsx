import { useEffect, useMemo, useState } from "react";
import {
  DEPOTS,
  DEMAND_NODES,
  ROADS,
  type ScenarioCondition,
  generateScenario,
  materializeDemand,
  optimizeRoutes,
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
  const optimized = useMemo(() => optimizeRoutes(demands, time), [demands, time]);
  const qualityGap = Math.abs(teacherField.score - field.score) / Math.max(teacherField.score, 1);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">ScenarioPilot</p>
          <h1>Diffusion-driven fleet optimization simulator</h1>
          <p className="hero-copy">
            웹 맵 위에서 조건부 diffusion이 수요, 혼잡, 지연 시나리오를 생성하고 routing/scheduling optimizer와
            RL-style re-decision이 차량 운영 전략을 갱신하는 데모입니다.
          </p>
        </div>
        <div className="hero-grid">
          <Metric label="Diffusion steps" value={condition.shortcut ? "4 shortcut" : "12 teacher"} />
          <Metric label="Quality gap" value={`${Math.round(qualityGap * 100)}%`} />
          <Metric label="Objective" value={String(optimized.objective)} />
          <Metric label="RL saving" value={`${optimized.rerouteSavings} min`} />
        </div>
      </section>

      <section className="control-panel">
        <button
          className={condition.hour === "morning" ? "active" : ""}
          type="button"
          onClick={() => setCondition((prev) => ({ ...prev, hour: "morning" }))}
        >
          Morning demand
        </button>
        <button
          className={condition.hour === "evening" ? "active" : ""}
          type="button"
          onClick={() => setCondition((prev) => ({ ...prev, hour: "evening" }))}
        >
          Evening rush
        </button>
        <button
          className={condition.weather === "rain" ? "active" : ""}
          type="button"
          onClick={() => setCondition((prev) => ({ ...prev, weather: prev.weather === "rain" ? "clear" : "rain" }))}
        >
          Rain / clear
        </button>
        <button
          className={condition.incident === "bridge-delay" ? "active" : ""}
          type="button"
          onClick={() =>
            setCondition((prev) => ({
              ...prev,
              incident: prev.incident === "bridge-delay" ? "downtown-event" : "bridge-delay",
            }))
          }
        >
          Incident switch
        </button>
        <button
          className={condition.shortcut ? "active" : ""}
          type="button"
          onClick={() => setCondition((prev) => ({ ...prev, shortcut: !prev.shortcut }))}
        >
          Diffusion shortcut
        </button>
      </section>

      <section className="workspace">
        <article className="map-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Generated Map</p>
              <h2>Demand / congestion / delay scenario</h2>
            </div>
            <span className="pill">{optimized.solverMode}</span>
          </div>

          <svg viewBox="0 0 820 520" className="map">
            <defs>
              <radialGradient id="heat" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 180, 92, 0.72)" />
                <stop offset="100%" stopColor="rgba(255, 80, 80, 0)" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="820" height="520" rx="30" fill="#070707" />
            {ROADS.map(([start, end], index) => (
              <line key={index} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="road" />
            ))}
            {demands.map((node, index) => (
              <g key={node.id}>
                <circle
                  cx={node.point.x}
                  cy={node.point.y}
                  r={36 + field.congestionHeat[index] * 38}
                  fill="url(#heat)"
                  opacity={0.35 + node.delay * 0.4}
                />
                <circle cx={node.point.x} cy={node.point.y} r={12 + node.demand * 0.18} className="demand-node" />
                <text x={node.point.x + 18} y={node.point.y - 10} className="map-label">
                  {node.label}
                </text>
                <text x={node.point.x + 18} y={node.point.y + 10} className="map-meta">
                  demand {node.demand} / delay {Math.round(node.delay * 100)}%
                </text>
              </g>
            ))}
            {DEPOTS.map((depot) => (
              <g key={depot.id}>
                <rect x={depot.point.x - 18} y={depot.point.y - 18} width="36" height="36" rx="10" className="depot" />
                <text x={depot.point.x + 24} y={depot.point.y + 4} className="map-label">
                  {depot.label}
                </text>
              </g>
            ))}
            {optimized.vehicles.map((vehicle) => (
              <g key={vehicle.id}>
                <path d={routePath(vehicle)} fill="none" stroke={vehicle.color} strokeWidth="4" strokeLinecap="round" strokeDasharray="10 12" />
                <circle cx={vehicle.position.x} cy={vehicle.position.y} r="11" fill={vehicle.color} />
                <text x={vehicle.position.x + 16} y={vehicle.position.y + 4} className="vehicle-label">
                  {vehicle.label}
                </text>
              </g>
            ))}
          </svg>
        </article>

        <aside className="ops-panel">
          <div className="card-head">
            <div>
              <p className="eyebrow">Operations Loop</p>
              <h2>Generate → Optimize → Re-decide</h2>
            </div>
          </div>
          <PipelineStep index="01" title="Conditional diffusion" body="수요, 혼잡, 지연 latent field를 조건에 맞게 denoise합니다." />
          <PipelineStep index="02" title="Shortcut sampling" body="12-step teacher의 결과를 4-step student가 따라가도록 압축한 데모 모드입니다." />
          <PipelineStep index="03" title="Routing / scheduling" body="브라우저 휴리스틱으로 즉시 풀이하고, FastAPI에서는 OR-Tools/Gurobi 어댑터로 확장합니다." />
          <PipelineStep index="04" title="RL re-decision" body={optimized.rlAction} />
          <div className="vehicle-list">
            {optimized.vehicles.map((vehicle) => (
              <div className="vehicle-card" key={vehicle.id}>
                <span style={{ background: vehicle.color }} />
                <strong>{vehicle.label}</strong>
                <p>
                  load {vehicle.assignedDemand}/{vehicle.capacity} · eta {vehicle.eta}m
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
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

function PipelineStep({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="pipeline-step">
      <span>{index}</span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}
