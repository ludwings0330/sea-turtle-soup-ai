---
name: web-dev-pipeline
description: 바다거북스프 Next.js 웹게임의 화면 구현, API Route Handler 개발, Ollama AI 에이전트(판정/힌트/생성) 구현, 문제 CRUD, Cloudflare Tunnel 배포, QA 등 모든 개발 작업을 조율하는 오케스트레이터. "구현", "개발", "만들어", "배포", "QA", "화면", "API", "에이전트", "다시 실행", "재실행", "수정", "보완", "이전 결과 기반" 같은 요청이 들어오면 반드시 이 스킬을 사용할 것. 단순 질문 답변에는 사용하지 않는다.
---

# Web Dev Pipeline — 바다거북스프 개발 오케스트레이터

Next.js + Ollama + Cloudflare Tunnel 파이프라인을 5명 전문 에이전트 팀으로 조율한다.

## 팀 구성

| 에이전트 | 담당 |
|---|---|
| backend-engineer | API Route Handler, 세션, 파일 CRUD |
| frontend-engineer | 5개 화면, Tailwind, 모바일 UX |
| ai-agent-engineer | Ollama Provider, 판정/힌트/생성 프롬프트 |
| devops-engineer | Ollama/Cloudflare Tunnel/환경변수 |
| qa-engineer | 경계면 교차 검증 (general-purpose 타입) |

모든 에이전트는 `model: "opus"`로 호출한다.

## 실행 모드
**에이전트 팀 (기본)** — `TeamCreate`로 팀 구성, `TaskCreate`로 작업 할당, `SendMessage`로 조율.
단, 소규모 단일 작업(예: 버그 1개 수정)은 `Agent` 도구로 해당 전문가 1명만 서브 호출한다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (필수)
1. `_workspace/` 존재 여부 확인
2. 분기:
   - 미존재 → **초기 실행**
   - 존재 + 사용자가 부분 수정 요청 → **부분 재실행** (해당 에이전트만 재호출)
   - 존재 + 새 기능/새 스펙 → 기존 `_workspace/`를 `_workspace_prev/`로 이동 후 **새 실행**
3. `docs/PROJECT_SPEC.md`, `FUNCTION_SPEC.md`, `DESIGN_SYSTEM.md`를 먼저 읽는다 (하네스의 단일 진실 공급원)

### Phase 1: 범위 정의
사용자 요청을 아래 카테고리로 분류:
- **인프라/배포** → devops-engineer 단독 또는 선두
- **AI 에이전트/프롬프트** → ai-agent-engineer 주도, backend 연계
- **API** → backend-engineer 주도
- **화면/UX** → frontend-engineer 주도
- **전체 기능 슬라이스** (API+화면+AI) → 전체 팀

### Phase 2: 팀 구성 및 작업 분배
`TeamCreate`로 팀 생성, `TaskCreate`로 의존성 있는 작업 목록 등록:
1. backend와 frontend는 먼저 API shape을 합의 (SendMessage)
2. ai-agent-engineer는 Provider 인터페이스를 먼저 확정
3. 구현 병렬 진행, 모듈 완성 시마다 qa-engineer 트리거
4. devops-engineer는 배포 단계 또는 환경변수 요구 발생 시

### Phase 3: 점진적 QA
각 모듈 "완성" 보고 직후 qa-engineer를 즉시 호출 (전체 완성까지 대기 금지).
QA 리포트는 `_workspace/qa_report_{phase}.md`.

### Phase 4: 종합 및 보고
리더가 `_workspace/` 산출물을 종합하여 사용자에게 요약 보고 + 후속 피드백 요청.

## 데이터 전달
- **태스크 기반**: 진행 상태는 `TaskCreate`/`TaskUpdate`
- **메시지 기반**: 경계면 합의·shape 변경 통지는 `SendMessage`
- **파일 기반**: 중간 산출물은 `_workspace/{phase}_{agent}_{artifact}.{ext}`, 최종 산출물만 실제 경로

## 에러 핸들링
- 에이전트 실패 시 1회 재시도 → 재실패하면 해당 결과 누락 명시하고 진행
- 상충 결과는 파일 병기, 사용자가 최종 결정

## 핵심 불변 규칙 (모든 에이전트 공통)
1. 전말(`answer`)은 서버 세션에만. 클라이언트 응답·로그·커밋 어디에도 남기지 않는다.
2. AI 호출은 `AIProvider` 인터페이스 경유, 구현체 직접 import 금지.
3. DESIGN_SYSTEM.md 이탈 금지.
4. 시크릿은 `.env.local`에만.

## 테스트 시나리오

**정상 흐름**: 사용자가 "판정 에이전트 구현해줘" 요청 → Phase 0에서 `_workspace/` 없음 확인 → Phase 1에서 AI 에이전트 범위로 분류 → ai-agent가 Provider + judge 프롬프트 작성, backend가 `/api/chat/judge` 연결, qa가 경계면 검증 → `_workspace/qa_report_judge.md` PASS → 사용자 보고.

**에러 흐름**: frontend가 API shape을 오해해 잘못된 필드 참조 → qa가 교차 비교에서 FAIL 감지 → frontend + backend 양쪽에 SendMessage → backend가 정확한 shape 공유, frontend 수정 → qa 재검증.

## 후속 작업
description의 "재실행/수정/보완/이전 결과 기반" 키워드로 재트리거. Phase 0 분기가 부분 재실행 경로를 처리한다.
