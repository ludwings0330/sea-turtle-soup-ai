# 바다거북스프 AI 게임 — 기능 명세

## 1. 문제 목록 조회
- `GET /api/puzzle` → 승인된 문제 목록 반환 (전말 제외)
- 응답: `{ id, title, description }[]`
  - `title`: 문제 제목
  - `description`: 문제 상황 설명

## 2. AI 문제 생성
- 생성 에이전트(12b)가 문제+전말 생성
- 생성 중 로딩 상태 클라이언트에 전달
- 전말은 서버 세션에만 보관, 클라이언트 미노출
- 생성 완료 즉시 게임 세션 시작
- 생성 실패 시 에러 메시지 반환
- `POST /api/puzzle/generate` → `{ sessionId, puzzle: { id, title, description } }`

## 3. 질문 판정
2단계 모델 호출:
```
입력 → 3b (질문 vs 정답시도 분류)
         ↓
    질문      → 3b가 예 | 아니오 | 관련없음 단답 반환
    정답시도  → 12b가 전말과 비교
                  오답 → "아니오" 반환
                  정답 → "정답입니다! + 전말 전체 설명" 반환 → 게임 종료
```
- `POST /api/chat/judge` 요청: `{ sessionId, message }`
- 응답: `{ type: 'question' | 'answer_attempt', result: string, gameOver: boolean }`

## 4. 힌트 제공
- 힌트 버튼 클릭 시 힌트 에이전트(3b) 호출
- 최대 3회 제한, 초과 시 "힌트를 모두 사용했습니다" 반환
- 이전 힌트 내용을 세션에 보관하여 중복 힌트 방지
- 전말 직접 노출 금지, 유도형 응답
- `POST /api/chat/hint` 요청: `{ sessionId }`
- 응답: `{ hint: string, remainingHints: number }`

## 5. 정답 공개
- 정답 공개 버튼 클릭 시 전말 반환 → 게임 종료
- `POST /api/chat/reveal` 요청: `{ sessionId }`
- 응답: `{ answer: string, gameOver: true }`

## 6. 게임 종료
- 트리거: 정답 맞힘 | 정답 공개
- 종료 후 문제 선택 화면으로 이동 (다시 하기)
- 세션 만료, 대화 히스토리 초기화

## 7. 문제 제출 (사용자)
- 입력: 닉네임(최대 20자), 문제 상황(최대 200자), 전말(최대 500자)
- 제출 후 AI 품질 평가 → pending.json 저장
- 승인/반려 결과는 사용자에게 별도 통보 없음 (로컬 특성상)
- `POST /api/puzzle` 요청: `{ nickname, title, description, answer }`
- 응답: `{ status: 'pending', evaluationResult: EvaluationResult }`

## 8. AI 품질 평가
생성 에이전트(12b)가 제출 문제 평가. 각 항목 1-5점.

| 항목 | 설명 |
|---|---|
| 논리적 일관성 | 전말이 문제 상황을 모순 없이 설명하는가 |
| 추리 가능성 | 질문을 통해 전말에 도달할 수 있는가 |
| 흥미도 | 문제가 흥미롭고 참신한가 |
| 난이도 적절성 | 너무 쉽거나 너무 어렵지 않은가 |
| 완결성 | 문제와 전말이 충분한 정보를 담고 있는가 |

- pass 기준: 추후 결정
- 평가 결과를 pending.json에 저장 → 관리자 검토 대기

```typescript
type EvaluationResult = {
  logic: number        // 논리적 일관성 1-5
  inferability: number // 추리 가능성 1-5
  interest: number     // 흥미도 1-5
  difficulty: number   // 난이도 적절성 1-5
  completeness: number // 완결성 1-5
  pass: boolean        // 추후 기준 결정
}
```

## 9. 관리자 승인/반려
- 접근 권한 없음 (로컬 전용, 의도적)
- 반려 사유 입력 불필요
- `GET /api/admin/puzzle` → 대기 중인 문제 목록 (평가 결과 포함)
- `PATCH /api/admin/puzzle` 요청: `{ id, action: 'approve' | 'reject' }`
- 승인 시 puzzles.json 추가, 반려 시 pending.json에서 삭제

## 상태 관리
- **대화 히스토리**: 클라이언트 메모리 (탭 닫으면 소멸)
- **전말/게임 세션**: 서버 메모리(Map), 마지막 요청으로부터 30분 후 만료
- **힌트 히스토리**: 서버 세션에 포함
- 서버 재시작 시 세션 전체 소멸 (로컬 환경, 의도적)

## 에이전트 응답 타입
```typescript
// 판정 에이전트
type JudgeResponse = {
  type: 'question' | 'answer_attempt'
  result: string   // 단답(예/아니오/관련없음) 또는 정답시 전말 설명
  gameOver: boolean
}

// 힌트 에이전트
type HintResponse = {
  hint: string
  remainingHints: number
}

// 생성 에이전트 (서버 내부용)
type GenerateInternal = {
  title: string
  description: string
  answer: string
}

// 생성 에이전트 (클라이언트 응답용)
type GenerateResponse = {
  sessionId: string
  puzzle: Omit<GenerateInternal, 'answer'>
}
```

## 화면 목록
| 화면 | 경로 | 역할 |
|---|---|---|
| 랜딩 | `/` | 서비스 소개, 게임 시작 진입점 |
| 문제 선택 | `/select` | 문제 목록 조회, 진행자에게 새 사건 요청 |
| 게임 | `/game` | 질문/힌트/정답공개, 채팅 UI |
| 문제 제출 | `/submit` | 닉네임 + 문제 + 전말 입력 |
| 관리자 | `/admin` | 제출 문제 승인/반려 |
