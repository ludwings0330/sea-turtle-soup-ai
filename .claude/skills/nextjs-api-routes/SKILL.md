---
name: nextjs-api-routes
description: "바다거북스프 Next.js API Route Handler 구현 스킬. 게임 세션 관리, 판정/힌트/생성 엔드포인트, 파일 CRUD. API 구현, 엔드포인트 추가, 백엔드 로직 요청 시 반드시 이 스킬을 사용할 것."
---

# Next.js API Routes 구현

## 참조 문서
`docs/FUNCTION_SPEC.md`를 작업 전 반드시 읽는다.

## 세션 관리

```typescript
// lib/session.ts
type GameSession = {
  puzzleAnswer: string
  hintHistory: string[]
  conversationHistory: Message[]
  expiresAt: number
}
const sessions = new Map<string, GameSession>()

// 30분 TTL — 각 요청마다 expiresAt 갱신
// 만료 정리: setInterval로 1분마다 순회
```

## 엔드포인트 구현 순서

1. **`POST /api/chat/judge`** — 판정 (MVP 1순위)
   - `{ sessionId, message }` → AI 판정 → `JudgeResponse`
   - 세션에서 전말 조회, AI Provider로 판정
   - `gameOver: true`이면 세션 정리

2. **`POST /api/chat/hint`** — 힌트
   - `{ sessionId }` → `HintResponse`
   - 힌트 3회 초과 시 `remainingHints: 0`, 에러 응답

3. **`POST /api/chat/reveal`** — 정답 공개
   - `{ sessionId }` → `{ answer, gameOver: true }`
   - 세션에서 전말 반환 후 세션 정리

4. **`GET /api/puzzle`** — 문제 목록 (전말 제외)
   - `puzzles.json` 읽기 → `{ id, title, description }[]`

5. **`POST /api/puzzle/generate`** — AI 문제 생성
   - 생성 에이전트(12b) 호출 → 세션 생성 → `GenerateResponse`

6. **`POST /api/puzzle`** — 문제 제출
   - 품질 평가(12b) → `pending.json` 저장 → `{ status: 'pending', evaluationResult }`

7. **`GET /api/admin/puzzle`** + **`PATCH /api/admin/puzzle`** — 관리자

## 보안 원칙
- 전말은 절대 클라이언트 응답에 포함하지 않는다
- `puzzles.json`의 `answer` 필드를 `GET /api/puzzle` 응답에서 제거한다

## 파일 CRUD
```typescript
// data/puzzles.json: Puzzle[]
// data/pending.json: PendingPuzzle[]
// 원자적 쓰기: 임시 파일에 쓴 후 rename
```
