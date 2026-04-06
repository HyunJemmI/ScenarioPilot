export type Point = {
  x: number;
  y: number;
};

export type Depot = {
  id: string;
  label: string;
  point: Point;
};

export type DemandNode = {
  id: string;
  label: string;
  point: Point;
  baseDemand: number;
  demand: number;
  delay: number;
  congestion: number;
};

export type Vehicle = {
  id: string;
  label: string;
  color: string;
  capacity: number;
  position: Point;
  route: Point[];
  assignedDemand: number;
  eta: number;
};

export type ScenarioCondition = {
  hour: "morning" | "midday" | "evening";
  weather: "clear" | "rain" | "fog";
  incident: "none" | "downtown-event" | "bridge-delay";
  shortcut: boolean;
};

export type ScenarioField = {
  demandHeat: number[];
  congestionHeat: number[];
  delayHeat: number[];
  score: number;
  steps: number;
};

export type OptimizerResult = {
  vehicles: Vehicle[];
  objective: number;
  solverMode: "or-tools-adapter" | "gurobi-adapter" | "browser-heuristic";
  rlAction: string;
  rerouteSavings: number;
};

export const DEPOTS: Depot[] = [
  { id: "plant", label: "KIA Plant", point: { x: 94, y: 346 } },
  { id: "hub", label: "Urban Hub", point: { x: 650, y: 152 } },
];

export const DEMAND_NODES: DemandNode[] = [
  { id: "a", label: "Sales A", point: { x: 168, y: 118 }, baseDemand: 18, demand: 18, delay: 0, congestion: 0 },
  { id: "b", label: "Parts B", point: { x: 304, y: 216 }, baseDemand: 25, demand: 25, delay: 0, congestion: 0 },
  { id: "c", label: "Dealer C", point: { x: 492, y: 92 }, baseDemand: 16, demand: 16, delay: 0, congestion: 0 },
  { id: "d", label: "Port D", point: { x: 572, y: 314 }, baseDemand: 34, demand: 34, delay: 0, congestion: 0 },
  { id: "e", label: "Service E", point: { x: 388, y: 388 }, baseDemand: 21, demand: 21, delay: 0, congestion: 0 },
  { id: "f", label: "Battery F", point: { x: 708, y: 392 }, baseDemand: 14, demand: 14, delay: 0, congestion: 0 },
];

export const ROADS: [Point, Point][] = [
  [DEPOTS[0].point, DEMAND_NODES[0].point],
  [DEPOTS[0].point, DEMAND_NODES[1].point],
  [DEMAND_NODES[0].point, DEMAND_NODES[2].point],
  [DEMAND_NODES[1].point, DEMAND_NODES[2].point],
  [DEMAND_NODES[1].point, DEMAND_NODES[4].point],
  [DEMAND_NODES[2].point, DEPOTS[1].point],
  [DEMAND_NODES[2].point, DEMAND_NODES[3].point],
  [DEMAND_NODES[3].point, DEMAND_NODES[4].point],
  [DEMAND_NODES[3].point, DEMAND_NODES[5].point],
  [DEMAND_NODES[5].point, DEPOTS[1].point],
  [DEMAND_NODES[4].point, DEPOTS[0].point],
];

const VEHICLE_SEED: Omit<Vehicle, "position" | "route" | "assignedDemand" | "eta">[] = [
  { id: "v1", label: "EV-01", color: "#82f7c5", capacity: 42 },
  { id: "v2", label: "EV-02", color: "#80a7ff", capacity: 36 },
  { id: "v3", label: "EV-03", color: "#ffd37e", capacity: 48 },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hashNoise(index: number, step: number, seed: number) {
  return Math.sin((index + 1) * 12.9898 + (step + 1) * 78.233 + seed * 37.719) * 43758.5453 % 1;
}

function conditionBias(condition: ScenarioCondition, index: number) {
  const rushBias = condition.hour === "morning" ? 0.18 : condition.hour === "evening" ? 0.24 : 0.06;
  const weatherBias = condition.weather === "rain" ? 0.2 : condition.weather === "fog" ? 0.12 : -0.04;
  const incidentBias =
    condition.incident === "downtown-event" && [1, 2, 3].includes(index)
      ? 0.34
      : condition.incident === "bridge-delay" && [3, 5].includes(index)
        ? 0.4
        : 0;
  return rushBias + weatherBias + incidentBias;
}

export function generateScenario(
  condition: ScenarioCondition,
  time: number,
  stepOverride?: number,
): ScenarioField {
  const steps = stepOverride ?? (condition.shortcut ? 4 : 12);
  let demandHeat = DEMAND_NODES.map((node, index) => node.baseDemand / 40 + conditionBias(condition, index));
  let congestionHeat = DEMAND_NODES.map((_, index) => 0.25 + conditionBias(condition, index) * 0.8);
  let delayHeat = DEMAND_NODES.map((_, index) => 0.15 + conditionBias(condition, index) * 0.65);

  for (let step = 0; step < steps; step += 1) {
    const progress = (step + 1) / steps;
    demandHeat = demandHeat.map((value, index) => {
      const noise = hashNoise(index, step, time * 0.13);
      const target = DEMAND_NODES[index].baseDemand / 38 + conditionBias(condition, index) + noise * 0.12;
      return clamp(value * (1 - 0.18 - progress * 0.08) + target * (0.18 + progress * 0.08), 0.08, 1.28);
    });
    congestionHeat = congestionHeat.map((value, index) => {
      const noise = hashNoise(index + 9, step, time * 0.17);
      const target = conditionBias(condition, index) + 0.22 + Math.abs(noise) * 0.22;
      return clamp(value * 0.72 + target * 0.28, 0.04, 1.1);
    });
    delayHeat = delayHeat.map((value, index) => {
      const target = congestionHeat[index] * 0.72 + conditionBias(condition, index) * 0.4;
      return clamp(value * 0.76 + target * 0.24, 0.02, 1.0);
    });
  }

  if (condition.shortcut) {
    demandHeat = demandHeat.map((value, index) => {
      const teacherHint = DEMAND_NODES[index].baseDemand / 40 + conditionBias(condition, index) * 1.08;
      return clamp(value * 0.62 + teacherHint * 0.38, 0.08, 1.28);
    });
    congestionHeat = congestionHeat.map((value, index) => clamp(value * 0.66 + conditionBias(condition, index) * 0.34, 0.04, 1.1));
    delayHeat = delayHeat.map((value, index) => clamp(value * 0.72 + congestionHeat[index] * 0.28, 0.02, 1.0));
  }

  const score = demandHeat.reduce((sum, value) => sum + value, 0) + congestionHeat.reduce((sum, value) => sum + value, 0);

  return {
    demandHeat,
    congestionHeat,
    delayHeat,
    score,
    steps,
  };
}

export function materializeDemand(field: ScenarioField): DemandNode[] {
  return DEMAND_NODES.map((node, index) => ({
    ...node,
    demand: Math.round(node.baseDemand * (0.72 + field.demandHeat[index])),
    congestion: field.congestionHeat[index],
    delay: field.delayHeat[index],
  }));
}

function makePolyline(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

export function optimizeRoutes(nodes: DemandNode[], time: number): OptimizerResult {
  const sorted = [...nodes].sort((a, b) => b.demand + b.delay * 20 - (a.demand + a.delay * 20));
  const loads = [0, 0, 0];
  const routes = VEHICLE_SEED.map((vehicle, index) => ({
    ...vehicle,
    position: DEPOTS[index === 1 ? 1 : 0].point,
    route: [DEPOTS[index === 1 ? 1 : 0].point],
    assignedDemand: 0,
    eta: 0,
  }));

  sorted.forEach((node) => {
    const bestIndex = routes
      .map((vehicle, index) => {
        const lastPoint = vehicle.route[vehicle.route.length - 1];
        const slackPenalty = Math.max(0, loads[index] + node.demand - vehicle.capacity) * 3;
        return {
          index,
          cost: distance(lastPoint, node.point) * (1 + node.congestion) + node.delay * 90 + slackPenalty,
        };
      })
      .sort((a, b) => a.cost - b.cost)[0].index;
    routes[bestIndex].route.push(node.point);
    routes[bestIndex].assignedDemand += node.demand;
    loads[bestIndex] += node.demand;
  });

  routes.forEach((vehicle, index) => {
    vehicle.route.push(DEPOTS[index === 1 ? 1 : 0].point);
    const length = vehicle.route.slice(1).reduce((sum, point, pointIndex) => sum + distance(vehicle.route[pointIndex], point), 0);
    vehicle.eta = Math.round(length / 18 + vehicle.assignedDemand * 0.36);
    const routeProgress = (time * 0.035 + index * 0.2) % 1;
    vehicle.position = samplePolyline(vehicle.route, routeProgress);
  });

  const objective = routes.reduce((sum, vehicle) => sum + vehicle.eta + Math.max(0, vehicle.assignedDemand - vehicle.capacity) * 8, 0);
  const maxDelay = Math.max(...nodes.map((node) => node.delay));
  const rlAction = maxDelay > 0.5 ? "reroute high-delay node to spare EV" : "keep optimized schedule";
  const rerouteSavings = maxDelay > 0.5 ? Math.round(12 + maxDelay * 21) : Math.round(4 + maxDelay * 8);

  return {
    vehicles: routes,
    objective: Math.round(objective),
    solverMode: "browser-heuristic",
    rlAction,
    rerouteSavings,
  };
}

export function routePath(vehicle: Vehicle) {
  return makePolyline(vehicle.route);
}

export function samplePolyline(points: Point[], progress: number): Point {
  const segments = points.slice(1).map((point, index) => ({
    start: points[index],
    end: point,
    length: distance(points[index], point),
  }));
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let target = ((progress % 1) + 1) % 1 * total;

  for (const segment of segments) {
    if (target <= segment.length) {
      const ratio = segment.length === 0 ? 0 : target / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      };
    }
    target -= segment.length;
  }

  return points[points.length - 1];
}
