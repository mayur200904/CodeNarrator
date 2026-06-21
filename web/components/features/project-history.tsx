"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FolderOpen, Clock, Trash2, ExternalLink } from "lucide-react"
import { getHistory, clearHistory, type ProjectHistoryEntry } from "@/lib/history"

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function repoName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean)
    return parts.slice(0, 2).join("/")
  } catch {
    return url
  }
}

export function ProjectHistory() {
  const [entries, setEntries] = useState<ProjectHistoryEntry[]>([])

  useEffect(() => {
    setEntries(getHistory())
  }, [])

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d1117] p-6 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-white/20 mb-3" />
        <p className="text-sm text-[var(--color-text-secondary)]">No past projects yet.</p>
        <p className="mt-1 text-xs text-white/25">Generated tutorials will appear here.</p>
      </div>
    )
  }

  const handleClear = () => {
    clearHistory()
    setEntries([])
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Clock className="h-4 w-4 text-[var(--color-accent)]" />
          Recent Projects
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </button>
      </div>

      <div className="divide-y divide-white/[0.05]">
        <AnimatePresence>
          {entries.map((entry, i) => (
            <motion.div
              key={entry.projectName}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/tutorial/${entry.projectName}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
                  <FolderOpen className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors">
                    {entry.projectName}
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">
                    {repoName(entry.repoUrl)} · {timeAgo(entry.date)}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-[var(--color-accent)] transition-colors" />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
