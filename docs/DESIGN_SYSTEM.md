# 바다거북스프 AI 게임 — 디자인 시스템

## 방향
- 크라임씬 느낌 — 어둡고 무거운 수사물 분위기
- Mobile First (기준 해상도: 390px)
- 미니멀 — 여백으로 호흡, 불필요한 장식 제거

---

## 컬러 (5개)
```css
--color-bg       : #0d0d0f;  /* 배경 — 거의 블랙 */
--color-surface  : #1a1a1f;  /* 카드, 입력창, 말풍선 */
--color-primary  : #c41e1e;  /* 포인트 — 핏빛 레드 */
--color-text     : #e8e6e0;  /* 본문 — 누런 백지 느낌 */
--color-muted    : #6b6b6b;  /* 보조 텍스트, 비활성 */
```

---

## 타이포그래피
- **폰트**: `Noto Serif KR` (한국어 명조체, 수사 서류 느낌)
- CDN: Google Fonts

```css
--text-xs   : 12px;
--text-sm   : 14px;
--text-base : 16px;
--text-lg   : 18px;
--text-xl   : 22px;
--text-2xl  : 28px;

--font-regular : 400;
--font-medium  : 500;
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

## 컴포넌트 규칙

### 버튼
```css
/* Primary */
background: var(--color-primary);
color: var(--color-text);
height: 52px;
border-radius: 2px;
font-size: var(--text-base);
font-weight: var(--font-bold);
letter-spacing: 1px;

/* Ghost */
background: transparent;
border: 1px solid var(--color-muted);
color: var(--color-text);
```

### 입력창
```css
background: var(--color-surface);
border: 1px solid transparent;
border-radius: 2px;
padding: var(--space-md);
font-size: var(--text-base);
color: var(--color-text);

/* focus */
border-color: var(--color-primary);
```

### 말풍선 (채팅)
```css
/* AI 응답 */
background: var(--color-surface);
border-left: 2px solid var(--color-primary);
border-radius: 0 4px 4px 0;
padding: var(--space-md);
max-width: 85%;
align-self: flex-start;

/* 플레이어 입력 */
background: transparent;
border: 1px solid var(--color-muted);
border-radius: 4px;
padding: var(--space-md);
max-width: 85%;
align-self: flex-end;
color: var(--color-muted);
```

---

## 화면별 레이아웃

### 랜딩 (`/`)
```
┌─────────────────────┐
│                     │
│   타이틀 + 부제목    │
│                     │
│   [게임 시작]        │
│   [문제 제출]        │
│                     │
└─────────────────────┘
```

### 문제 선택 (`/select`)
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ [AI가 골라줘]        │
├─────────────────────┤
│ 문제 카드 목록       │
│ ┌─────────────────┐ │
│ │ 문제 제목        │ │
│ └─────────────────┘ │
│ ...                 │
└─────────────────────┘
```

### 게임 (`/game`)
```
┌─────────────────────┐
│ Header (문제 제목)   │
├─────────────────────┤
│                     │
│  채팅 영역 (스크롤)  │
│                     │
├─────────────────────┤
│ [힌트] [정답 공개]   │
│ [입력창      ][전송] │
└─────────────────────┘
```

### 문제 제출 (`/submit`)
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ 닉네임 입력          │
│ 문제 상황 입력       │
│ 전말 입력            │
│ [제출하기]           │
└─────────────────────┘
```

### 관리자 (`/admin`)
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ 대기 문제 목록       │
│ ┌─────────────────┐ │
│ │ 문제 + 평가결과  │ │
│ │ [승인]  [반려]   │ │
│ └─────────────────┘ │
└─────────────────────┘
```

---

## 모바일 UX 규칙
- 터치 타겟 최소 높이: 52px
- 하단 입력창 고정: `position: fixed; bottom: 0`
- 키보드 대응: `padding-bottom: env(safe-area-inset-bottom)`
- 채팅 영역만 스크롤, 헤더/입력창 고정
- 최대 너비: 480px, 데스크탑에서 중앙 정렬
- 좌우 패딩: 16px
