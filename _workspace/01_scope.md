# P2 구현 범위

## 마일스톤
CLI 채팅 게임 end-to-end 동작 (단일 에이전트: judge → host 내부 호출)

## 백엔드 태스크
- `backend/agents/host.py`: host 에이전트 (judge 결과 + 대화 기록 → 자연어 응답)
- `backend/agents/judge.py`: truth를 context에 포함해 판정 정확도 개선
- `backend/routers/game.py`: 전면 재작성
  - `GET  /api/stories`: 스토리 목록 (truth strip)
  - `POST /api/game/start`: 세션 초기화 → session_id 반환
  - `POST /api/game/turn`: judge → host → 응답 반환
  - `POST /api/game/end`: 게임 종료
- 인메모리 세션 스토어 (UUID키 dict)

## 프론트엔드 태스크 (Next.js 16 주의)
- `frontend/app/page.tsx`: 스토리 선택 화면 (GET /api/stories → 목록 표시 → /game?id= 이동)
- `frontend/app/game/page.tsx`: 게임 루프 (useSearchParams로 id 읽기 → start → turn)
- `frontend/components/MessageLog.tsx`: 자동 스크롤 추가

## Next.js 16 Breaking Changes 대응
- server component의 searchParams/params는 async → 게임 페이지는 "use client" + useSearchParams() hook 사용
- Turbopack이 기본값 (별도 대응 불필요)

## 제외 (P3 이후)
- orchestrator 에이전트
- hint 에이전트 (조건부 제공)
- 멀티 에이전트 태그 (P3)
- 점수 화면 (P5)
