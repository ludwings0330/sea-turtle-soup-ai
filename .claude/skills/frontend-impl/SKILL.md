---
name: frontend-impl
description: >
  sea-turtle-soup-ai Next.js 프론트엔드 구현. CLI 터미널 UI 컴포넌트, 게임 페이지,
  에이전트 태그 표시, 타이핑 애니메이션 구현이 필요할 때 사용한다.
  frontend-dev 에이전트가 이 스킬을 사용한다.
---

# frontend-impl — 프론트엔드 구현 패턴

## 디자인 시스템 (엄수)

```css
:root {
  --bg: #0a0a0a;
  --text: #00ff41;
  --accent: #ffcc00;
  --error: #ff4444;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', monospace;
}
```

Tailwind를 사용할 경우 `tailwind.config.js`에 위 색상을 커스텀 컬러로 등록한다.

## 메시지 타입 정의

```typescript
type AgentTag = "host" | "judge" | "hint"

type Message = {
  role: "user" | "assistant"
  agent?: AgentTag
  content: string
  timestamp?: number
}
```

## Terminal.tsx — CLI 래퍼

```typescript
// 전체 화면을 검은 배경의 터미널로 감싸는 컴포넌트
export function Terminal({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00ff41] font-mono p-4 flex flex-col">
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

## MessageLog.tsx — 메시지 로그

```typescript
// 메시지가 위로 쌓인다 (최신이 하단)
// 에이전트 태그를 accent 색상으로 표시

const AGENT_TAG: Record<AgentTag, string> = {
  host: "[HOST]",
  judge: "[JUDGE]",
  hint: "[HINT]",
}

export function MessageLog({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-2">
      {messages.map((msg, i) => (
        <div key={i}>
          {msg.role === "assistant" && msg.agent && (
            <span className="text-[#ffcc00] mr-2">
              {AGENT_TAG[msg.agent]}
            </span>
          )}
          {msg.role === "user" && (
            <span className="text-[#00ff41] mr-2">&gt;</span>
          )}
          <TypingText text={msg.content} />
        </div>
      ))}
    </div>
  )
}
```

## Prompt.tsx — 입력 프롬프트

```typescript
// > 프롬프트와 블링킹 커서
export function Prompt({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("")

  return (
    <div className="flex items-center gap-2 mt-4 border-t border-[#00ff41]/20 pt-2">
      <span className="text-[#00ff41]">&gt;</span>
      <input
        className="flex-1 bg-transparent text-[#00ff41] outline-none caret-[#00ff41]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value.trim())
            setValue("")
          }
        }}
        autoFocus
      />
    </div>
  )
}
```

## 타이핑 애니메이션

```typescript
// 글자를 하나씩 출력하는 컴포넌트
function TypingText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    setDisplayed("")
    let i = 0
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="animate-pulse">_</span>
      )}
    </span>
  )
}
```

## API 연동 패턴

```typescript
const API_BASE = "http://localhost:8000"

async function startGame(storyId: string | "generate") {
  const res = await fetch(`${API_BASE}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ story_id: storyId }),
  })
  if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
  return res.json()
}

async function sendTurn(session: GameSession, userMessage: string) {
  const res = await fetch(`${API_BASE}/api/game/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...session, user_message: userMessage }),
  })
  if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
  return res.json()  // { judge, host, hint? }
}
```

## ScoreScreen.tsx — ASCII 점수 화면

게임 종료 후 ASCII 아트 형식으로 점수를 표시한다:

```
╔══════════════════════════════╗
║      GAME OVER               ║
╠══════════════════════════════╣
║  SCORE:      87/100          ║
║  EFFICIENCY: ████████░░ 8/10 ║
║  LOGIC:      ███████░░░ 7/10 ║
╠══════════════════════════════╣
║  잘하셨습니다! 논리적인 접근  ║
╚══════════════════════════════╝
```
