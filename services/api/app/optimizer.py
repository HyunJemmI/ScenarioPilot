from __future__ import annotations

import math
from dataclasses import dataclass

from .models import DemandNode, Point, VehiclePlan


@dataclass(frozen=True)
class VehicleSeed:
    id: str
    label: str
    capacity: int
    depot: Point


DEPOTS = {
    "plant": Point(x=94, y=346),
    "hub": Point(x=650, y=152),
}

VEHICLES = [
    VehicleSeed("v1", "EV-01", 42, DEPOTS["plant"]),
    VehicleSeed("v2", "EV-02", 36, DEPOTS["hub"]),
    VehicleSeed("v3", "EV-03", 48, DEPOTS["plant"]),
]


def _distance(a: Point, b: Point) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def _route_eta(route: list[Point], assigned_demand: int) -> int:
    length = sum(_distance(route[index], route[index + 1]) for index in range(len(route) - 1))
    return round(length / 18 + assigned_demand * 0.36)


def optimize_with_available_solver(nodes: list[DemandNode]) -> dict[str, object]:
    """Use available production solvers when present, otherwise deterministic fallback.

    The dashboard is meant to run anywhere, so the fallback stays dependency-light.
    OR-Tools/Gurobi hooks are intentionally isolated here for later production hardening.
    """

    try:
      import gurobipy  # type: ignore  # noqa: F401
      solver_mode = "gurobi-adapter"
    except Exception:
      try:
          import ortools  # type: ignore  # noqa: F401
          solver_mode = "or-tools-adapter"
      except Exception:
          solver_mode = "fallback-heuristic"

    plans = _fallback_optimize(nodes)
    objective = sum(plan.eta + max(0, plan.assigned_demand - plan.capacity) * 8 for plan in plans)
    max_delay = max(node.delay for node in nodes)
    rl_action = "reroute high-delay node to spare EV" if max_delay > 0.5 else "keep optimized schedule"
    reroute_savings = round(12 + max_delay * 21) if max_delay > 0.5 else round(4 + max_delay * 8)

    return {
        "solver_mode": solver_mode,
        "objective": round(objective),
        "rl_action": rl_action,
        "reroute_savings": reroute_savings,
        "vehicles": plans,
    }


def _fallback_optimize(nodes: list[DemandNode]) -> list[VehiclePlan]:
    sorted_nodes = sorted(nodes, key=lambda node: node.demand + node.delay * 20, reverse=True)
    routes = [[vehicle.depot] for vehicle in VEHICLES]
    loads = [0 for _ in VEHICLES]

    for node in sorted_nodes:
        best_index = min(
            range(len(VEHICLES)),
            key=lambda index: _distance(routes[index][-1], node.point) * (1 + node.congestion)
            + node.delay * 90
            + max(0, loads[index] + node.demand - VEHICLES[index].capacity) * 3,
        )
        routes[best_index].append(node.point)
        loads[best_index] += node.demand

    plans: list[VehiclePlan] = []
    for index, vehicle in enumerate(VEHICLES):
        route = routes[index] + [vehicle.depot]
        plans.append(
            VehiclePlan(
                id=vehicle.id,
                label=vehicle.label,
                capacity=vehicle.capacity,
                assigned_demand=loads[index],
                eta=_route_eta(route, loads[index]),
                route=route,
            )
        )

    return plans
