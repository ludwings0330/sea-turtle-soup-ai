"use client"

export function Terminal({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100dvh",
        background: "#0a0a0a",
        color: "#00ff41",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  )
}
