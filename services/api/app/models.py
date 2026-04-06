from typing import Literal

from pydantic import BaseModel


class ScenarioCondition(BaseModel):
    hour: Literal["morning", "midday", "evening"] = "evening"
    weather: Literal["clear", "rain", "fog"] = "rain"
    incident: Literal["none", "downtown-event", "bridge-delay"] = "downtown-event"
    shortcut: bool = True
    time: float = 0.0


class Point(BaseModel):
    x: float
    y: float


class DemandNode(BaseModel):
    id: str
    label: str
    point: Point
    base_demand: int
    demand: int
    delay: float
    congestion: float


class VehiclePlan(BaseModel):
    id: str
    label: str
    capacity: int
    assigned_demand: int
    eta: int
    route: list[Point]


class ScenarioResponse(BaseModel):
    steps: int
    score: float
    demand_heat: list[float]
    congestion_heat: list[float]
    delay_heat: list[float]
    nodes: list[DemandNode]


class OptimizeResponse(BaseModel):
    solver_mode: str
    objective: int
    rl_action: str
    reroute_savings: int
    vehicles: list[VehiclePlan]
