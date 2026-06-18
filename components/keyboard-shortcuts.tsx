"use client"

import { useEffect } from "react"

interface KeyboardShortcutsProps {
  isOwner?: boolean
}

export function KeyboardShortcuts({ isOwner }: KeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return

      switch (e.key) {
        case "1":
          window.dispatchEvent(new CustomEvent("setChartPeriod", { detail: 30 }))
          break
        case "2":
          window.dispatchEvent(new CustomEvent("setChartPeriod", { detail: 180 }))
          break
        case "3":
          window.dispatchEvent(new CustomEvent("setChartPeriod", { detail: 360 }))
          break
        case "?":
          window.dispatchEvent(new CustomEvent("showShortcuts"))
          break
        case "t":
          window.scrollTo({ top: 0, behavior: "smooth" })
          break
        case "e":
          if (isOwner) {
            window.dispatchEvent(new CustomEvent("toggleEditLayout"))
          }
          break
        case "/":
          e.preventDefault()
          window.dispatchEvent(new CustomEvent("focusNavSearch"))
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOwner])

  return null
}
