"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTypewriter } from "@/hooks/useTypewriter"

type Message = {
  role: "user" | "assistant"
  content: string
  asArt?: boolean
}

type Phase = "title" | "greeting" | "ready"

const SEA_ART = ` ____  _____    _
/ ___|| ____|  / \\
\\___ \\|  _|   / _ \\
 ___) | |___ / ___ \\
|____/|_____/_/   \\_\\`

const TURTLE_ART = ` _____  _   _ ____  _____  _     _____
|_   _|| | | |  _ \\|_   _|| |   | ____|
  | |  | | | | |_) || | | || |   |  _|
  | |  | |_| ||  _ < | | || |___| |___
  |_|   \\___/ |_| \\_\\|_| ||_____|_____|`

const SOUP_ART = ` ____   ___  _   _ ____
/ ___| / _ \\| | | |  _ \\
\\___ \\| | | | | | | |_) |
 ___) || |_| | |_| |  __/
|____/  \\___/ \\___/|_|   `

const GAME_ART = `  ____    _    __  __ _____
 / ___|  / \\  |  \\/  | ____|
| |  _  / _ \\ | |\\/| |  _|
| |_| |/ ___ \\| |  | | |___
 \\____/_/   \\_\\_|  |_|_____|`

const TITLE_ART =
  [SEA_ART, TURTLE_ART, SOUP_ART, GAME_ART].join("\n\n") +
  "\n\n             — with AI —"

const GREETING =
  `바다거북 스프 게임에 오신 것을 환영합니다!
안녕하세요, 저는 GM(게임 마스터)입니다.

[바다거북 스프란?]
어느 날 한 남자가 레스토랑에서 바다거북 스프를 주문했습니다.
스프를 한 모금 맛본 그는 집으로 돌아가 스스로 목숨을 끊었습니다.
과연... 왜 그랬을까요?

이처럼 수수께끼 같은 상황이 주어지면, 예 또는 아니오로
대답할 수 있는 질문을 던져 숨겨진 진실을 추리하는 게임입니다.

[게임 목표]
숨겨진 진실을 가능한 적은 질문으로 밝혀내세요.
질문이 적을수록 더 높은 점수를 받습니다!

[진행 방법]
  1) GM이 수수께끼 상황을 설명합니다
  2) 예/아니오로 답할 수 있는 질문을 입력하세요
  3) 5번 질문마다 힌트를 요청할 수 있습니다
  4) 진실을 파악했다면 정답을 입력하세요

  /play    — 게임 시작
  /submit  — 나만의 스토리 제출
  /help    — 명령어 보기`

const HELP_TEXT =
  `사용 가능한 명령어

  /play      게임 시작 (스토리 선택 화면)
  /submit    나만의 스토리 제출
  /help      이 도움말 표시

게임 진행 중:
  /quit      게임 포기하고 처음으로
  /hint      힌트 요청
  /help      도움말 보기

모든 명령어는 /로 시작합니다.
게임 중에는 명령어 외의 텍스트는 GM에게 질문으로 전달됩니다.`

export default function LandingPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: TITLE_ART, asArt: true },
  ])
  const [phase, setPhase] = useState<Phase>("title")
  const [inputValue, setInputValue] = useState("")
  const [inputDisabled, setInputDisabled] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const lastGmIndex =
    messages
      .map((m, i) => (m.role === "assistant" ? i : -1))
      .filter((i) => i >= 0)
      .at(-1) ?? -1
  const lastGmContent = lastGmIndex >= 0 ? messages[lastGmIndex].content : ""
  const lastGmIsArt = lastGmIndex >= 0 ? (messages[lastGmIndex].asArt ?? false) : false
  const { displayed: lastDisplayed, done: lastDone, skip } = useTypewriter(
    lastGmContent,
    lastGmIsArt ? 4 : 22,
  )

  // Sequence: title done → show greeting → greeting done → enable input
  useEffect(() => {
    if (!lastDone) return
    if (phase === "title") {
      setPhase("greeting")
      setMessages((prev) => [...prev, { role: "assistant", content: GREETING }])
    } else if (phase === "greeting") {
      setPhase("ready")
      setInputDisabled(false)
    } else {
      setInputDisabled(false)
    }
  }, [lastDone, phase])

  useEffect(() => {
    if (!inputDisabled) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [inputDisabled])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, lastDisplayed])

  // Click anywhere: skip current animation + focus input
  const handleContainerClick = useCallback(() => {
    if (!lastDone) skip()
    inputRef.current?.focus()
  }, [lastDone, skip])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return
      const trimmed = inputValue.trim()
      if (!trimmed) return

      const cmd = trimmed.toLowerCase()
      setInputValue("")
      setInputDisabled(true)
      setMessages((prev) => [...prev, { role: "user", content: trimmed }])

      if (cmd === "/play") {
        setTimeout(() => router.push("/select"), 300)
        return
      }
      if (cmd === "/submit") {
        setTimeout(() => router.push("/submit"), 300)
        return
      }
      if (cmd === "/help") {
        setMessages((prev) => [...prev, { role: "assistant", content: HELP_TEXT }])
        return
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `'${trimmed}'는 알 수 없는 명령어입니다.\n/help를 입력하면 사용 가능한 명령어를 확인할 수 있어요.`,
        },
      ])
    },
    [inputValue, router],
  )

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
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem 1rem",
          paddingBottom: "max(80px, env(safe-area-inset-bottom))",
        }}
      >
        {messages.map((msg, i) => {
          const isLastGm = i === lastGmIndex
          if (msg.role === "assistant") {
            const text = isLastGm ? lastDisplayed : msg.content
            const showCursor = isLastGm && !lastDone
            if (msg.asArt) {
              return (
                <pre
                  key={i}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "clamp(6px, 1.6vw, 11px)",
                    color: "#ffd700",
                    textAlign: "center",
                    whiteSpace: "pre",
                    lineHeight: 1.3,
                    margin: "0 0 24px 0",
                    overflowX: "auto",
                  }}
                >
                  {text}
                  {showCursor && (
                    <span style={{ animation: "blink 0.6s step-end infinite" }}>█</span>
                  )}
                </pre>
              )
            }
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <span style={{ color: "#ffd700", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>
                  GM&gt;
                </span>
                <span
                  style={{
                    whiteSpace: "pre-wrap",
                    color: "rgba(0,255,65,0.9)",
                    lineHeight: 1.7,
                    fontSize: "14px",
                  }}
                >
                  {text}
                  {showCursor && (
                    <span style={{ color: "#00ff41", animation: "blink 1s step-end infinite" }}>
                      █
                    </span>
                  )}
                </span>
              </div>
            )
          }
          return (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <span style={{ color: "rgba(0,255,65,0.5)", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>
                ME&gt;
              </span>
              <span style={{ color: "rgba(0,255,65,0.7)", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                {msg.content}
              </span>
            </div>
          )
        })}

        {!inputDisabled && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
            <span style={{ color: "#00ff41", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>
              ME&gt;
            </span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
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
              autoFocus
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
