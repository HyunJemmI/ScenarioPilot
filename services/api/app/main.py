from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import OptimizeResponse, ScenarioCondition, ScenarioResponse
from .optimizer import optimize_with_available_solver
from .scenario import generate_field, materialize_nodes

app = FastAPI(title="ScenarioPilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scenario", response_model=ScenarioResponse)
def scenario(condition: ScenarioCondition) -> ScenarioResponse:
    field = generate_field(condition)
    return ScenarioResponse(**field, nodes=materialize_nodes(field))


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(condition: ScenarioCondition) -> OptimizeResponse:
    field = generate_field(condition)
    nodes = materialize_nodes(field)
    result = optimize_with_available_solver(nodes)
    return OptimizeResponse(**result)


@app.post("/shortcut-benchmark")
def shortcut_benchmark(condition: ScenarioCondition) -> dict[str, float | int]:
    shortcut_field = generate_field(condition.model_copy(update={"shortcut": True}), step_override=4)
    teacher_field = generate_field(condition.model_copy(update={"shortcut": False}), step_override=12)
    teacher_score = float(teacher_field["score"])
    shortcut_score = float(shortcut_field["score"])
    quality_gap = abs(teacher_score - shortcut_score) / max(teacher_score, 1)
    return {
        "shortcut_steps": 4,
        "teacher_steps": 12,
        "shortcut_score": round(shortcut_score, 3),
        "teacher_score": round(teacher_score, 3),
        "quality_gap": round(quality_gap, 4),
    }
