---
name: web-qa
description: "바다거북스프 통합 QA 스킬. API-프론트 경계면 교차 검증, 게임 플로우 테스트, 전말 보안 검사, 모바일 UX 확인. QA, 테스트, 버그 확인 요청 시 반드시 이 스킬을 사용할 것."
---

# 통합 QA

## 핵심 원칙
파일 존재 확인이 아닌 **경계면 교차 비교**를 한다.
- API Route의 응답 타입과 프론트 fetch 코드의 파싱 로직을 동시에 읽어 불일치를 찾는다

## 검증 체크리스트

### 1. 타입 정합성
- [ ] `JudgeResponse` — Route Handler 응답 shape vs 프론트 `fetch` 결과 처리
- [ ] `HintResponse` — `remainingHints` 처리 일치
- [ ] `GenerateResponse` — `sessionId` 프론트에서 수신 후 저장 확인
- [ ] `EvaluationResult` — 5개 필드 모두 pending.json에 저장

### 2. 보안
- [ ] `/api/chat/judge` 응답에 `answer`(전말) 미포함
- [ ] `/api/chat/hint` 응답에 `answer` 미포함
- [ ] `/api/puzzle` GET 응답에 `answer` 미포함
- [ ] 세션 만료 후 `/api/chat/judge` 요청 시 404 반환

### 3. 게임 플로우
- [ ] 정상 종료: 정답 입력 → `gameOver: true` → 게임 종료 UI
- [ ] 정답 공개: `/api/chat/reveal` → 전말 표시 → 게임 종료 UI
- [ ] 힌트 3회 소진: 4번째 요청 시 에러 응답
- [ ] 문제 선택 → 세션 생성 → 게임 시작 흐름

### 4. 모바일 UX (DESIGN_SYSTEM.md 기준)
- [ ] 버튼/입력 터치타겟 52px 이상
- [ ] 게임 화면 입력창 `position: fixed; bottom: 0`
- [ ] `env(safe-area-inset-bottom)` 적용
- [ ] CSS 변수 사용 (하드코딩 색상값 없음)
- [ ] `max-width: 480px` 적용

## 보고서 형식
`_workspace/03_qa/report.md`에 작성:
```
## QA 보고서

### 통과
- [항목]: 이상 없음

### 버그
- [항목]: [증상] — 파일:라인 수준 위치 + 수정 제안
```
