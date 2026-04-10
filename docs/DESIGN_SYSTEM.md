# 바다거북스프 AI 게임 — 디자인 시스템

## 방향
- CLI 터미널 컨셉 — 레트로 터미널 에뮬레이터 느낌
- Mobile First (기준 해상도: 390px)
- 모노스페이스 폰트, 프롬프트 `>` 표시, 타이핑 효과

---

## 컬러 (5개)
```css
--color-bg      : #0d0d0d;  /* 배경 — 터미널 블랙 */
--color-surface : #1a1a1a;  /* 카드, 입력창 */
--color-primary : #00ff41;  /* 터미널 그린 */
--color-text    : #00ff41;  /* 본문 텍스트 */
--color-muted   : #006b1b;  /* 보조 텍스트, 비활성 */
```

---

## 타이포그래피
- **폰트**: `JetBrains Mono` (모노스페이스)
- CDN: Google Fonts

```css
--text-xs   : 11px;
--text-sm   : 13px;
--text-base : 15px;
--text-lg   : 17px;
--text-xl   : 20px;

--font-regular : 400;
--font-bold    : 700;
```

---

## 스페이싱
```css
--space-xs  : 4px;
--space-sm  : 8px;
--space-md  : 16px;
--space-lg  : 24px;
--space-xl  : 32px;
--space-2xl : 48px;
```

---

## 효과
```css
/* 커서 깜빡임 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.cursor::after {
  content: '_';
  animation: blink 1s step-end infinite;
}

/* 레트로 지지직 효과 — 주기적, 약하게 */
@keyframes flicker {
  0%, 89%, 91%, 93%, 100% { opacity: 1; }
  90%                      { opacity: 0.97; }
  92%                      { opacity: 0.94; }
}
body {
  animation: flicker 8s infinite;
}

/* 스캔라인 오버레이 */
body::after {
  content: '';
  position: fixed; inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.05) 2px,
    rgba(0,0,0,0.05) 4px
  );
  pointer-events: none;
  z-index: 9999;
}

/* AI 응답 타이핑 효과 */
@keyframes typing {
  from { width: 0; }
  to   { width: 100%; }
}
```

---

## 컴포넌트 규칙

### 프롬프트 라인
```
> You: [입력 내용]
> AI:  [응답 내용]
```

### 버튼
```css
background: transparent;
color: var(--color-primary);
border: 1px solid var(--color-primary);
height: 52px;
border-radius: 2px;
font-family: 'JetBrains Mono';
letter-spacing: 1px;

/* hover */
background: var(--color-primary);
color: var(--color-bg);
```

### 입력창
```css
background: transparent;
border: none;
border-bottom: 1px solid var(--color-primary);
color: var(--color-primary);
font-family: 'JetBrains Mono';
font-size: var(--text-base);
caret-color: var(--color-primary);
```

### 구분선
```
> ──────────────────────────────
```

---

## 화면별 레이아웃

### 랜딩 (`/`)
```
████████╗██╗   ██╗██████╗ ████████╗██╗     ███████╗
...

> 바다거북스프 v1.0.0
> 시스템 초기화 중...........OK
> AI 에이전트 연결 중.........OK
>
> ──────────────────────────────
> 바다거북스프는 수평적 사고 퍼즐입니다.
> AI가 제시하는 기묘한 상황의 전말을
> 예/아니오 질문만으로 추리하세요.
> ──────────────────────────────
>
> [1] 게임 시작
> [2] 스토리 제출
>
> 선택하세요: _
```

### 문제 선택 (`/select`)
```
> 문제를 선택하세요.
> ──────────────────────────────
>
> [1] 바다거북 스프          ★★★☆☆
> [2] 엘리베이터의 남자      ★★★★☆
> [3] 전쟁터의 외과의사      ★★☆☆☆
>
> [0] 진행자에게 새 사건을 요청한다
>
> ──────────────────────────────
> 선택하세요: _
```

### 게임 (`/game`)
```
> ──────────────────────────────
> [CASE FILE #002]
>
> 한 남자가 매일 아침 엘리베이터를 타고
> 1층으로 내려간다. 하지만 돌아올 때는
> 7층까지만 타고 나머지는 걸어서 올라간다.
> 왜일까?
> ──────────────────────────────
>
> You: 남자는 건강한 사람인가요?
> AI:  네.
>
> You: 엘리베이터가 고장난건가요?
> AI:  아니오.
>
> ──────────────────────────────
> [H] 힌트 (2/3)  [A] 정답공개
> You: _
```

### 스토리 제출 (`/submit`)
```
> 스토리 제출 모드
> ──────────────────────────────
> AI가 제출된 스토리를 검토합니다.
> 관리자 승인 후 공개됩니다.
> ──────────────────────────────
>
> 닉네임: _
>
> 문제 상황: _
>
> 전말: _
>
> ──────────────────────────────
> [S] 제출하기  [Q] 취소
```

### 관리자 (`/admin`)
```
> 관리자 모드
> ──────────────────────────────
> [대기중: 3건]
>
> #001 닉네임: 홍길동
>      논리: 4/5  흥미: 3/5
>      [A] 승인  [R] 반려
>
> ──────────────────────────────
```

---

## 모바일 UX 규칙
- 터치 타겟 최소 높이: 52px
- 하단 입력창 고정: `position: fixed; bottom: 0`
- 키보드 대응: `padding-bottom: env(safe-area-inset-bottom)`
- 최대 너비: 480px, 데스크탑 중앙 정렬
- 좌우 패딩: 16px

## 텍스트 줄바꿈 처리
```css
/* 일반 터미널 텍스트 — 모바일 줄바꿈 허용 */
.terminal-line {
  white-space: pre-wrap;
  word-break: break-word;
}

/* ASCII Art 전용 — 줄바꿈 금지, 극소화 */
.ascii-art {
  white-space: pre;
  font-size: 8px;
  line-height: 1.2;
  overflow-x: hidden;
}
```
- ASCII Art는 모바일용 축소 버전 별도 제작 (가로 30자 이내 권장)
- 나머지 텍스트는 pre-wrap으로 자연스럽게 줄바꿈
