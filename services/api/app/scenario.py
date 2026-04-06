from __future__ import annotations

import math
from dataclasses import dataclass

from .models import DemandNode, Point, ScenarioCondition


@dataclass(frozen=True)
class NodeSeed:
    id: str
    label: str
    x: float
    y: float
    base_demand: int


DEMAND_NODES = [
    NodeSeed("a", "Sales A", 168, 118, 18),
    NodeSeed("b", "Parts B", 304, 216, 25),
    NodeSeed("c", "Dealer C", 492, 92, 16),
    NodeSeed("d", "Port D", 572, 314, 34),
    NodeSeed("e", "Service E", 388, 388, 21),
    NodeSeed("f", "Battery F", 708, 392, 14),
]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _hash_noise(index: int, step: int, seed: float) -> float:
    return math.sin((index + 1) * 12.9898 + (step + 1) * 78.233 + seed * 37.719) * 43758.5453 % 1


def _condition_bias(condition: ScenarioCondition, index: int) -> float:
    rush_bias = 0.18 if condition.hour == "morning" else 0.24 if condition.hour == "evening" else 0.06
    weather_bias = 0.2 if condition.weather == "rain" else 0.12 if condition.weather == "fog" else -0.04
    incident_bias = 0.0
    if condition.incident == "downtown-event" and index in [1, 2, 3]:
        incident_bias = 0.34
    if condition.incident == "bridge-delay" and index in [3, 5]:
        incident_bias = 0.4
    return rush_bias + weather_bias + incident_bias


def generate_field(condition: ScenarioCondition, step_override: int | None = None) -> dict[str, object]:
    steps = step_override or (4 if condition.shortcut else 12)
    demand_heat = [node.base_demand / 40 + _condition_bias(condition, index) for index, node in enumerate(DEMAND_NODES)]
    congestion_heat = [0.25 + _condition_bias(condition, index) * 0.8 for index in range(len(DEMAND_NODES))]
    delay_heat = [0.15 + _condition_bias(condition, index) * 0.65 for index in range(len(DEMAND_NODES))]

    for step in range(steps):
        progress = (step + 1) / steps
        next_demand: list[float] = []
        next_congestion: list[float] = []
        next_delay: list[float] = []
        for index, node in enumerate(DEMAND_NODES):
            noise = _hash_noise(index, step, condition.time * 0.13)
            demand_target = node.base_demand / 38 + _condition_bias(condition, index) + noise * 0.12
            demand_value = _clamp(demand_heat[index] * (1 - 0.18 - progress * 0.08) + demand_target * (0.18 + progress * 0.08), 0.08, 1.28)
            congestion_target = _condition_bias(condition, index) + 0.22 + abs(_hash_noise(index + 9, step, condition.time * 0.17)) * 0.22
            congestion_value = _clamp(congestion_heat[index] * 0.72 + congestion_target * 0.28, 0.04, 1.1)
            delay_value = _clamp(delay_heat[index] * 0.76 + (congestion_value * 0.72 + _condition_bias(condition, index) * 0.4) * 0.24, 0.02, 1.0)
            next_demand.append(demand_value)
            next_congestion.append(congestion_value)
            next_delay.append(delay_value)
        demand_heat = next_demand
        congestion_heat = next_congestion
        delay_heat = next_delay

    if condition.shortcut:
        demand_heat = [
            _clamp(value * 0.62 + (node.base_demand / 40 + _condition_bias(condition, index) * 1.08) * 0.38, 0.08, 1.28)
            for index, (node, value) in enumerate(zip(DEMAND_NODES, demand_heat, strict=True))
        ]
        congestion_heat = [
            _clamp(value * 0.66 + _condition_bias(condition, index) * 0.34, 0.04, 1.1)
            for index, value in enumerate(congestion_heat)
        ]
        delay_heat = [_clamp(value * 0.72 + congestion_heat[index] * 0.28, 0.02, 1.0) for index, value in enumerate(delay_heat)]

    score = sum(demand_heat) + sum(congestion_heat)
    return {
        "steps": steps,
        "score": score,
        "demand_heat": demand_heat,
        "congestion_heat": congestion_heat,
        "delay_heat": delay_heat,
    }


def materialize_nodes(field: dict[str, object]) -> list[DemandNode]:
    demand_heat = field["demand_heat"]
    congestion_heat = field["congestion_heat"]
    delay_heat = field["delay_heat"]
    assert isinstance(demand_heat, list)
    assert isinstance(congestion_heat, list)
    assert isinstance(delay_heat, list)

    return [
        DemandNode(
            id=node.id,
            label=node.label,
            point=Point(x=node.x, y=node.y),
            base_demand=node.base_demand,
            demand=round(node.base_demand * (0.72 + float(demand_heat[index]))),
            congestion=float(congestion_heat[index]),
            delay=float(delay_heat[index]),
        )
        for index, node in enumerate(DEMAND_NODES)
    ]
