# ScenarioPilot

`ScenarioPilot`은 모빌리티 운영에서 발생하는 미래 수요, 교통량, 혼잡, 지연을 생성하고, 그 결과를 바탕으로 차량 경로와 스케줄을 다시 결정하는 fleet optimization 시스템을 목표로 한다.

최종 목표는 단순히 차량이 움직이는 화면을 만드는 것이 아니라, `생성 모델 → 수리최적화 → 강화학습 기반 재의사결정 → 운영 대시보드`로 이어지는 전체 파이프라인을 하나의 포트폴리오 프로젝트로 구현하는 것이다.

## 개요

현실의 fleet 운영에서는 수요와 교통 상황이 계속 변한다. 판매 거점, 부품 물류, 충전 수요, 항만/공장 이동, 도심 혼잡, 사고 지연이 동시에 발생하면 정적인 최단 경로만으로는 좋은 의사결정을 하기 어렵다.

`ScenarioPilot`은 이 문제를 다음 흐름으로 다룬다.

- 조건부 diffusion으로 미래 수요, 혼잡, 지연 시나리오를 생성한다.
- 생성된 시나리오를 그래프 형태의 도시 맵에 반영한다.
- 도로별 혼잡도를 색상으로 표현한다.
- 차량들은 현재 시나리오를 기준으로 direct route 또는 bypass route를 선택한다.
- routing/scheduling 목적함수와 예상 saving을 계산한다.
- 추후 RL policy가 실시간으로 재배차, 대기, 우회, 재스케줄링 액션을 선택하도록 확장한다.

## 개발 목적

이 프로젝트는 KIA Machine Learning Engineer 직무에서 요구하는 `수리최적화`, `강화학습`, `운영 적용`, `최신 알고리즘 구현 역량`을 하나의 문제로 묶기 위해 설계했다.

포트폴리오에서 강조하고 싶은 문장은 다음과 같다.

> Conditional diffusion으로 미래 수요·혼잡·지연 시나리오를 생성하고, shortcut sampling으로 생성 시간을 줄인 뒤, routing/scheduling 최적화와 RL re-decision을 결합해 fleet 운영 전략을 갱신하는 시스템을 구현했다.

## 현재 구현 범위

### `apps/dashboard`

- Vite + React 기반 웹 대시보드
- 미래지향적 dark UI와 3D-like SVG traffic map
- 도로/거점/수요 노드/차량을 포함한 generated city graph
- 조건에 따른 수요, 혼잡, 지연 field 생성
- 도로별 혼잡도 색상 표시
- 차량 10대의 route 주행 시각화
- direct route와 bypass route 선택 비교
- 12-step teacher sampler와 4-step shortcut sampler 비교
- objective, rerouted vehicle 수, saving, max traffic 표시

### `services/api`

- FastAPI 기반 API 레이어
- `/scenario`: 조건부 scenario field 생성
- `/optimize`: routing/scheduling 최적화 결과 반환
- `/shortcut-benchmark`: teacher sampler와 shortcut sampler score 비교
- Gurobi/OR-Tools가 설치된 환경에서 solver adapter로 확장 가능한 구조

## 구현 방법

### 1. Conditional Diffusion Scenario Generator

현재 브라우저에서는 대형 diffusion 모델을 직접 학습하거나 GPU 추론하지 않는다. 대신 diffusion의 denoising 과정을 경량 수치 시뮬레이션으로 표현한다.

입력 조건은 다음과 같다.

- 시간대: `morning`, `midday`, `evening`
- 날씨: `clear`, `rain`, `fog`
- 이벤트: `none`, `downtown-event`, `bridge-delay`
- sampler: `12-step teacher`, `4-step shortcut`

출력은 다음 field다.

- 수요 heat
- 도로 혼잡도
- 도로 지연도
- 전체 scenario score

### 2. Diffusion Shortcut

목표는 많은 denoising step을 거친 teacher sampler의 결과를 더 적은 step으로 근사하는 것이다.

현재 구현은 12-step teacher와 4-step shortcut sampler를 비교하고, shortcut sampler가 teacher hint를 일부 반영해 품질 차이를 줄이는 방식으로 동작한다. 추후에는 실제 shortcut distillation 또는 consistency model 계열의 few-step sampler로 교체할 수 있다.

### 3. Graph-based Routing / Scheduling

도시 맵은 node와 road segment로 구성된 그래프다.

- node: 공장, 도심 허브, 판매 거점, 부품 거점, 항만, 충전 거점
- road segment: arterial, downtown, bridge, industrial, bypass
- road cost: 거리, 혼잡도, 지연도, 용량 초과 패널티

현재 대시보드는 브라우저에서 deterministic heuristic을 사용한다. 각 차량은 demand priority가 높은 노드를 target으로 받고, 현재 혼잡 상황에 따라 direct route와 bypass route 중 비용이 낮은 경로를 선택한다.

FastAPI 쪽은 이후 OR-Tools VRP solver 또는 Gurobi MIP 모델을 연결할 수 있도록 adapter 위치를 분리해두었다.

### 4. RL Re-decision

현재 RL은 policy network가 아니라 rule-based policy placeholder다. 지연과 혼잡이 커지면 우회 경로 선택, 대기, 재배차 액션을 표시한다.

추후 확장 방향은 다음과 같다.

- state: 차량 위치, 남은 수요, 도로 혼잡도, 예측 지연
- action: route 유지, bypass 선택, 차량 재배치, dispatch delay, charging stop
- reward: 총 지연 감소, 운행거리 감소, capacity violation 감소, SLA 만족률 증가

## 실행 방법

대시보드:

```bash
cd /Users/hyunje/projects/ScenarioPilot
npm install
npm run dev:dashboard
```

브라우저에서 연다.

```text
http://localhost:5173/
```

FastAPI:

```bash
cd /Users/hyunje/projects/ScenarioPilot/services/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

API 상태 확인:

```text
http://127.0.0.1:8000/health
```

정적 빌드:

```bash
cd /Users/hyunje/projects/ScenarioPilot
npm run build:dashboard
```

## 다음 개발 단계

- 실제 OR-Tools VRP 모델 연결
- Gurobi MIP 모델 정의
- RL policy 학습 루프 추가
- 실제 또는 synthetic 교통 데이터셋 연결
- diffusion shortcut을 단순 수치 근사에서 학습 기반 sampler로 확장
- FastAPI와 대시보드를 실제 요청/응답 기반으로 연결
- scenario별 KPI 리포트 저장

## 현재 한계

- 현재 웹 대시보드는 로컬 노트북에서 빠르게 동작하도록 설계한 경량 시뮬레이션이다.
- 실제 diffusion 모델 학습/추론은 아직 포함하지 않았다.
- OR-Tools/Gurobi는 adapter 구조만 준비되어 있으며, 대시보드의 즉시 시각화는 브라우저 heuristic을 사용한다.
- RL은 아직 학습된 policy가 아니라 재의사결정 로직의 위치와 흐름을 보여주는 rule-based placeholder다.
