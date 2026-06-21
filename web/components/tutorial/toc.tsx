"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { List } from "lucide-react"

// BUG FIX 4: import the same slugify used by MD_COMPONENTS headings so IDs always match
import { slugify } from "@/app/tutorial/[project]/page"

interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

function buildToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n")
  const entries: TocEntry[] = []
  for (const line of lines) {
    // Strip inline markdown (backticks, bold, italic) to get plain text
    const stripInline = (s: string) => s.replace(/`([^`]+)`/g, "$1").replace(/\*+([^*]+)\*+/g, "$1").trim()
    const m2 = line.match(/^## (.+)/)
    const m3 = line.match(/^### (.+)/)
    if (m2) {
      const text = stripInline(m2[1])
      entries.push({ id: slugify(text), text, level: 2 })
    } else if (m3) {
      const text = stripInline(m3[1])
      entries.push({ id: slugify(text), text, level: 3 })
    }
  }
  return entries
}

interface TocProps {
  content: string
}

export function TableOfContents({ content }: TocProps) {
  const entries = buildToc(content)
  const [active, setActive] = useState<string>("")
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    const headings = document.querySelectorAll("article h2, article h3")
    if (!headings.length) return

    observerRef.current = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    )
    headings.forEach((h) => observerRef.current!.observe(h))
    return () => observerRef.current?.disconnect()
  }, [content])

  if (entries.length < 3) return null

  return (
    <aside className="hidden xl:flex flex-col w-56 shrink-0">
      <div className="sticky top-20 space-y-1">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
          <List className="h-3.5 w-3.5" />
          On this page
        </div>
        <nav>
          {entries.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                setActive(entry.id)
              }}
              className={`block py-1 text-xs leading-5 transition-colors duration-150 border-l-2 ${
                entry.level === 3 ? "pl-4" : "pl-3"
              } ${
                active === entry.id
                  ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "border-white/[0.06] text-[var(--color-text-secondary)] hover:text-white hover:border-white/20"
              }`}
            >
              {entry.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
