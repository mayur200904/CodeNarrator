"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft, FileText, Search, X, CheckCircle2,
  Video, PlayCircle, Loader2, ChevronDown, ChevronUp,
} from "lucide-react"
import { generateVideo, API_BASE } from "@/lib/api"
import { getPrefs, savePrefs } from "@/lib/reading-progress"

const VOICES = [
  { id: "en-US-AriaNeural",  label: "Aria",  desc: "Female" },
  { id: "en-US-GuyNeural",   label: "Guy",   desc: "Male"   },
  { id: "en-US-JennyNeural", label: "Jenny", desc: "Female" },
]
const STYLES = [
  { id: "dark",      label: "Dark",      color: "#1a1f35" },
  { id: "light",     label: "Light",     color: "#f0f2ff" },
  { id: "cyberpunk", label: "Cyberpunk", color: "#2d0045" },
]

interface SidebarProps {
  projectName: string
  markdownFiles: string[]
  selectedFile: string | null
  readFiles: Set<string>
  onSelectFile: (file: string) => void
  repoUrl: string | null
  hasVideo: boolean
  onFocusVideo: () => void
}

export function TutorialSidebar({
  projectName,
  markdownFiles,
  selectedFile,
  readFiles,
  onSelectFile,
  repoUrl,
  hasVideo,
  onFocusVideo,
}: SidebarProps) {
  const [query, setQuery]           = useState("")
  const [showVideo, setShowVideo]   = useState(false)
  const searchRef                   = useRef<HTMLInputElement>(null)
  const prefs                       = getPrefs()
  const [voice, setVoice]           = useState(prefs.voice)
  const [vidStyle, setVidStyle]     = useState(prefs.style)
  const [videoJobId, setVideoJobId] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<string | null>(null)
  const [videoUrl, setVideoUrl]     = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // "/" shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Video job poll
  useEffect(() => {
    if (!videoJobId || videoStatus === "completed" || videoStatus === "failed") return
    const iv = setInterval(async () => {
      try {
        const { getJobStatus } = await import("@/lib/api")
        const d = await getJobStatus(videoJobId)
        setVideoStatus(d.status)
        if (d.status === "completed")
          setVideoUrl(`${API_BASE}/output/${projectName}/tutorial.mp4?raw=1`)
        if (d.status === "failed") setVideoError("Video generation failed.")
      } catch { /* ignore */ }
    }, 2500)
    return () => clearInterval(iv)
  }, [videoJobId, videoStatus, projectName])

  const handleGenerateVideo = async () => {
    if (!repoUrl) return
    setVideoError(null)
    savePrefs({ voice, style: vidStyle })
    try {
      const d = await generateVideo(repoUrl, {
        voice,
        style: vidStyle,
        project_name: projectName,   // pass exact name so backend finds the right output dir
      })
      setVideoJobId(d.job_id)
      setVideoStatus("queued")
    } catch {
      setVideoError("Failed to start video generation.")
    }
  }

  const filtered = query.trim()
    ? markdownFiles.filter((f) =>
        f.replace(/_/g, " ").replace(".md", "").toLowerCase().includes(query.toLowerCase())
      )
    : markdownFiles

  const readCount = markdownFiles.filter((f) => readFiles.has(f)).length
  const total     = markdownFiles.length
  const progress  = total > 0 ? Math.round((readCount / total) * 100) : 0

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-white/[0.07] bg-[#08090e]">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <Link href="/app" className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{projectName}</p>
            <p className="text-[10px] text-[var(--color-text-secondary)]">Documentation</p>
          </div>
          {/* Progress ring */}
          <div className="ml-auto relative h-8 w-8 shrink-0">
            <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
              <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle cx="16" cy="16" r="12" fill="none"
                stroke="var(--color-accent)" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
              {readCount}/{total}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/30" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setQuery(""); searchRef.current?.blur() } }}
            placeholder="Search chapters  (/)"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-8 pr-8 text-xs text-white placeholder:text-white/25 outline-none focus:border-[var(--color-accent)]/40 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-white/30 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto py-2">
        {hasVideo && (
          <button
            onClick={onFocusVideo}
            className="mx-2 mb-1 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl bg-emerald-900/20 border border-emerald-500/20 px-3 py-2.5 text-sm text-emerald-300 hover:bg-emerald-900/30 transition-colors"
          >
            <PlayCircle className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">Watch Video Tutorial</span>
          </button>
        )}

        <AnimatePresence>
          {filtered.map((file, i) => {
            const display = file.replace(/_/g, " ").replace(".md", "").replace(/^\d+\s+/, "")
            const isRead     = readFiles.has(file)
            const isSelected = selectedFile === file
            return (
              <motion.button
                key={file}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onSelectFile(file)}
                className={`mx-2 mb-0.5 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                  isSelected
                    ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25 text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {isRead
                  ? <CheckCircle2 className={`h-4 w-4 shrink-0 ${isSelected ? "text-[var(--color-accent)]" : "text-emerald-500"}`} />
                  : <FileText className="h-4 w-4 shrink-0 opacity-40" />
                }
                <span className="truncate capitalize">{display}</span>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {filtered.length === 0 && query && (
          <p className="px-4 py-6 text-center text-xs text-[var(--color-text-secondary)]">
            No chapters match "{query}"
          </p>
        )}
      </div>

      {/* Video generation panel */}
      <div className="border-t border-white/[0.07]">
        <button
          onClick={() => setShowVideo((p) => !p)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2 font-medium uppercase tracking-widest">
            <Video className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            Generate Video
          </span>
          {showVideo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <AnimatePresence>
          {showVideo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              {!videoJobId ? (
                <div className="px-4 pb-4 space-y-3">
                  {/* Voice */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {VOICES.map((v) => (
                      <button key={v.id} type="button" onClick={() => setVoice(v.id)}
                        className={`rounded-lg border py-2 text-center text-xs transition-all ${
                          voice === v.id
                            ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            : "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="font-semibold">{v.label}</div>
                        <div className="text-[9px] opacity-60">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                  {/* Style */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {STYLES.map((s) => (
                      <button key={s.id} type="button" onClick={() => setVidStyle(s.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-all ${
                          vidStyle === s.id
                            ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            : "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {!repoUrl && (
                    <p className="text-[10px] text-amber-400">Repo URL not detected from index.md</p>
                  )}
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!repoUrl}
                    className="w-full rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-warm)] py-2.5 text-xs font-bold text-[#05050a] disabled:opacity-40 hover:brightness-110 transition-all"
                  >
                    Generate →
                  </button>
                  {videoError && <p className="text-[10px] text-red-400">{videoError}</p>}
                </div>
              ) : (
                <div className="px-4 pb-4 flex items-center gap-2 text-sm">
                  {videoStatus === "completed"
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                  }
                  <span className="text-xs text-[var(--color-text-secondary)] capitalize">{videoStatus}</span>
                  {videoStatus === "completed" && videoUrl && (
                    <a href={videoUrl} target="_blank" rel="noreferrer"
                      className="ml-auto text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      Watch <PlayCircle className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard hint */}
        <div className="flex items-center gap-3 border-t border-white/[0.05] px-4 py-2">
          {[["J/K", "Nav"], ["/", "Search"], ["Esc", "Clear"]].map(([key, hint]) => (
            <div key={key} className="flex items-center gap-1 text-[9px] text-white/25">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono">{key}</kbd>
              <span>{hint}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
