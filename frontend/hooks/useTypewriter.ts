"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseTypewriterReturn {
  displayed: string
  done: boolean
  skip: () => void
}

const PUNCTUATION = new Set([".", ",", "!", "?", "\n", ":", ";"])

export function useTypewriter(
  text: string,
  speed: number = 25,
  onDone?: () => void
): UseTypewriterReturn {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  const skipRef = useRef(false)
  const onDoneRef = useRef(onDone)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    skipRef.current = false

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!text) {
      setDone(true)
      return
    }

    let index = 0

    function typeNext() {
      if (skipRef.current) {
        setDisplayed(text)
        setDone(true)
        onDoneRef.current?.()
        return
      }

      index++
      setDisplayed(text.slice(0, index))

      if (index >= text.length) {
        setDone(true)
        onDoneRef.current?.()
        return
      }

      const prevChar = text[index - 1]
      const isPunct = PUNCTUATION.has(prevChar)

      // Base random speed: 40%~160% of speed
      let delay = speed * (0.4 + Math.random() * 1.2)

      // Punctuation or newline: add extra pause (3x~5x speed)
      if (isPunct) {
        delay += speed * (3 + Math.random() * 2)
      }

      timeoutRef.current = setTimeout(typeNext, delay)
    }

    // Start typing
    const initialDelay = speed * (0.4 + Math.random() * 1.2)
    timeoutRef.current = setTimeout(typeNext, initialDelay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [text, speed])

  const skip = useCallback(() => {
    skipRef.current = true
  }, [])

  return { displayed, done, skip }
}
