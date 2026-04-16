"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTypewriter } from "@/hooks/useTypewriter"

type Story = {
  id: string
  title: string
  difficulty: "하" | "중" | "상"
  category: string
  situation: string
  source: string
}

export type Message = {
  role: "user" | "assistant"
  content: string
}

// Korean characters count as 2 display columns; ASCII as 1
function displayWidth(str: string): number {
  let w = 0
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 0
    if (
      (cp >= 0xAC00 && cp <= 0xD7A3) ||
      (cp >= 0x1100 && cp <= 0x11FF) ||
      (cp >= 0x3130 && cp <= 0x318F) ||
      (cp >= 0xFF00 && cp <= 0xFFEF) ||
      (cp >= 0x4E00 && cp <= 0x9FFF)
    ) {
      w += 2
    } else {
      w += 1
    }
  }
  return w
}

function padEndDisplay(str: string, target: number): string {
  return str + " ".repeat(Math.max(0, target - displayWidth(str)))
}

const DIFFICULTY_COLOR: Record<string, string> = {
  하: "#00ff41",
  중: "#ffd700",
  상: "#ff4444",
}

const DIFFICULTY_LABEL: Record<string, string> = {
  하: "EASY",
  중: "NORMAL",
  상: "HARD",
}

const HELP_TEXT =
  `사용 가능한 명령어

  [번호]     해당 스토리 시작
  /submit    나만의 스토리 제출
  /quit      처음으로 돌아가기
  /help      이 도움말 표시`

function buildGmGreeting(stories: Story[]): string {
  const lines = ["플레이할 스토리를 번호로 선택하세요.\n"]
  const maxW = Math.max(16, ...stories.map((s) => displayWidth(s.title)))
  stories.forEach((s, i) => {
    const label = DIFFICULTY_LABEL[s.difficulty] ?? s.difficulty
    const userTag = s.source === "user" ? " [유저]" : ""
    const num = String(i + 1).padStart(2)
    lines.push(`  ${num}  ${padEndDisplay(s.title, maxW + 2)} ${label}${userTag}`)
  })
  lines.push("\n/quit — 처음으로   /submit — 스토리 제출")
  return lines.join("\n")
}

interface MessageRowProps {
  msg: Message
  isLastGm: boolean
  displayedText: string
  typingDone: boolean
}

function MessageRow({ msg, isLastGm, displayedText, typingDone }: MessageRowProps) {
  if (msg.role === "assistant") {
    const text = isLastGm ? displayedText : msg.content
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ color: "#ffd700", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>GM&gt;</span>
        <span style={{ whiteSpace: "pre-wrap", color: "rgba(0,255,65,0.9)", lineHeight: 1.7, fontSize: "14px" }}>
          {text}
          {isLastGm && !typingDone && <span style={{ color: "#00ff41", animation: "blink 1s step-end infinite" }}>█</span>}
        </span>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
      <span style={{ color: "rgba(0,255,65,0.5)", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>ME&gt;</span>
      <span style={{ color: "rgba(0,255,65,0.7)", whiteSpace: "pre-wrap", fontSize: "14px" }}>{msg.content}</span>
    </div>
  )
}

export default function SelectPage() {
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [inputDisabled, setInputDisabled] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Find last GM message index for typewriter
  const lastGmIndex = messages.map((m, i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).at(-1) ?? -1
  const lastGmContent = lastGmIndex >= 0 ? messages[lastGmIndex].content : ""
  const { displayed: lastDisplayed, done: lastDone, skip } = useTypewriter(lastGmContent, 22)

  useEffect(() => {
    if (lastDone && messages.length > 0) {
      setInputDisabled(false)
    }
  }, [lastDone, messages.length])

  useEffect(() => {
    if (!inputDisabled) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [inputDisabled])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, lastDisplayed, inputDisabled])

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch("http://localhost:8000/api/stories", { cache: "no-store" })
        if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
        const data = await res.json()
        setStories(data)
        setMessages([{ role: "assistant", content: buildGmGreeting(data) }])
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "서버에 연결할 수 없습니다."
        setFetchError(errMsg)
        setMessages([{ role: "assistant", content: `[오류] ${errMsg}` }])
      } finally {
        setLoaded(true)
      }
    }
    fetchStories()
  }, [])

  const handleContainerClick = useCallback(() => {
    if (!lastDone) skip()
    inputRef.current?.focus()
  }, [lastDone, skip])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const cmd = trimmed.toLowerCase()
    setInputValue("")
    setInputDisabled(true)

    setMessages(prev => [...prev, { role: "user", content: trimmed }])

    if (cmd === "/quit") {
      setTimeout(() => router.push("/"), 300)
      return
    }

    if (cmd === "/submit") {
      setTimeout(() => router.push("/submit"), 300)
      return
    }

    if (cmd === "/help") {
      setMessages(prev => [...prev, { role: "assistant", content: HELP_TEXT }])
      return
    }

    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && num >= 1 && num <= stories.length) {
      router.push(`/game?id=${stories[num - 1].id}`)
      return
    }

    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: `'${trimmed}'는 알 수 없는 입력입니다.\n번호(1-${stories.length})를 입력하거나 /help를 입력하세요.`,
      },
    ])
  }, [inputValue, router, stories])

  return (
    <div
      onClick={handleContainerClick}
      style={{
        height: "100dvh",
        background: "#0a0a0a",
        color: "#00ff41",
        cursor: "text",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(0,255,65,0.15)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ color: "#ffd700", fontWeight: 700 }}>SEA TURTLE SOUP</span>
        <span style={{ color: "rgba(0,255,65,0.5)" }}>/ 스토리 선택</span>
      </div>

      {/* Scrollable conversation area */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          paddingBottom: "max(80px, env(safe-area-inset-bottom))",
        }}
      >
        {!loaded && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <span style={{ color: "#ffd700", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>GM&gt;</span>
            <span style={{ color: "rgba(0,255,65,0.5)", fontSize: "14px" }}>스토리 목록을 불러오는 중...</span>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageRow
            key={i}
            msg={msg}
            isLastGm={i === lastGmIndex}
            displayedText={lastDisplayed}
            typingDone={lastDone}
          />
        ))}

        {/* Inline ME> input */}
        {!inputDisabled && loaded && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
            <span style={{ color: "#00ff41", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>ME&gt;</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#00ff41",
                fontSize: "15px",
                caretColor: "#00ff41",
                fontFamily: "inherit",
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
