---
name: turtle-soup-dev
description: >
  거북이 수프 게임(sea-turtle-soup-ai) 개발, 구현, 코드 작성, 에이전트 설계, Phase 진행,
  백엔드/프론트엔드 기능 추가, 버그 수정, 테스트, 통합 검증 요청 시 반드시 이 스킬을 사용하라.
  "P1 구현", "게임 루프 만들어줘", "FastAPI 라우터 작성", "judge 프롬프트 작성", "다시 실행",
  "재실행", "이어서 구현", "수정해줘" 등 모든 개발 작업에 트리거된다.
  단순 코드 설명 질문은 직접 응답 가능.
---

# turtle-soup-dev — 개발 오케스트레이터

## 실행 모드

**하이브리드**: Phase별로 실행 모드가 다르다.
- Phase 2 (병렬 구현): backend-dev + frontend-dev를 서브 에이전트로 병렬 실행
- Phase 3 (프롬프트 설계): prompt-engineer를 서브 에이전트로 실행
- Phase 4 (통합 검증): qa-engineer를 서브 에이전트로 실행

## 워크플로우

### Phase 0: 컨텍스트 확인

`_workspace/` 디렉토리 존재 여부로 실행 모드를 결정한다:
- **초기 실행**: `_workspace/` 없음 → Phase 1부터 전체 실행
- **후속 작업**: `_workspace/` 있음 + 사용자가 특정 부분 수정 요청 → 해당 에이전트만 재호출
- **새 입력**: `_workspace/` 있음 + 새 요청 → `_workspace/`를 `_workspace_prev/`로 이동 후 재실행

### Phase 1: 개발 단계 파악

현재 어떤 개발 단계(P1~P6)인지 확인하고 이번 요청의 범위를 결정한다.

**개발 단계 기준 (CLAUDE.md):**
| Phase | 마일스톤 |
|-------|---------|
| P1 | 브라우저에서 예/아니오 응답 |
| P2 | CLI 게임 end-to-end 동작 |
| P3 | 3개 에이전트 + 태그 UI |
| P4 | 스토리 선택/생성 + admin |
| P5 | 게임 종료 점수 + 제출 평가 |
| P6 | Claude/Gemini 전환 + 외부 접근 |

작업 범위를 `_workspace/01_scope.md`에 저장한다.

### Phase 2: 병렬 구현 (실행 모드: 서브 에이전트)

백엔드와 프론트엔드가 모두 필요한 경우 병렬로 실행한다.

```
Agent(backend-dev, run_in_background=true, model="sonnet")
  → backend-impl 스킬 사용
  → 구현 결과를 _workspace/backend_output/ 에 저장

Agent(frontend-dev, run_in_background=true, model="sonnet")
  → frontend-impl 스킬 사용
  → 구현 결과를 _workspace/frontend_output/ 에 저장
```

백엔드만 또는 프론트엔드만 필요한 경우 해당 에이전트만 단독 실행한다.

### Phase 3: 게임 에이전트 프롬프트 (실행 모드: 서브 에이전트)

AI 에이전트 시스템 프롬프트가 필요한 경우:
```
Agent(prompt-engineer, model="sonnet")
  → agent-prompts 스킬 사용
  → 프롬프트를 _workspace/prompts/ 에 저장
```

Phase 2의 Python 에이전트 파일이 준비된 후 실행한다.

### Phase 4: 통합 검증 (실행 모드: 서브 에이전트)

각 구현 모듈 완성 직후 점진적으로 실행한다:
```
Agent(qa-engineer, model="sonnet")
  → qa-validate 스킬 사용
  → _workspace/qa_report_{timestamp}.md 생성
```

**truth 노출 감사는 매 Phase마다 필수**로 실행한다.

### Phase 5: 결과 통합 및 보고

- 모든 에이전트의 산출물을 실제 프로젝트 파일 위치에 반영한다
- `_workspace/` 내 중간 파일은 보존한다 (감사 추적용)
- 사용자에게 완료된 파일 목록과 다음 단계를 보고한다
- 피드백 수렴: "결과에서 개선할 부분이 있나요?"

## 에러 핸들링

- 에이전트 실패 시 1회 재시도
- 재실패 시 해당 에이전트 건너뛰고 보고서에 누락 표시
- truth 노출 감지 시 즉시 중단하고 사용자에게 보안 경고

## 테스트 시나리오

### 정상 흐름
1. 사용자: "P1 구현해줘"
2. Phase 0: `_workspace/` 없음 → 초기 실행
3. Phase 1: P1 범위 확인 (Ollama 연동 + FastAPI + Next.js 기본 설정)
4. Phase 2: backend-dev + frontend-dev 병렬 실행
5. Phase 4: qa-engineer 통합 검증
6. Phase 5: 완료 보고

### 에러 흐름
1. backend-dev가 Ollama 연동 구현 중 실패
2. 에러 메시지 로그 후 1회 재시도
3. 재시도 후에도 실패 → dev-lead가 사용자에게 보고
4. 사용자 입력 후 접근 방식 변경
