# Architecture

## Pipeline

1. Conditional scenario generation
   - 조건: 시간대, 날씨, 사고/이벤트, shortcut 사용 여부
   - 출력: 수요 heat, 혼잡 heat, 지연 heat

2. Diffusion shortcut
   - `12-step teacher`와 `4-step shortcut sampler`를 비교한다.
   - 실제 논문 수준 학습 대신, 데모에서는 teacher hint를 섞어 few-step 결과가 teacher score에 가까워지도록 시각화한다.

3. Routing / scheduling optimization
   - 브라우저 데모는 deterministic fallback heuristic으로 즉시 풀이한다.
   - FastAPI에서는 OR-Tools / Gurobi adapter를 분리해 실제 solver로 교체할 수 있게 둔다.

4. RL re-decision
   - 시나리오 지연이 커지면 reroute 액션을 선택한다.
   - 추후에는 policy network 또는 Q-learning 테이블로 대체할 수 있다.

## Why This Fits KIA ML Engineer

- 제조/판매/물류/모빌리티 운영 문제를 하나의 시스템으로 묶는다.
- 수리최적화와 강화학습을 실제 업무형 문제에 연결한다.
- 최신 생성 모델을 “시나리오 생성과 불확실성 추정”에 사용한다.
- 운영 가능한 API와 dashboard 구조를 함께 보여준다.
