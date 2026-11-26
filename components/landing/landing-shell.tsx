"use client"

import { useEffect, useRef, type ReactNode } from "react"
import "./landing.css"

export function LandingShell({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    root.classList.add("js")

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in")
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    )

    const timer = window.setTimeout(() => {
      root.querySelectorAll(".reveal").forEach((el) => io.observe(el))
    }, 100)

    return () => {
      window.clearTimeout(timer)
      io.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="landing-body">
      {children}
    </div>
  )
}
