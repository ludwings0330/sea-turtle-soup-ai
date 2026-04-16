"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTypewriter } from "@/hooks/useTypewriter"

type SubmitStep = "title" | "situation" | "truth" | "difficulty" | "confirm" | "done"

interface FormData {
  title: string
  situation: string
  truth: string
  difficulty: string
}

export type Message = {
  role: "user" | "assistant"
  content: string
}

const INITIAL_GM =
  `안녕하세요! 새로운 스토리를 함께 만들어볼까요?
먼저 스토리 제목을 알려주세요. 짧고 인상적일수록 좋아요.`

const HELP_TEXT = "제목 → 상황 → 정답 → 난이도 순으로 입력하세요.\n/quit 을 입력하면 처음 화면으로 돌아갑니다."

function getGmResponse(step: SubmitStep, prevInput: string, form: FormData): string {
  switch (step) {
    case "situation":
      return `'${prevInput}'라는 제목이군요. 좋아요!\n이제 플레이어에게 보여줄 상황 설명을 입력해주세요.\n"한 남자가..." 처럼 수수께끼의 시작 상황만 보여주세요.`
    case "truth":
      return `흥미로운 상황이네요.\n이번엔 정답을 알려주세요. 이건 저만 알고 있는 비밀입니다. 플레이어에게는 절대 보여주지 않을게요.`
    case "difficulty":
      return `완벽해요. 마지막으로 난이도를 선택해주세요.\n쉬운 수수께끼라면 하, 보통이면 중, 어렵다면 상을 입력하세요.`
    case "confirm":
      return `좋아요. 아래 내용으로 제출할까요?\n\n  제목:   ${form.title}\n  상황:   ${form.situation.slice(0, 60)}${form.situation.length > 60 ? "..." : ""}\n  난이도: ${prevInput}\n\n맞으면 yes, 다시 작성하려면 no를 입력하세요.`
    case "done":
      return `스토리가 접수됐어요! 검토 후 게임에 추가될 예정입니다.\n/play로 게임을 시작하거나 /quit으로 처음 화면으로 돌아가세요.`
    default:
      return ""
  }
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

export default function SubmitPage() {
  const router = useRouter()
  const [step, setStep] = useState<SubmitStep>("title")
  const [form, setForm] = useState<FormData>({ title: "", situation: "", truth: "", difficulty: "" })
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_GM },
  ])
  const [inputValue, setInputValue] = useState("")
  const [inputDisabled, setInputDisabled] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Typewriter for last GM message
  const lastGmIndex = messages.map((m, i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).at(-1) ?? -1
  const lastGmContent = lastGmIndex >= 0 ? messages[lastGmIndex].content : ""
  const { displayed: lastDisplayed, done: lastDone } = useTypewriter(lastGmContent, 22)

  useEffect(() => {
    if (lastDone && step !== "done") {
      setInputDisabled(false)
    }
  }, [lastDone, step])

  useEffect(() => {
    if (!inputDisabled) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [inputDisabled])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, lastDisplayed, inputDisabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const cmd = trimmed.toLowerCase()
    setInputValue("")

    if (cmd === "/quit") {
      router.push("/")
      return
    }

    if (cmd === "/help") {
      setMessages(prev => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: HELP_TEXT },
      ])
      return
    }

    if (cmd === "/play") {
      router.push("/select")
      return
    }

    setInputDisabled(true)

    if (step === "title") {
      if (!trimmed) return
      setForm(f => ({ ...f, title: trimmed }))
      const nextStep: SubmitStep = "situation"
      setMessages(prev => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: getGmResponse(nextStep, trimmed, form) },
      ])
      setStep(nextStep)
    } else if (step === "situation") {
      if (!trimmed) return
      setForm(f => ({ ...f, situation: trimmed }))
      const nextStep: SubmitStep = "truth"
      setMessages(prev => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: getGmResponse(nextStep, trimmed, form) },
      ])
      setStep(nextStep)
    } else if (step === "truth") {
      if (!trimmed) return
      setForm(f => ({ ...f, truth: trimmed }))
      const nextStep: SubmitStep = "difficulty"
      setMessages(prev => [
        ...prev,
        { role: "user", content: "[비공개]" },
        { role: "assistant", content: getGmResponse(nextStep, trimmed, form) },
      ])
      setStep(nextStep)
    } else if (step === "difficulty") {
      if (!["하", "중", "상"].includes(trimmed)) {
        setInputDisabled(false)
        setMessages(prev => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: "하, 중, 상 중에서 입력해주세요." },
        ])
        return
      }
      const updatedForm = { ...form, difficulty: trimmed }
      setForm(updatedForm)
      const nextStep: SubmitStep = "confirm"
      setMessages(prev => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: getGmResponse(nextStep, trimmed, updatedForm) },
      ])
      setStep(nextStep)
    } else if (step === "confirm") {
      if (cmd === "yes" || cmd === "y") {
        // Submit to backend (placeholder — P5 actual API)
        submitStory()
        return
      } else if (cmd === "no" || cmd === "n") {
        // Restart
        setForm({ title: "", situation: "", truth: "", difficulty: "" })
        setStep("title")
        setMessages(prev => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: INITIAL_GM },
        ])
      } else {
        setInputDisabled(false)
        setMessages(prev => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: "yes 또는 no를 입력해주세요." },
        ])
      }
    }
  }, [inputValue, step, form, router])

  async function submitStory() {
    setInputDisabled(true)
    try {
      const res = await fetch("http://localhost:8000/api/story/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          situation: form.situation,
          truth: form.truth,
          difficulty: form.difficulty,
        }),
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "서버 오류" }))
        setMessages(prev => [
          ...prev,
          { role: "user", content: "yes" },
          { role: "assistant", content: `[오류] ${err.detail ?? "제출에 실패했습니다."}\n/quit으로 처음 화면으로 돌아가거나 다시 시도해주세요.` },
        ])
        setInputDisabled(false)
        return
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "user", content: "yes" },
        { role: "assistant", content: `[오류] 서버에 연결할 수 없습니다.\n/quit으로 처음 화면으로 돌아가거나 다시 시도해주세요.` },
      ])
      setInputDisabled(false)
      return
    }

    setStep("done")
    setMessages(prev => [
      ...prev,
      { role: "user", content: "yes" },
      { role: "assistant", content: getGmResponse("done", "", form) },
    ])
  }

  return (
    <div
      style={{
        height: "100dvh",
        background: "#0a0a0a",
        color: "#00ff41",
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
        <span style={{ color: "#ffd700", fontWeight: 700 }}>TURTLE SOUP</span>
        <span style={{ color: "rgba(0,255,65,0.5)" }}>/ 스토리 제출</span>
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

        {/* Inline ME> input */}
        {!inputDisabled && step !== "done" && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
            <span style={{ color: "#00ff41", fontWeight: 700, flexShrink: 0, fontSize: "14px" }}>ME&gt;</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
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
