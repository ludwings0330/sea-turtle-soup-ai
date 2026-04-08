# 바다거북스프 AI 게임 — 프로젝트 명세

## 개요
AI 진행자 역할의 수평적 사고 퍼즐(바다거북스프) 웹 게임

## 기술 스택
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **AI 런타임**: Ollama (localhost:11434)
- **Data**: 로컬 JSON (문제셋) + 파일 기반 (제출 대기열)
- **배포**: Cloudflare Tunnel (외부 접속, 내 PC가 서버)
- **디자인**: Mobile First

## 아키텍처
```
브라우저 → Next.js Route Handler → Ollama(localhost:11434) → LLM
```
별도 백엔드 없음. Route Handler가 API 서버 역할 겸임.

## AI Provider 추상화
모델 교체 확장성을 위해 Strategy Pattern 적용. 에이전트는 Provider 구현체를 몰라도 됨.
```typescript
interface AIProvider {
  chat(messages: Message[], system: string): Promise<string>
}
class OllamaProvider implements AIProvider { ... }
class ClaudeProvider implements AIProvider { ... }
```
환경변수(`AI_PROVIDER`)로 Provider 교체. 에이전트 코드 수정 불필요.

## 멀티 에이전트 구조
```
# 게임 중
사용자 질문 입력 → [Router: 버튼 타입 기반] → 판정 에이전트
사용자 힌트 버튼 → [Router: 버튼 타입 기반] → 힌트 에이전트

# 문제 관련
사용자 AI 생성 요청 → 생성 에이전트 → 문제+전말 생성 → 즉시 게임 시작
사용자 문제 직접 제출 → 생성 에이전트 → 품질 평가 → 대기열
```
Router는 모델 호출 없이 Next.js 코드에서 버튼 타입으로 단순 분기.

| 에이전트 | 역할 | 모델 |
|---|---|---|
| 판정 | 예/아니오/관련없음 판정 | llama3.2:3b |
| 힌트 | 힌트 제공, 정답 근접 안내 | llama3.2:3b |
| 생성 | 문제+전말 생성, 품질 평가 | gemma3:12b |

## 성능 최적화
- **모델 경량화**: 판정/힌트는 3b, 생성은 12b로 역할별 모델 분리
- **컨텍스트 압축**: 일정 턴 초과 시 오래된 대화를 llama3.2:3b로 요약 후 교체
- **단순 캐싱**: 동일 질문 반복 시 캐시 응답 반환

## 게임 규칙
1. 문제 선택: 기본 문제셋에서 직접 선택 또는 AI 생성 요청
2. AI가 문제(상황) 제시 후 게임 시작
3. 플레이어가 질문 입력 → 판정 에이전트가 예/아니오/관련없음 응답
4. 전말을 완전히 맞히면 종료
5. 힌트 버튼으로 힌트 요청 가능, 정답 공개 가능

## 문제 관리
- **기본 문제셋**: JSON 하드코딩
- **AI 생성**: 요청 시 생성 에이전트가 문제+전말 생성 → 즉시 게임 시작
- **사용자 제출**: 닉네임 입력 후 제출 → 생성 에이전트 품질 평가(논리 일관성, 흥미도) → 관리자 승인 → 공개

## 구현 순서
```
0. 인프라: Ollama 설치 + 모델 다운로드 + curl 테스트
1. MVP: 판정 에이전트 Route Handler + 기본 채팅 UI 연결
2. 에이전트 고도화: 프롬프트 튜닝, 힌트/생성 에이전트 추가
3. 백엔드: 문제 CRUD, 제출/평가/승인 흐름
4. 프론트: 문제 선택, AI 생성, 제출 화면
5. 관리자 페이지: 제출 문제 승인/반려
```

## 디렉토리 구조
```
app/
  page.tsx
  admin/page.tsx
  api/
    chat/judge/route.ts
    chat/hint/route.ts
    puzzle/route.ts          ← 제출(POST) + 목록조회(GET)
    puzzle/generate/route.ts
    admin/puzzle/route.ts    ← 승인/반려
lib/
  providers/
    interface.ts
    ollama.ts
    claude.ts
data/
  puzzles.json
  pending.json
```
