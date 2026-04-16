"use client"

import { useEffect, useRef } from "react"
import { useTypewriter } from "@/hooks/useTypewriter"

export type Message = {
  role: "user" | "assistant"
  agent?: string
  content: string
}

const GM_COLOR = "#ffd700"

interface MessageItemProps {
  msg: Message
  animate: boolean
}

function MessageItem({ msg, animate }: MessageItemProps) {
  const { displayed } = useTypewriter(animate ? msg.content : "", 22)
  const content = animate ? displayed : msg.content

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "6px",
        lineHeight: 1.7,
        fontSize: "14px",
      }}
    >
      {msg.role === "assistant" && (
        <span
          style={{
            color: GM_COLOR,
            fontWeight: 600,
            flexShrink: 0,
            fontSize: "13px",
          }}
        >
          GM
        </span>
      )}
      {msg.role === "user" && (
        <span style={{ color: "#00ff41", flexShrink: 0 }}>&gt;</span>
      )}
      <span
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: msg.role === "user" ? "#00ff41" : "rgba(0,255,65,0.9)",
        }}
      >
        {content}
        {animate && content.length < msg.content.length && (
          <span style={{ color: "#00ff41", animation: "blink 1s step-end infinite" }}>█</span>
        )}
      </span>
    </div>
  )
}

interface MessageLogProps {
  messages: Message[]
  isWaiting?: boolean
}

export function MessageLog({ messages, isWaiting }: MessageLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isWaiting])

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg, i) => (
          <MessageItem
            key={i}
            msg={msg}
            animate={i === messages.length - 1}
          />
        ))}

        {/* Waiting indicator */}
        {isWaiting && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
            <span style={{ color: GM_COLOR, fontWeight: 600, fontSize: "13px" }}>GM</span>
            <span style={{ color: "rgba(0,255,65,0.6)" }}>
              <span style={{ animation: "waitDot 1.2s infinite" }}>.</span>
              <span style={{ animation: "waitDot 1.2s 0.4s infinite" }}>.</span>
              <span style={{ animation: "waitDot 1.2s 0.8s infinite" }}>.</span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes waitDot {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}
