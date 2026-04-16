"use client"

import { useState, useEffect, useRef } from "react"

interface PromptProps {
  onSubmit: (text: string) => void
  disabled?: boolean
}

export function Prompt({ onSubmit, disabled }: PromptProps) {
  const [value, setValue] = useState("")
  const [dotCount, setDotCount] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) {
      setDotCount(1)
      return
    }
    const id = setInterval(() => {
      setDotCount((n) => (n % 3) + 1)
    }, 400)
    return () => clearInterval(id)
  }, [disabled])

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled])

  const dots = ".".repeat(dotCount)

  return (
    <div
      style={{
        flexShrink: 0,
        background: "#0a0a0a",
        borderTop: "1px solid rgba(0,255,65,0.15)",
        padding: "12px 16px",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      {disabled ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "rgba(0,255,65,0.4)", fontSize: "14px" }}>
            AI가 생각 중{dots}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#00ff41", flexShrink: 0 }}>&gt;</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim() && !disabled) {
                onSubmit(value.trim())
                setValue("")
              }
            }}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#00ff41",
              fontSize: "16px",
              caretColor: "#00ff41",
              fontFamily: "inherit",
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}
