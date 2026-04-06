# ScenarioPilot

`ScenarioPilot`은 조건부 diffusion으로 미래 수요, 교통, 혼잡, 지연 시나리오를 생성하고, routing/scheduling 최적화와 RL 방식의 실시간 재의사결정을 연결해 보여주는 웹 기반 운영 데모다.

포트폴리오 문장으로는 다음처럼 정리할 수 있다.

> Conditional diffusion으로 미래 수요·혼잡·지연 시나리오를 생성하고, shortcut sampling으로 생성 시간을 줄인 뒤, routing/scheduling 최적화와 RL re-decision을 결합해 fleet 운영 전략을 갱신하는 시스템을 구현했다.

## 현재 구현

- `apps/dashboard`
  - Vite + React 기반 운영 대시보드
  - 웹 맵 위에서 수요, 혼잡, 지연 heat field를 생성
  - 차량이 route를 따라 이동하며 optimizer 결과를 시각화
  - 12-step teacher diffusion과 4-step shortcut sampling 비교
  - RL re-decision 액션과 예상 saving 표시
- `services/api`
  - FastAPI 백엔드 스켈레톤
  - `/scenario`: 조건부 scenario field 생성
  - `/optimize`: routing/scheduling 최적화 응답
  - `/shortcut-benchmark`: teacher vs shortcut score 비교
  - Gurobi / OR-Tools가 설치된 환경에서는 solver adapter로 확장 가능

## 실행

대시보드:

```bash
npm install
npm run dev:dashboard
```

FastAPI:

```bash
cd services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

정적 빌드:

```bash
npm run build:dashboard
```

## 배포

`main` 브랜치에 push되면 `.github/workflows/deploy-dashboard.yml`이 `apps/dashboard`를 빌드해 GitHub Pages에 배포한다.

처음 레포를 만든 뒤 GitHub Settings → Pages에서 source를 `GitHub Actions`로 한 번만 설정하면 된다. 정적 대시보드는 GitHub Pages에서 동작하고, FastAPI는 로컬 또는 별도 서버에서 운영하는 구조로 분리했다.

## 포트폴리오 포인트

- KIA 직무의 `생산·판매·물류·모빌리티` 문제로 바로 확장 가능한 구조
- diffusion을 단순 이미지 생성이 아니라 `uncertainty scenario generator`로 사용
- OR-Tools/Gurobi 기반 최적화와 RL re-decision을 붙일 수 있는 운영형 아키텍처
- shortcut diffusion을 사용해 여러 step의 teacher 결과를 few-step sampler가 근사하도록 표현

## 한계와 다음 단계

- 현재 브라우저 데모는 실제 대형 diffusion 모델을 브라우저에서 학습/추론하는 방식이 아니라, conditional denoising 과정을 경량 수치 시뮬레이션으로 재현한다.
- 다음 단계에서는 실제 교통/수요 데이터셋 또는 synthetic benchmark를 붙이고, OR-Tools VRP solver를 기본 solver로 활성화한다.
- Gurobi는 라이선스가 필요하므로 adapter만 두고, 설치된 환경에서만 사용하도록 설계한다.
