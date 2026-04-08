---
name: nextjs-frontend
description: "바다거북스프 Next.js 화면 구현 스킬. 5개 화면(/, /select, /game, /submit, /admin) 컴포넌트 작성, DESIGN_SYSTEM.md 준수, 모바일 UX, API 연동. 화면 구현, UI 수정, 컴포넌트 작성 요청 시 반드시 이 스킬을 사용할 것."
---

# Next.js Frontend 구현

## 참조 문서
작업 전 반드시 `docs/DESIGN_SYSTEM.md`와 `docs/FUNCTION_SPEC.md`를 읽는다.

## 디자인 시스템 적용
- CSS 변수는 `globals.css`에 정의 (`--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-muted`)
- Tailwind의 임의값(`[#0d0d0f]`)으로 직접 색상 사용 금지 — 반드시 CSS 변수 참조
- 폰트: `Noto Serif KR` (Google Fonts, `layout.tsx`에서 로드)

## 화면별 핵심 구현 사항

### `/` — 랜딩
- 타이틀 + 부제목 중앙 배치
- [게임 시작] → `/select`, [문제 제출] → `/submit`

### `/select` — 문제 선택
- `GET /api/puzzle` 호출 → 문제 카드 목록
- [AI가 골라줘] → `POST /api/puzzle/generate` → 로딩 → `/game`으로 이동
- 문제 카드 클릭 → 해당 문제로 게임 시작

### `/game` — 게임 (핵심 화면)
```
레이아웃:
- Header (고정): 문제 제목
- 채팅 영역 (스크롤): 말풍선 목록
- Footer (고정): [힌트][정답 공개] + 입력창 + 전송
```
- 입력창: `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)`
- 말풍선: AI응답(left, border-left red), 플레이어(right, border muted)
- 판정: `POST /api/chat/judge` → 응답 타입에 따라 `gameOver` 처리
- 힌트: `POST /api/chat/hint` → `remainingHints` 표시
- 정답 공개: `POST /api/chat/reveal` → 전말 표시 → 게임 종료

### `/submit` — 문제 제출
- 닉네임(max 20), 문제 상황(max 200), 전말(max 500) 입력
- `POST /api/puzzle` → 평가 결과 표시

### `/admin` — 관리자
- `GET /api/admin/puzzle` → 대기 목록
- 각 카드: 평가 점수 표시 + [승인][반려]
- `PATCH /api/admin/puzzle`

## 상태 관리
- `sessionId`: 게임 시작 시 서버에서 받아 클라이언트 메모리에 보관
- 대화 히스토리: 클라이언트 메모리 (`useState`)
- 전말은 클라이언트 상태에 저장하지 않는다

## 모바일 UX 필수 규칙
- 모든 버튼/입력: 터치 타겟 최소 `height: 52px`
- 최대 너비: `max-w-[480px] mx-auto`
- 좌우 패딩: `px-4` (16px)
