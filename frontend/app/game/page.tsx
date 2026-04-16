"use client"

import { Suspense, useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTypewriter } from "@/hooks/useTypewriter"
import type { Message } from "@/components/MessageLog"

const CLEAR_ASCII = `
  ____  _     _____    _    ____  _
 / ___|| |   | ____|  / \\  |  _ \\| |
| |    | |   |  _|   / _ \\ | |_) | |
| |___ | |___| |___ / ___ \\|  _ <|_|
 \\____||_____|_____/_/   \\_\\_| \\_(_)`

const GAME_HELP_TEXT =
  `게임 중 명령어:

  /quit   현재 게임 포기 (스토리 선택으로)
  /hint   힌트 요청
  /help   이 도움말 표시`

const DIFF_COLOR: Record<string, string> = {
  하: "#00ff41",
  중: "#ffd700",
  상: "#ff4444",
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

function GameContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const storyId = searchParams.get("id")

  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [gameInfo, setGameInfo] = useState<{
    title: string
    difficulty: string
    questionCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [waiting, setWaiting] = useState(false)
  const [solved, setSolved] = useState(false)
  const [quitting, setQuitting] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [inputDisabled, setInputDisabled] = useState(true)
  const didInit = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Typewriter for last GM message
  const lastGmIndex = messages.map((m, i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).at(-1) ?? -1
  const lastGmContent = lastGmIndex >= 0 ? messages[lastGmIndex].content : ""
  const { displayed: lastDisplayed, done: lastDone, skip } = useTypewriter(lastGmContent, 22)

  // Hide input whenever a new GM message starts typing
  useEffect(() => {
    if (lastGmIndex >= 0) {
      setInputDisabled(true)
    }
  }, [lastGmIndex])

  useEffect(() => {
    if (lastDone && !waiting && !quitting && !solved && !loading) {
      setInputDisabled(false)
    }
  }, [lastDone, waiting, quitting, solved, loading])

  useEffect(() => {
    if (!inputDisabled) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [inputDisabled])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, lastDisplayed, inputDisabled, waiting])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    if (!storyId) {
      setInitError("스토리 ID가 없습니다. 스토리 선택 화면으로 돌아가세요.")
      setLoading(false)
      return
    }

    async function startGame() {
      try {
        const res = await fetch("http://localhost:8000/api/game/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story_id: storyId }),
          cache: "no-store",
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "서버 오류" }))
          throw new Error(err.detail ?? `서버 오류 ${res.status}`)
        }
        const data = await res.json()
        setSessionId(data.session_id)
        setGameInfo({ title: data.title, difficulty: data.difficulty, questionCount: 0 })
        setMessages([
          {
            role: "assistant",
            content: `[상황]\n${data.situation}`,
          },
        ])
      } catch (e) {
        setInitError(e instanceof Error ? e.message : "게임을 시작할 수 없습니다.")
      } finally {
        setLoading(false)
      }
    }

    startGame()
  }, [storyId])

  // "r" key → go to select on solved screen
  useEffect(() => {
    if (!solved) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") router.push("/select")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [solved, router])

  // Quit: redirect after message
  useEffect(() => {
    if (!quitting) return
    const timer = setTimeout(() => router.push("/select"), 2500)
    return () => clearTimeout(timer)
  }, [quitting, router])

  const handleContainerClick = useCallback(() => {
    if (!lastDone) skip()
    inputRef.current?.focus()
  }, [lastDone, skip])

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (waiting || solved || quitting) return

    const cmd = trimmed.toLowerCase()
    setInputValue("")
    setInputDisabled(true)

    if (cmd === "/quit") {
      setMessages(prev => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "게임을 포기합니다. 스토리 선택 화면으로 돌아갑니다..." },
      ])
      setQuitting(true)
      return
    }

    if (cmd === "/help") {
      setMessages(prev => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: GAME_HELP_TEXT },
      ])
      return
    }

    if (!sessionId) return

    setMessages(prev => [...prev, { role: "user", content: trimmed }])
    setWaiting(true)

    try {
      const body: Record<string, string> = { session_id: sessionId, user_message: trimmed }
      if (cmd === "/hint") {
        body.hint_requested = "true"
      }

      const res = await fetch("http://localhost:8000/api/game/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "서버 오류" }))
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `[오류] ${err.detail ?? res.status}` },
        ])
        return
      }

      const data = await res.json()

      setGameInfo(prev =>
        prev ? { ...prev, questionCount: data.question_count } : prev
      )

      const JUDGE_DISPLAY: Record<string, string> = {
        "예": "네",
        "아니오": "아니오",
        "관련없음": "관련없습니다",
      }

      if (data.judge && !data.is_solved) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: JUDGE_DISPLAY[data.judge] ?? data.judge },
        ])
      }

      if (data.hint) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `[힌트] ${data.hint}` },
        ])
      }

      if (data.is_solved) {
        setSolved(true)
        const title = gameInfo?.title
        const solvedMessage = title
          ? `정답입니다! "${title}"의 비밀을 밝혀냈습니다.`
          : "정답입니다! 이 수수께끼의 비밀을 밝혀냈습니다."
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: solvedMessage },
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "[오류] 서버에 연결할 수 없습니다." },
      ])
    } finally {
      setWaiting(false)
    }
  }, [inputValue, waiting, solved, quitting, sessionId])

  if (loading) {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#0a0a0a",
          color: "#00ff41",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <p style={{ color: "rgba(0,255,65,0.6)", animation: "pulse 1.5s infinite" }}>
          게임 초기화 중...
        </p>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  if (initError) {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#0a0a0a",
          color: "#00ff41",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          gap: "1.5rem",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <p style={{ color: "#ff4444" }}>[오류] {initError}</p>
        <p style={{ color: "rgba(0,255,65,0.5)", fontSize: "13px" }}>
          /select 를 입력하거나 브라우저 뒤로가기를 사용하세요.
        </p>
      </div>
    )
  }

  return (
    <div
      onClick={handleContainerClick}
      style={{
        height: "100dvh",
        background: "#0a0a0a",
        color: "#00ff41",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'JetBrains Mono', monospace",
        cursor: "text",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(0,255,65,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ color: "#ffd700", fontWeight: 700, flexShrink: 0 }}>SEA TURTLE SOUP</span>
          {gameInfo && (
            <span
              style={{
                color: "rgba(0,255,65,0.55)",
                fontSize: "13px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              / {gameInfo.title}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, fontSize: "13px" }}>
          {gameInfo && (
            <>
              <span style={{ color: "rgba(0,255,65,0.5)" }}>
                난이도{" "}
                <span style={{ color: DIFF_COLOR[gameInfo.difficulty] ?? "#00ff41" }}>
                  {gameInfo.difficulty}
                </span>
              </span>
              <span style={{ color: "rgba(0,255,65,0.5)" }}>
                Q{" "}
                <span style={{ color: "#ffd700" }}>{gameInfo.questionCount}</span>
              </span>
            </>
          )}
          {solved && (
            <span
              style={{
                color: "#ffd700",
                fontWeight: 700,
                animation: "pulse 1.5s infinite",
              }}
            >
              CLEAR
            </span>
          )}
        </div>
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
        {messages.map((msg, i) => (
          <MessageRow
            key={i}
            msg={msg}
            isLastGm={i === lastGmIndex}
            displayedText={lastDisplayed}
            typingDone={lastDone}
          />
        ))}

        {/* Waiting indicator */}
        {waiting && (
          <div style={{ display: "flex", gap: "8px", marginTop: "4px", marginBottom: "12px" }}>
            <span style={{ color: "#ffd700", fontWeight: 700, fontSize: "14px" }}>GM&gt;</span>
            <span style={{ color: "rgba(0,255,65,0.5)", fontSize: "14px" }}>
              <span style={{ animation: "waitDot 1.2s infinite" }}>.</span>
              <span style={{ animation: "waitDot 1.2s 0.4s infinite" }}>.</span>
              <span style={{ animation: "waitDot 1.2s 0.8s infinite" }}>.</span>
            </span>
          </div>
        )}

        {/* Inline ME> input */}
        {!inputDisabled && !solved && (
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

        {/* Solved footer (inline, no button) */}
        {solved && (
          <div style={{ marginTop: "24px" }}>
            <pre
              style={{
                fontFamily: "monospace",
                fontSize: "clamp(5px, 1.2vw, 11px)",
                color: "#ffd700",
                lineHeight: 1.3,
                textAlign: "center",
                whiteSpace: "pre",
              }}
            >
              {CLEAR_ASCII}
            </pre>
            <p style={{ color: "rgba(0,255,65,0.6)", fontSize: "13px", textAlign: "center", marginTop: "12px" }}>
              [r] 다른 스토리 선택하기
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes waitDot {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function GameFallback() {
  return (
    <div
      style={{
        height: "100dvh",
        background: "#0a0a0a",
        color: "#00ff41",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <p style={{ color: "rgba(0,255,65,0.6)" }}>로딩 중...</p>
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={<GameFallback />}>
      <GameContent />
    </Suspense>
  )
}
