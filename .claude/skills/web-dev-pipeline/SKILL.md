---
name: web-dev-pipeline
description: "바다거북스프 AI 게임 개발 파이프라인 오케스트레이터. 화면 구현, API 개발, AI 에이전트 구현, QA, 배포를 와이어프레임부터 배포까지 조율. '개발 시작', '기능 추가', '구현해줘', '배포해줘', '다시 실행', '수정해줘', 'QA', '테스트' 등 개발 관련 모든 작업 요청 시 반드시 이 스킬을 사용할 것."
---

# 바다거북스프 개발 파이프라인 오케스트레이터

**실행 모드:** 하이브리드 (Phase 1: 서브에이전트, Phase 2: 에이전트 팀, Phase 3-4: 서브에이전트)

## Phase 0: 컨텍스트 확인

`_workspace/` 디렉토리 존재 여부 확인:
- **없음** → 초기 실행, Phase 1부터 전체 진행
- **있고 + 부분 수정 요청** → 해당 Phase만 재실행
- **있고 + 새 입력** → `_workspace/`를 `_workspace_prev/`로 이동 후 새 실행

## Phase 1: MVP [서브에이전트: ai-agent-engineer]

**실행 모드:** 서브에이전트

`ai-agent-engineer` 에이전트 호출 (`model: "opus"`):
```
목표: Ollama Provider + 판정 에이전트 MVP 구현
참조: docs/PROJECT_SPEC.md, docs/FUNCTION_SPEC.md
출력: _workspace/01_mvp/ (Provider 구조 + 판정 에이전트 + 기본 Route Handler)
```

MVP 완료 조건: `lib/providers/` + `lib/agents/judge.ts` + `app/api/chat/judge/route.ts`

## Phase 2: 전체 개발 [에이전트 팀]

**실행 모드:** 에이전트 팀

```
TeamCreate(
  name: "sea-turtle-dev",
  members: [frontend-engineer, backend-engineer, ai-agent-engineer]
)
```

작업 등록:
```
TaskCreate([
  { id: "api-types", agent: "backend-engineer",
    desc: "API 타입 정의 파일 작성 (JudgeResponse, HintResponse, GenerateResponse, EvaluationResult)" },
  { id: "ai-agents", agent: "ai-agent-engineer", depends: ["api-types"],
    desc: "힌트/생성 에이전트 + 컨텍스트 압축 + 캐싱 구현" },
  { id: "api-routes", agent: "backend-engineer", depends: ["api-types"],
    desc: "전체 API Routes 구현 (judge/hint/reveal/puzzle/admin)" },
  { id: "frontend", agent: "frontend-engineer", depends: ["api-types"],
    desc: "5개 화면 구현 (/, /select, /game, /submit, /admin), DESIGN_SYSTEM.md 준수" },
])
```

팀 통신 프로토콜:
- backend-engineer → SendMessage(frontend-engineer): "api-types 완료, 경로: `_workspace/02_dev/types.ts`"
- ai-agent-engineer → SendMessage(backend-engineer): "Provider 인터페이스 확정, 세션에서 answer 전달 방식 협의"
- 팀원들이 자체 조율하며 진행

출력: `_workspace/02_dev/frontend/`, `_workspace/02_dev/backend/`, `_workspace/02_dev/ai/`

Phase 2 완료 후 `TeamDelete`.

## Phase 3: QA [서브에이전트: qa-engineer]

**실행 모드:** 서브에이전트

`qa-engineer` 에이전트 호출 (`model: "opus"`):
```
목표: 경계면 교차 검증 + 게임 플로우 + 보안 + 모바일 UX
입력: _workspace/02_dev/ 전체
출력: _workspace/03_qa/report.md
```

QA 보고서에서 버그 발견 시: 수정 대상 에이전트에게 수정 요청 후 재QA (최대 1회).

## Phase 4: 배포 [서브에이전트: devops-engineer]

**실행 모드:** 서브에이전트

`devops-engineer` 에이전트 호출 (`model: "opus"`):
```
목표: Cloudflare Tunnel 설정 + 배포 체크리스트
입력: docs/PROJECT_SPEC.md, _workspace/
출력: _workspace/04_deploy/checklist.md, .env.local.example
```

## Phase 5: 정리

- `_workspace/` 보존 (감사 추적용)
- 최종 요약 출력: 구현된 파일 목록, QA 결과, 배포 방법

---

## 에러 핸들링
- 에이전트 실패: 1회 재시도, 재실패 시 해당 Phase 건너뛰고 보고서에 기록
- 타입 불일치: QA에서 발견 시 backend-engineer 재호출

## 테스트 시나리오

### 정상 흐름
1. "개발 시작해줘" → Phase 0 확인 → MVP → 전체 개발 → QA → 배포
2. "게임 화면 수정해줘" → Phase 0 (`_workspace` 존재) → frontend-engineer만 재호출

### 에러 흐름
1. Ollama 미설치 상태에서 MVP 진행 → ai-agent-engineer가 curl 테스트 실패 감지 → devops-engineer 선행 호출 제안
