"use client"

import { useEffect, useRef, useState } from "react"
import { getJobStatus, generateVideo, getJobLogs, getJobChapters, type JobLogEntry, API_BASE } from "@/lib/api"
import { addToHistory } from "@/lib/history"
import { getPrefs, savePrefs } from "@/lib/reading-progress"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Loader2, CheckCircle2, FileText, PlayCircle, Video as VideoIcon,
  GitBranch, BrainCircuit, BookOpen, Film, Layers, ExternalLink,
  ChevronRight,
} from "lucide-react"
import { TerminalLogs } from "./terminal-logs"

/* ── Pipeline stages ─────────────────────────────────────────── */
const STAGES = [
  { id: "fetch",     label: "Fetch Repo",       icon: GitBranch,    maxPct: 20  },
  { id: "abstracts", label: "Identify Concepts", icon: BrainCircuit, maxPct: 35  },
  { id: "analyze",  label: "Analyze Relations", icon: Layers,       maxPct: 50  },
  { id: "write",    label: "Write Chapters",    icon: BookOpen,     maxPct: 90  },
  { id: "done",     label: "Complete",          icon: Film,         maxPct: 100 },
]

function getActiveStage(pct: number): number {
  for (let i = 0; i < STAGES.length; i++) {
    if (pct <= STAGES[i].maxPct) return i
  }
  return STAGES.length - 1
}

/* ── Voice / Style pickers ───────────────────────────────────── */
const VOICES = [
  { id: "en-US-AriaNeural",  label: "Aria",  desc: "Female · Natural" },
  { id: "en-US-GuyNeural",   label: "Guy",   desc: "Male · Clear" },
  { id: "en-US-JennyNeural", label: "Jenny", desc: "Female · Friendly" },
]
const STYLES = [
  { id: "dark",      label: "Dark",      color: "#1a1f35" },
  { id: "light",     label: "Light",     color: "#f0f2ff" },
  { id: "cyberpunk", label: "Cyberpunk", color: "#2d0045" },
]

/* ── Elapsed timer ───────────────────────────────────────────── */
function useElapsed(running: boolean) {
  const [secs, setSecs] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs((s) => s + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])
  const m = Math.floor(secs / 60).toString().padStart(2, "0")
  const s = (secs % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

/* ── Props ───────────────────────────────────────────────────── */
interface StatusTrackerProps {
  jobId: string
  repoUrl: string
  onReset: () => void
}

/* ── Component ───────────────────────────────────────────────── */
export function StatusTracker({ jobId, repoUrl, onReset }: StatusTrackerProps) {
  const router = useRouter()

  const prefs = getPrefs()
  const [status, setStatus]               = useState("queued")
  const [progress, setProgress]           = useState(5)
  const [jobLogs, setJobLogs]             = useState<JobLogEntry[]>([])
  const [logSince, setLogSince]           = useState(0)
  const [projectName, setProjectName]     = useState<string | null>(null)
  const [chapterFiles, setChapterFiles]   = useState<string[]>([])
  const [chapterTotal, setChapterTotal]   = useState(0)
  const [chapterDone, setChapterDone]     = useState(0)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)
  const [videoJobId, setVideoJobId]       = useState<string | null>(null)
  const [videoStatus, setVideoStatus]     = useState<string | null>(null)
  const [videoUrl, setVideoUrl]           = useState<string | null>(null)
  const [videoError, setVideoError]       = useState<string | null>(null)
  const [voice, setVoice]                 = useState(prefs.voice)
  const [vidStyle, setVidStyle]           = useState(prefs.style)
  const [redirectCountdown, setRedirect]  = useState<number | null>(null)
  const [cancelRedirect, setCancelRedirect] = useState(false)
  const hasNavigated                        = useRef(false)
  const historySaved                        = useRef(false)

  const elapsed = useElapsed(status === "processing")
  const activeStage = getActiveStage(progress)

  /* ── chapter polling ──────────────────────────────────────── */
  useEffect(() => {
    if (!jobId || status === "failed") return
    const iv = setInterval(async () => {
      try {
        const d = await getJobChapters(jobId)
        setChapterFiles(d.chapter_files ?? [])
        setChapterTotal(d.total_chapters ?? 0)
        setChapterDone(d.completed_chapters ?? 0)
        if (!projectName && d.project_name) setProjectName(d.project_name)
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(iv)
  }, [jobId, status, projectName])

  /* ── job status polling ───────────────────────────────────── */
  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return
    const iv = setInterval(async () => {
      try {
        const d = await getJobStatus(jobId)
        setStatus(d.status)
        if (typeof d.progress === "number") setProgress(d.progress)
        if (d.status === "completed" && d.result) setProjectName(d.result.project_name)
        if (d.status === "failed") setErrorMsg(d.error ?? "Generation failed.")
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(iv)
  }, [jobId, status])

  /* ── log polling ──────────────────────────────────────────── */
  useEffect(() => {
    if (!jobId) return
    const iv = setInterval(async () => {
      try {
        const d = await getJobLogs(jobId, logSince)
        if (d.logs?.length) setJobLogs((p) => [...p, ...d.logs])
        setLogSince(d.next_since ?? logSince)
        if (typeof d.progress === "number") setProgress(d.progress)
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(iv)
  }, [jobId, logSince])

  /* ── video polling ────────────────────────────────────────── */
  useEffect(() => {
    if (!videoJobId || videoStatus === "completed" || videoStatus === "failed") return
    const iv = setInterval(async () => {
      try {
        const d = await getJobStatus(videoJobId)
        setVideoStatus(d.status)
        if (d.status === "completed" && projectName)
          setVideoUrl(`${API_BASE}/output/${projectName}/tutorial.mp4?raw=1`)
        if (d.status === "failed")
          setVideoError(typeof d.error === "string" && d.error ? d.error : "Video generation failed.")
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(iv)
  }, [videoJobId, videoStatus, projectName])

  /* ── save history + redirect ──────────────────────────────── */
  useEffect(() => {
    if (status !== "completed" || !projectName || chapterFiles.length === 0) return
    if (!historySaved.current) {
      historySaved.current = true
      addToHistory({ projectName, repoUrl, date: new Date().toISOString(), jobId })
    }
    if (cancelRedirect || hasNavigated.current) return
    const iv = setInterval(() => {
      setRedirect((p) => {
        if (p === null) return 7
        if (p <= 1) {
          clearInterval(iv)
          if (!hasNavigated.current) {
            hasNavigated.current = true
            router.push(`/tutorial/${projectName}`)
          }
          return 0
        }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [status, projectName, chapterFiles.length, cancelRedirect, router, repoUrl, jobId])

  const handleGenerateVideo = async () => {
    if (!repoUrl) return
    setVideoError(null)
    savePrefs({ voice, style: vidStyle })
    try {
      const d = await generateVideo(repoUrl, {
        voice,
        style: vidStyle,
        project_name: projectName ?? undefined,  // pass exact name to avoid URL-derivation mismatch
      })
      setVideoJobId(d.job_id)
      setVideoStatus("queued")
    } catch {
      setVideoError("Failed to start video generation.")
    }
  }

  const openTutorial = () => {
    if (!projectName) return
    hasNavigated.current = true
    router.push(`/tutorial/${projectName}`)
  }

  const outputReady = Boolean(projectName && chapterFiles.length > 0)

  return (
    <div className="space-y-5">
      {/* ── Pipeline card ────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.1] bg-[#0d1117] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-3">
            {status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />}
            {status === "completed"  && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {status === "failed"     && <span className="h-4 w-4 text-red-400 font-bold text-sm">✕</span>}
            {status === "queued"     && <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
            <h2 className="font-semibold text-white text-sm">Narration Pipeline</h2>
          </div>
          <div className="flex items-center gap-3">
            {status === "processing" && (
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{elapsed}</span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${
              status === "completed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
              status === "failed"    ? "border-red-500/40 bg-red-500/10 text-red-300" :
              status === "processing"? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]" :
                                       "border-amber-400/40 bg-amber-400/10 text-amber-300"
            }`}>
              {status}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── Stage nodes ─────────────────────────────────── */}
          <div className="relative">
            {/* connector line */}
            <div className="absolute top-5 left-5 right-5 h-px bg-white/[0.07]" />
            <div
              className="absolute top-5 left-5 h-px bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-warm)] transition-all duration-700"
              style={{ width: `${Math.min(progress, 98)}%` }}
            />
            <div className="relative flex justify-between">
              {STAGES.map((stage, i) => {
                const done   = i < activeStage || status === "completed"
                const active = i === activeStage && status !== "completed"
                const Icon   = stage.icon
                return (
                  <div key={stage.id} className="flex flex-col items-center gap-2">
                    <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                      done   ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400" :
                      active ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/15 text-[var(--color-accent)]" :
                               "border-white/[0.1] bg-[#0d1117] text-white/20"
                    }`}>
                      {done
                        ? <CheckCircle2 className="h-4 w-4" />
                        : active
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Icon className="h-4 w-4" />
                      }
                    </div>
                    <span className={`text-[10px] text-center max-w-[72px] leading-tight ${
                      done || active ? "text-white" : "text-white/30"
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Chapter progress ─────────────────────────────── */}
          {chapterTotal > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                <span className="uppercase tracking-widest">Chapters</span>
                <span className="font-mono">{chapterDone} / {chapterTotal}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-warm)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((chapterDone / chapterTotal) * 100)}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          )}

          {/* ── Terminal logs ─────────────────────────────────── */}
          <TerminalLogs status={status} logs={jobLogs} />

          {/* ── Error ─────────────────────────────────────────── */}
          {status === "failed" && (
            <div className="rounded-xl border border-red-400/25 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              <p className="font-semibold">Generation failed.</p>
              <p className="mt-1 text-red-300/80">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Chapter cards ────────────────────────────────────── */}
      <AnimatePresence>
        {chapterFiles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
              Ready Chapters
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {chapterFiles.map((file, i) => {
                const display = file.replace(/_/g, " ").replace(".md", "").replace(/^\d+\s+/, "")
                return (
                  <motion.a
                    key={file}
                    href={projectName ? `/tutorial/${projectName}` : undefined}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition-all group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
                      <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    </div>
                    <span className="flex-1 truncate text-sm text-white capitalize">{display}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-[var(--color-accent)] transition-colors" />
                  </motion.a>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions + Video ───────────────────────────────────── */}
      {outputReady && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Open tutorial */}
          <div className="flex gap-3">
            <button
              onClick={openTutorial}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-3 text-sm font-bold text-[#05050a] hover:brightness-110 transition-all"
            >
              <FileText className="h-4 w-4" /> Open Tutorial
            </button>
            <a
              href={projectName ? `${API_BASE}/output/${projectName}/index.md` : undefined}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.12] px-4 py-3 text-sm text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <ExternalLink className="h-4 w-4" /> Raw
            </a>
          </div>

          {/* Redirect countdown */}
          <AnimatePresence>
            {redirectCountdown !== null && !cancelRedirect && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-4 py-3 text-sm"
              >
                <span className="text-[var(--color-accent)]">
                  Redirecting to tutorial in <strong>{redirectCountdown}s</strong>
                </span>
                <button
                  onClick={() => setCancelRedirect(true)}
                  className="text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors border border-white/20 rounded-lg px-3 py-1"
                >
                  Stay
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video generation panel */}
          {!videoJobId ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d1117] p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Generate AI Video
              </p>

              {/* Voice picker */}
              <div>
                <p className="mb-2 text-xs text-white/40 uppercase tracking-widest">Voice</p>
                <div className="grid grid-cols-3 gap-2">
                  {VOICES.map((v) => (
                    <button key={v.id} type="button" onClick={() => setVoice(v.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition-all ${
                        voice === v.id
                          ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "border-white/[0.08] text-[var(--color-text-secondary)] hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-semibold">{v.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style picker */}
              <div>
                <p className="mb-2 text-xs text-white/40 uppercase tracking-widest">Style</p>
                <div className="grid grid-cols-3 gap-2">
                  {STYLES.map((s) => (
                    <button key={s.id} type="button" onClick={() => setVidStyle(s.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                        vidStyle === s.id
                          ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "border-white/[0.08] text-[var(--color-text-secondary)] hover:border-white/20"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateVideo}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-warm)] py-3 text-sm font-bold text-[#05050a] hover:brightness-110 transition-all"
              >
                <VideoIcon className="h-4 w-4" /> Generate Video
              </button>

              {videoError && (
                <p className="text-xs text-red-300 border border-red-400/20 bg-red-950/20 rounded-lg px-3 py-2">{videoError}</p>
              )}
            </div>
          ) : videoStatus === "failed" ? (
            /* ── Video failed — show error + retry ── */
            <div className="rounded-2xl border border-red-500/25 bg-red-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-300">
                <span className="text-red-400 font-bold">✕</span>
                Video generation failed
              </div>
              {videoError && (
                <p className="text-xs text-red-300/70 leading-5">
                  {videoError.length > 200 ? videoError.slice(0, 200) + "…" : videoError}
                </p>
              )}
              <button
                onClick={() => { setVideoJobId(null); setVideoStatus(null); setVideoError(null) }}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs text-white hover:bg-white/[0.1] transition-colors"
              >
                <VideoIcon className="h-3.5 w-3.5" /> Try Again
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0d1117] px-5 py-4">
              <div className="flex items-center gap-3">
                {videoStatus === "processing" || videoStatus === "queued"
                  ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                  : <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                }
                <span className="text-sm text-white">
                  Video: <span className="text-[var(--color-text-secondary)]">{videoStatus}</span>
                </span>
              </div>
              {videoStatus === "completed" && videoUrl && (
                <a
                  href={videoUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Watch
                </a>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Reset ─────────────────────────────────────────────── */}
      <div className="pt-2 text-center">
        <button
          onClick={onReset}
          className="text-xs uppercase tracking-widest text-white/30 hover:text-white transition-colors"
        >
          ← Start New Project
        </button>
      </div>
    </div>
  )
}
