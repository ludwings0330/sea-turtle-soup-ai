# CLAUDE.md — 프로젝트 지식

> 프로젝트 루트에 배치. Claude Code가 자동 참조.

## 참조 문서
- `docs/PROJECT_SPEC.md` — 기술 스택, 아키텍처, 구현 순서
- `docs/FUNCTION_SPEC.md` — 기능 상세, API, 상태 관리
- `docs/DESIGN_SYSTEM.md` — 컬러, 타이포, 컴포넌트, 레이아웃

## 핵심 원칙
- Next.js App Router + TypeScript
- 별도 백엔드 없음 — API는 `app/api/` Route Handler로만 구현
- AI는 Ollama 로컬 서버 (`http://localhost:11434`)
- 전말은 서버 세션에만 보관, 클라이언트 절대 미노출

## 에이전트 호출 규칙
- 질문 입력 → `POST /api/chat/judge` (3b 분류 → 필요시 12b)
- 힌트 버튼 → `POST /api/chat/hint` (3b)
- 문제 생성/평가 → 12b

## AI Provider
환경변수 `AI_PROVIDER`로 교체. `lib/providers/` 참조.

---

## 하네스: 바다거북스프 개발 파이프라인

**목표:** 와이어프레임부터 Cloudflare Tunnel 배포까지 전체 개발 파이프라인 조율

**트리거:** 화면 구현, API 개발, AI 에이전트, QA, 배포 등 개발 작업 시 `web-dev-pipeline` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-08 | 초기 구성 | 전체 | - |
| 2026-04-10 | 하네스 신규 구축 | .claude/agents/ (5명) + .claude/skills/web-dev-pipeline | 와이어프레임~배포 파이프라인 에이전트 팀 구성 |
