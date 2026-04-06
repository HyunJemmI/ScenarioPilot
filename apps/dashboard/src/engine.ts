export type Point = {
  x: number;
  y: number;
};

export type CityNode = {
  id: string;
  label: string;
  kind: "depot" | "demand" | "junction";
  point: Point;
  baseDemand: number;
};

export type RoadSegment = {
  id: string;
  from: string;
  to: string;
  baseTraffic: number;
  corridor: "arterial" | "downtown" | "bridge" | "industrial" | "bypass";
};

export type DemandNode = CityNode & {
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
  target: string;
  rerouted: boolean;
};

export type ScenarioCondition = {
  hour: "morning" | "midday" | "evening";
  weather: "clear" | "rain" | "fog";
  incident: "none" | "downtown-event" | "bridge-delay";
  shortcut: boolean;
};

export type ScenarioField = {
  demandHeat: number[];
  roadCongestion: number[];
  roadDelay: number[];
  score: number;
  steps: number;
};

export type OptimizerResult = {
  vehicles: Vehicle[];
  objective: number;
  solverMode: "or-tools-adapter" | "gurobi-adapter" | "browser-heuristic";
  rlAction: string;
  rerouteSavings: number;
  reroutedCount: number;
};

export const CITY_NODES: CityNode[] = [
  { id: "plant", label: "KIA Plant", kind: "depot", point: { x: 82, y: 398 }, baseDemand: 0 },
  { id: "hub", label: "Urban Hub", kind: "depot", point: { x: 708, y: 126 }, baseDemand: 0 },
  { id: "j1", label: "West Gate", kind: "junction", point: { x: 162, y: 338 }, baseDemand: 0 },
  { id: "j2", label: "River Ramp", kind: "junction", point: { x: 286, y: 286 }, baseDemand: 0 },
  { id: "j3", label: "Central JCT", kind: "junction", point: { x: 430, y: 240 }, baseDemand: 0 },
  { id: "j4", label: "Bridge", kind: "junction", point: { x: 568, y: 194 }, baseDemand: 0 },
  { id: "j5", label: "South Loop", kind: "junction", point: { x: 350, y: 424 }, baseDemand: 0 },
  { id: "j6", label: "East Yard", kind: "junction", point: { x: 642, y: 366 }, baseDemand: 0 },
  { id: "sales", label: "Sales A", kind: "demand", point: { x: 176, y: 142 }, baseDemand: 24 },
  { id: "parts", label: "Parts B", kind: "demand", point: { x: 308, y: 168 }, baseDemand: 34 },
  { id: "dealer", label: "Dealer C", kind: "demand", point: { x: 474, y: 86 }, baseDemand: 22 },
  { id: "port", label: "Port D", kind: "demand", point: { x: 660, y: 280 }, baseDemand: 42 },
  { id: "service", label: "Service E", kind: "demand", point: { x: 436, y: 368 }, baseDemand: 28 },
  { id: "battery", label: "Battery F", kind: "demand", point: { x: 734, y: 428 }, baseDemand: 18 },
  { id: "dealer2", label: "Dealer G", kind: "demand", point: { x: 226, y: 444 }, baseDemand: 26 },
  { id: "mobility", label: "Mobility H", kind: "demand", point: { x: 548, y: 486 }, baseDemand: 31 },
  { id: "charging", label: "Charging I", kind: "demand", point: { x: 770, y: 206 }, baseDemand: 20 },
];

export const DEMAND_NODES = CITY_NODES.filter((node) => node.kind === "demand") as CityNode[];
export const DEPOTS = CITY_NODES.filter((node) => node.kind === "depot") as CityNode[];

export const ROADS: RoadSegment[] = [
  { id: "r01", from: "plant", to: "j1", baseTraffic: 0.34, corridor: "industrial" },
  { id: "r02", from: "j1", to: "j2", baseTraffic: 0.44, corridor: "arterial" },
  { id: "r03", from: "j2", to: "j3", baseTraffic: 0.6, corridor: "downtown" },
  { id: "r04", from: "j3", to: "j4", baseTraffic: 0.66, corridor: "bridge" },
  { id: "r05", from: "j4", to: "hub", baseTraffic: 0.42, corridor: "arterial" },
  { id: "r06", from: "j3", to: "service", baseTraffic: 0.56, corridor: "downtown" },
  { id: "r07", from: "service", to: "j6", baseTraffic: 0.48, corridor: "arterial" },
  { id: "r08", from: "j6", to: "battery", baseTraffic: 0.38, corridor: "industrial" },
  { id: "r09", from: "j6", to: "port", baseTraffic: 0.52, corridor: "bridge" },
  { id: "r10", from: "port", to: "charging", baseTraffic: 0.46, corridor: "arterial" },
  { id: "r11", from: "charging", to: "hub", baseTraffic: 0.5, corridor: "arterial" },
  { id: "r12", from: "j1", to: "sales", baseTraffic: 0.4, corridor: "arterial" },
  { id: "r13", from: "sales", to: "parts", baseTraffic: 0.56, corridor: "downtown" },
  { id: "r14", from: "parts", to: "dealer", baseTraffic: 0.62, corridor: "downtown" },
  { id: "r15", from: "dealer", to: "hub", baseTraffic: 0.38, corridor: "bypass" },
  { id: "r16", from: "parts", to: "j3", baseTraffic: 0.7, corridor: "downtown" },
  { id: "r17", from: "plant", to: "dealer2", baseTraffic: 0.34, corridor: "industrial" },
  { id: "r18", from: "dealer2", to: "j5", baseTraffic: 0.44, corridor: "bypass" },
  { id: "r19", from: "j5", to: "service", baseTraffic: 0.5, corridor: "bypass" },
  { id: "r20", from: "j5", to: "mobility", baseTraffic: 0.42, corridor: "bypass" },
  { id: "r21", from: "mobility", to: "battery", baseTraffic: 0.36, corridor: "industrial" },
  { id: "r22", from: "j2", to: "j5", baseTraffic: 0.48, corridor: "bypass" },
  { id: "r23", from: "j4", to: "port", baseTraffic: 0.72, corridor: "bridge" },
  { id: "r24", from: "j3", to: "j6", baseTraffic: 0.64, corridor: "downtown" },
  { id: "r25", from: "j2", to: "parts", baseTraffic: 0.58, corridor: "downtown" },
  { id: "r26", from: "j6", to: "hub", baseTraffic: 0.46, corridor: "bypass" },
];

const VEHICLE_SEED: Omit<Vehicle, "position" | "route" | "assignedDemand" | "eta" | "target" | "rerouted">[] = [
  { id: "v01", label: "EV-01", color: "#f04444", capacity: 42 },
  { id: "v02", label: "EV-02", color: "#00f0ff", capacity: 36 },
  { id: "v03", label: "EV-03", color: "#ffffff", capacity: 48 },
  { id: "v04", label: "EV-04", color: "#ffb74a", capacity: 34 },
  { id: "v05", label: "EV-05", color: "#76ff9f", capacity: 32 },
  { id: "v06", label: "EV-06", color: "#dfe6ff", capacity: 38 },
  { id: "v07", label: "EV-07", color: "#ff4aa7", capacity: 28 },
  { id: "v08", label: "EV-08", color: "#9ba8ff", capacity: 30 },
  { id: "v09", label: "EV-09", color: "#f04444", capacity: 44 },
  { id: "v10", label: "EV-10", color: "#00f0ff", capacity: 40 },
];

const NODE_BY_ID = new Map(CITY_NODES.map((node) => [node.id, node]));

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nodePoint(id: string) {
  const node = NODE_BY_ID.get(id);
  if (!node) {
    throw new Error(`Unknown map node: ${id}`);
  }
  return node.point;
}

function hashNoise(index: number, step: number, seed: number) {
  const value = Math.sin((index + 1) * 12.9898 + (step + 1) * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function conditionBias(condition: ScenarioCondition, index: number) {
  const rushBias = condition.hour === "morning" ? 0.14 : condition.hour === "evening" ? 0.24 : 0.04;
  const weatherBias = condition.weather === "rain" ? 0.2 : condition.weather === "fog" ? 0.14 : -0.05;
  const incidentBias =
    condition.incident === "downtown-event" && [1, 2, 3, 4].includes(index)
      ? 0.32
      : condition.incident === "bridge-delay" && [3, 5, 8].includes(index)
        ? 0.38
        : 0;
  return rushBias + weatherBias + incidentBias;
}

function roadBias(condition: ScenarioCondition, road: RoadSegment, index: number) {
  const rush = condition.hour === "evening" ? 0.18 : condition.hour === "morning" ? 0.12 : 0.02;
  const weather = condition.weather === "rain" ? 0.16 : condition.weather === "fog" ? 0.1 : -0.04;
  const incident =
    condition.incident === "downtown-event" && road.corridor === "downtown"
      ? 0.32
      : condition.incident === "bridge-delay" && road.corridor === "bridge"
        ? 0.44
        : 0;
  const pulse = Math.sin(index * 1.7) * 0.04;
  return rush + weather + incident + pulse;
}

export function roadEndpoints(road: RoadSegment): [Point, Point] {
  return [nodePoint(road.from), nodePoint(road.to)];
}

export function roadPath(road: RoadSegment) {
  const [start, end] = roadEndpoints(road);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

export function roadColor(congestion: number) {
  if (congestion > 0.78) {
    return "#f04444";
  }
  if (congestion > 0.58) {
    return "#ffb74a";
  }
  if (congestion > 0.38) {
    return "#f3f0d7";
  }
  return "#52ffe0";
}

export function generateScenario(condition: ScenarioCondition, time: number, stepOverride?: number): ScenarioField {
  const steps = stepOverride ?? (condition.shortcut ? 4 : 12);
  let demandHeat = DEMAND_NODES.map((node, index) => node.baseDemand / 50 + conditionBias(condition, index));
  let roadCongestion = ROADS.map((road, index) => road.baseTraffic + roadBias(condition, road, index));
  let roadDelay = ROADS.map((road, index) => road.baseTraffic * 0.52 + roadBias(condition, road, index) * 0.7);

  for (let step = 0; step < steps; step += 1) {
    const progress = (step + 1) / steps;
    demandHeat = demandHeat.map((value, index) => {
      const noise = hashNoise(index, step, time * 0.11);
      const target = DEMAND_NODES[index].baseDemand / 48 + conditionBias(condition, index) + noise * 0.14;
      return clamp(value * (0.78 - progress * 0.04) + target * (0.22 + progress * 0.04), 0.08, 1.35);
    });
    roadCongestion = roadCongestion.map((value, index) => {
      const road = ROADS[index];
      const wave = Math.sin(time * 0.9 + index * 0.72) * 0.06;
      const noise = hashNoise(index + 17, step, time * 0.19) * 0.1;
      const target = road.baseTraffic + roadBias(condition, road, index) + wave + noise;
      return clamp(value * 0.72 + target * 0.28, 0.08, 1.08);
    });
    roadDelay = roadDelay.map((value, index) => {
      const target = roadCongestion[index] * 0.7 + roadBias(condition, ROADS[index], index) * 0.42;
      return clamp(value * 0.74 + target * 0.26, 0.04, 1.0);
    });
  }

  if (condition.shortcut) {
    demandHeat = demandHeat.map((value, index) => {
      const teacherHint = DEMAND_NODES[index].baseDemand / 50 + conditionBias(condition, index) * 1.08;
      return clamp(value * 0.58 + teacherHint * 0.42, 0.08, 1.35);
    });
    roadCongestion = roadCongestion.map((value, index) => {
      const teacherHint = ROADS[index].baseTraffic + roadBias(condition, ROADS[index], index) * 1.05;
      return clamp(value * 0.64 + teacherHint * 0.36, 0.08, 1.08);
    });
    roadDelay = roadDelay.map((value, index) => clamp(value * 0.7 + roadCongestion[index] * 0.3, 0.04, 1.0));
  }

  const score = demandHeat.reduce((sum, value) => sum + value, 0) + roadCongestion.reduce((sum, value) => sum + value, 0);

  return {
    demandHeat,
    roadCongestion,
    roadDelay,
    score,
    steps,
  };
}

export function materializeDemand(field: ScenarioField): DemandNode[] {
  return DEMAND_NODES.map((node, index) => {
    const nearbyRoads = ROADS.map((road, roadIndex) => ({ road, roadIndex }))
      .filter(({ road }) => road.from === node.id || road.to === node.id)
      .map(({ roadIndex }) => field.roadCongestion[roadIndex]);
    const congestion = nearbyRoads.length ? nearbyRoads.reduce((sum, value) => sum + value, 0) / nearbyRoads.length : 0.3;
    return {
      ...node,
      demand: Math.round(node.baseDemand * (0.78 + field.demandHeat[index])),
      congestion,
      delay: clamp(congestion * 0.7 + field.demandHeat[index] * 0.2, 0.04, 1),
    };
  });
}

function makePolyline(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function routeCost(route: Point[], congestion: number) {
  const length = route.slice(1).reduce((sum, point, index) => sum + distance(route[index], point), 0);
  return length * (1 + congestion * 0.72);
}

function detourFor(node: DemandNode, depot: CityNode, field: ScenarioField, vehicleIndex: number) {
  const bypass = vehicleIndex % 3 === 0 ? "j5" : vehicleIndex % 3 === 1 ? "j6" : "j2";
  const directRoute = [depot.point, node.point];
  const detourRoute = [depot.point, nodePoint(bypass), node.point];
  const directCongestion = node.congestion + field.roadCongestion[(vehicleIndex * 3) % field.roadCongestion.length] * 0.5;
  const detourCongestion = field.roadCongestion.find((_, index) => ROADS[index].corridor === "bypass") ?? 0.32;
  const directCost = routeCost(directRoute, directCongestion);
  const detourCost = routeCost(detourRoute, detourCongestion) + 24;
  return detourCost < directCost ? { route: detourRoute, rerouted: true, cost: detourCost } : { route: directRoute, rerouted: false, cost: directCost };
}

export function optimizeRoutes(nodes: DemandNode[], time: number, field: ScenarioField): OptimizerResult {
  const sorted = [...nodes].sort((a, b) => b.demand + b.delay * 28 - (a.demand + a.delay * 28));
  const vehicles = VEHICLE_SEED.map((vehicle, index) => {
    const node = sorted[index % sorted.length];
    const depot = DEPOTS[index % DEPOTS.length];
    const selection = detourFor(node, depot, field, index);
    const progress = (time * (0.035 + index * 0.003) + index * 0.11) % 1;
    const assignedDemand = Math.min(vehicle.capacity, Math.round(node.demand * (0.42 + (index % 4) * 0.12)));
    return {
      ...vehicle,
      route: [...selection.route, depot.point],
      position: samplePolyline([...selection.route, depot.point], progress),
      assignedDemand,
      eta: Math.round(selection.cost / 18 + assignedDemand * 0.32),
      target: node.label,
      rerouted: selection.rerouted,
    };
  });

  const objective = vehicles.reduce((sum, vehicle) => sum + vehicle.eta + Math.max(0, vehicle.assignedDemand - vehicle.capacity) * 8, 0);
  const maxDelay = Math.max(...nodes.map((node) => node.delay));
  const reroutedCount = vehicles.filter((vehicle) => vehicle.rerouted).length;
  const rlAction =
    reroutedCount > 0
      ? `policy switches ${reroutedCount} vehicles to bypass corridors`
      : maxDelay > 0.55
        ? "policy holds fleet until congestion decays"
        : "policy keeps current dispatch";
  const rerouteSavings = reroutedCount > 0 ? Math.round(8 + reroutedCount * 5 + maxDelay * 12) : Math.round(3 + maxDelay * 8);

  return {
    vehicles,
    objective: Math.round(objective),
    solverMode: "browser-heuristic",
    rlAction,
    rerouteSavings,
    reroutedCount,
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
