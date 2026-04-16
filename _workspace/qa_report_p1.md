# QA 리포트 — P1

## 요약
- 통과: 8개
- 실패: 1개
- 보안 이슈: 0개 (critical), 1개 (low — 주의 필요)

---

## 통과 항목

- [x] **[보안] truth 필드 API 응답 미포함** — `ChatResponse` 모델은 `judge: str` 필드만 가짐. truth 절대 노출 없음. (`backend/routers/game.py:13-15`)
- [x] **[보안] judge 프롬프트 truth 미포함** — `JUDGE_SYSTEM_PROMPT`는 `{situation}`만 interpolate. truth 필드 참조 없음. (`backend/agents/judge.py:7-14`)
- [x] **[보안] stories.json truth 백엔드 보관** — truth 필드가 파일에 존재하나 백엔드 전용 파일. 라우터에서 직접 읽어 프론트로 보내는 코드 없음. 정상.
- [x] **CORS 설정** — `allow_origins=["http://localhost:3000"]` 단일 origin만 허용. spec 준수. (`backend/main.py:9`)
- [x] **Ollama 오프라인 에러 처리** — `httpx.ConnectError` 캐치 → `HTTPException(status_code=503, detail="로컬 모델 오프라인")` 반환. (`backend/agents/judge.py:28-29`)
- [x] **LLM 파싱 실패 재시도** — `_parse_judge_response` 결과 None 시 1회 재시도 후 fallback `"관련없음"` 반환. (`backend/agents/judge.py:50-55`)
- [x] **MODEL_CONFIG 단일 참조** — judge.py에서 모델명 하드코딩 없음. `MODEL_CONFIG["judge"]` 경유. (`backend/agents/judge.py:20`)
- [x] **프론트-백 API shape 일치**
  - Request: FE → `{ user_message: string, situation: string }` / BE ← `ChatRequest(user_message: str, situation: str)` — 일치
  - Response: BE → `ChatResponse(judge: str)` / FE ← `data.judge` 파싱 — 일치
  - 엔드포인트: FE `POST http://localhost:8000/api/chat` / BE `router` prefix `/api` + `/chat` — 일치

---

## 실패 항목

- [ ] **[low] situation 텍스트 불일치 (하드코딩 이중화)** — `frontend/app/page.tsx:7-9`의 `SITUATION` 상수와 `backend/data/stories.json`의 `stories[0].situation` 텍스트가 미묘하게 다름.
  - FE: `"수프를 한 모금 마신 후, 그는 집으로 돌아가 자살했습니다."`
  - BE(stories.json): `"수프를 한 입 먹은 그는 집에 돌아가 자살했습니다."`
  - 현재 P1에서는 situation이 FE에 하드코딩되어 있어 judge가 FE 버전 텍스트로 동작하므로 기능 오류는 아님. 그러나 P4에서 stories.json 연동 시 불일치 혼란 야기 가능.
  - 파일: `frontend/app/page.tsx:7-9`, `backend/data/stories.json:7`
  - 수정: P4 전에 `GET /api/stories/:id` 엔드포인트에서 situation을 FE로 전달하는 구조로 전환하거나, 두 파일의 텍스트를 통일.

---

## 권고사항

1. **situation 하드코딩 제거 계획 수립** — P4 스토리 로더 구현 시 FE의 `SITUATION` 상수를 삭제하고 `/api/stories` 응답을 사용하도록 변경 예정으로 표시할 것.
2. **stories.json API 미존재** — 현재 `GET /api/stories` 엔드포인트가 없음. P1 범위 밖이나, P4 진입 전 구현 필요. FE가 truth를 직접 파싱하지 않도록 응답에서 truth 필드 strip 필수.
3. **timeout 적절성** — `httpx.AsyncClient(timeout=30.0)` — 로컬 LLM 기준 적절. 다만 P6 Claude/Gemini API 전환 시 timeout 재검토 권장.
4. **`httpx.TimeoutException` 미처리** — `ConnectError`만 잡고 있음. Ollama 응답 지연(30초 초과) 시 `httpx.ReadTimeout`이 500으로 노출될 수 있음. 별도 except 블록 추가 권장.
