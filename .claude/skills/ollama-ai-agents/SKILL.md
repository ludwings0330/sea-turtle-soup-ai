---
name: ollama-ai-agents
description: "바다거북스프 Ollama AI 에이전트 구현 스킬. AIProvider 추상화, 판정/힌트/생성 에이전트 프롬프트, Ollama API 연동. AI 에이전트 수정, 프롬프트 튜닝, Provider 교체 요청 시 반드시 이 스킬을 사용할 것."
---

# Ollama AI 에이전트 구현

## 참조 문서
`docs/PROJECT_SPEC.md` (멀티 에이전트 구조, 모델 배정)를 작업 전 읽는다.

## Provider 추상화

```typescript
// lib/providers/interface.ts
export interface Message { role: 'user' | 'assistant' | 'system'; content: string }
export interface AIProvider {
  chat(messages: Message[], options?: { model?: string }): Promise<string>
}
```

```typescript
// lib/providers/ollama.ts — OLLAMA_BASE_URL 환경변수 사용
// lib/providers/claude.ts — ANTHROPIC_API_KEY 환경변수 사용
// lib/providers/index.ts — AI_PROVIDER 환경변수로 분기
```

## 3개 에이전트 구현

### 판정 에이전트 (`lib/agents/judge.ts`) — llama3.2:3b
**2단계 처리:**
1. 3b로 `질문` vs `정답시도` 분류 (단답 강제)
2. 질문 → 3b로 예/아니오/관련없음 판정
   정답시도 → 12b(gemma3)로 전말과 비교

**시스템 프롬프트 원칙:**
- 전말을 system 컨텍스트로만 전달
- 단답만 반환하도록 강제 ("예", "아니오", "관련없음" 외 출력 금지)
- 정답 시 전말 설명 포함

### 힌트 에이전트 (`lib/agents/hint.ts`) — llama3.2:3b
- 전말을 직접 노출하지 않고 유도형 힌트 제공
- 이전 힌트 히스토리를 받아 중복 방지
- `remainingHints`는 Route Handler에서 관리 (에이전트 책임 아님)

### 생성/평가 에이전트 (`lib/agents/generate.ts`) — gemma3:12b
- 문제 생성: 제목(title) + 상황(description) + 전말(answer) 구조화 출력
- 품질 평가: `EvaluationResult` JSON 구조로 출력 강제
- 응답은 JSON 파싱 가능하도록 프롬프트에서 강제

## 성능 최적화
- **컨텍스트 압축**: 대화 10턴 초과 시 3b로 요약 → 히스토리 교체
- **캐싱**: 동일 질문(normalized) Map 캐시, 게임 세션 단위로 유효

## Ollama API
```
POST http://localhost:11434/api/chat
{ model, messages, stream: false }
```
타임아웃 10초, 실패 시 1회 재시도.
