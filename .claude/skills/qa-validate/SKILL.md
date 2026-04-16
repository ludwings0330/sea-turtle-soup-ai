---
name: qa-validate
description: >
  sea-turtle-soup-ai API 통합 테스트, 보안 감사(truth 필드 노출 방지), 프론트-백 연동 검증.
  구현 완료 후 검증, truth 필드 감사, API shape 비교, 에러 처리 테스트가 필요할 때 사용한다.
  qa-engineer 에이전트가 이 스킬을 사용한다.
---

# qa-validate — 검증 및 보안 감사

## 검증 우선순위

1. **truth 보안 감사** (항상 최우선)
2. API 엔드포인트 동작
3. 프론트-백 shape 일치
4. 에러 처리

## 1. truth 보안 감사

truth 필드 노출은 게임의 핵심 보안 취약점이다. 모든 구현 후 아래를 반드시 확인한다.

### 감사 체크리스트

**백엔드 코드 정적 분석:**
```
grep -rn "truth" backend/routers/
```
- `truth`가 응답 딕셔너리에 포함되는 경우 즉시 보고
- `story.pop("truth", None)` 또는 `strip_truth()` 호출이 있는지 확인

**API 응답 확인 (코드 추적):**
- `GET /api/stories`: stories.json 읽기 → truth 제거 → 반환 흐름 추적
- `POST /api/game/start`: 세션 초기화 → situation만 저장 → truth 없음 확인
- `POST /api/game/turn`: 응답 JSON에 truth 없음 확인
- `POST /api/game/end`: scorer 결과만 반환 (truth 없음)

### 보고 형식 (위반 발견 시)
```
[보안 위반] truth 필드 노출
파일: backend/routers/game.py:45
코드: return {"story": story}  # truth 포함됨
수정: story.pop("truth", None) 추가 후 반환
```

## 2. API 엔드포인트 검증

각 엔드포인트에 대해 코드를 읽고 CLAUDE.md 명세와 비교한다.

| 엔드포인트 | 검증 항목 |
|-----------|---------|
| POST /api/game/start | story_id/"generate" 처리, 세션 ID 반환 |
| POST /api/game/turn | judge+host 응답, hint 조건부 포함 |
| POST /api/game/end | scorer JSON 형식 |
| GET /api/stories | 배열 반환, truth 없음 |
| GET /admin/pending | 인증 없으면 401 |
| POST /admin/approve | 인증 후 stories.json 업데이트 |
| POST /admin/reject | 인증 후 pending.json 업데이트 |

## 3. 프론트-백 shape 비교

프론트엔드 타입 정의와 백엔드 응답 구조를 동시에 읽어 불일치를 탐지한다.

**확인 방법:**
1. `backend/routers/game.py`의 반환 딕셔너리 키 목록 추출
2. `frontend/app/game/page.tsx` (또는 관련 파일)의 타입 정의 확인
3. 키 이름, 타입, 필수/선택 여부 비교

**흔한 불일치 패턴:**
- 백엔드 `session_id` vs 프론트 `sessionId` (snake_case vs camelCase)
- 백엔드 `hint: null` vs 프론트가 `hint: undefined` 기대
- 백엔드 에이전트 태그 `"host"` vs 프론트 타입에 `"host"` 미포함

## 4. 에러 처리 검증

**코드 분석으로 확인:**

```python
# Ollama 오프라인 처리
except httpx.ConnectError:
    raise HTTPException(status_code=503, detail="로컬 모델 오프라인")
# → 코드에서 이 패턴이 있는지 확인
```

| 시나리오 | 기대 동작 |
|---------|---------|
| Ollama 오프라인 | HTTP 503, "로컬 모델 오프라인" |
| LLM 파싱 실패 | 1회 재시도 → fallback |
| 잘못된 admin 비밀번호 | HTTP 401 |
| 존재하지 않는 story_id | HTTP 404 |

## 5. CORS 설정 검증

```python
# main.py에서 확인
allow_origins=["http://localhost:3000"]  # 다른 오리진 없어야 함
```

와일드카드(`"*"`) 설정은 보안 취약점으로 보고한다.

## 리포트 형식

`_workspace/qa_report_{timestamp}.md`에 저장:

```markdown
# QA 리포트 — {날짜}

## 요약
- 통과: N개
- 실패: N개
- 보안 이슈: N개

## 통과 항목
- [x] truth 필드 노출 없음 (GET /api/stories)
- [x] CORS localhost:3000만 허용
...

## 실패 항목
- [ ] **[보안]** GET /api/stories 응답에 answer_keywords 포함
  파일: backend/routers/story.py:23
  수정: strip_truth() 함수에 answer_keywords 제거 추가

## 권고사항
- ...
```
