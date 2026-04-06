# Architecture

ScenarioPilot은 `scenario generation`, `optimization`, `re-decision`, `dashboard`를 분리해 확장할 수 있게 설계한다.

## Pipeline

1. Conditional scenario generation
   - 입력 조건은 시간대, 날씨, 사고/이벤트, shortcut 사용 여부다.
   - 출력은 수요 heat, 도로 혼잡도, 도로 지연도다.

2. Diffusion shortcut
   - 12-step teacher sampler와 4-step shortcut sampler를 비교한다.
   - 현재는 teacher hint 기반 수치 근사이며, 추후 학습 기반 shortcut sampler로 교체한다.

3. Road graph materialization
   - 생성된 field를 도시 그래프의 road segment와 demand node에 매핑한다.
   - 도로는 `arterial`, `downtown`, `bridge`, `industrial`, `bypass` corridor를 가진다.

4. Routing / scheduling optimization
   - 브라우저는 direct route와 bypass route의 비용을 비교하는 deterministic heuristic을 사용한다.
   - FastAPI는 OR-Tools/Gurobi adapter를 분리해 이후 실제 solver로 교체할 수 있다.

5. RL re-decision
   - 현재는 rule-based policy placeholder다.
   - 추후 state/action/reward를 정의해 실시간 재배차 policy로 확장한다.

## Algorithm Notes

### Scenario Field

조건부 field는 다음 요인으로 계산된다.

- rush hour bias
- rain/fog weather penalty
- downtown event penalty
- bridge delay penalty
- time-varying traffic wave
- denoising step별 noise refinement

### Routing Cost

현재 route cost는 다음 요소를 반영한다.

- route distance
- target node congestion
- road-level congestion
- delay penalty
- vehicle capacity slack
- bypass switching overhead

### RL Placeholder

현재 policy는 다음 조건을 본다.

- rerouted vehicle 수
- max delay
- congestion field

그리고 다음 액션을 선택한다.

- current dispatch 유지
- bypass corridor 사용
- congestion decay까지 hold

## Local Runtime Boundary

현재는 로컬 실행을 기본으로 한다. 웹 배포가 필요해지면 `apps/dashboard`는 정적 빌드로 배포하고, FastAPI는 별도 서버에 올리는 방식으로 분리한다.
