"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Loader2, ExternalLink, Copy, Check,
  Download, Minimize2, Maximize2, SlidersHorizontal,
} from "lucide-react"
import { getArtifacts, API_BASE } from "@/lib/api"
import { getReadChapters, markChapterRead } from "@/lib/reading-progress"
import { Mermaid } from "@/components/ui/mermaid"
import { TutorialSidebar } from "@/components/tutorial/sidebar"
import { TableOfContents } from "@/components/tutorial/toc"

/* ── Markdown helpers ────────────────────────────────────────── */
// BUG FIX 4: extract plain text from React children so heading IDs match TOC slugs
function extractPlainText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractPlainText).join("")
  if (node !== null && typeof node === "object" && "props" in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return extractPlainText((node as any).props?.children)
  }
  return ""
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim()
}

const MD_COMPONENTS: Components = {
  code({ className, children }) {
    const lang = /language-(\w+)/.exec(className ?? "")?.[1]
    if (lang === "mermaid") return <Mermaid chart={String(children).replace(/\n$/, "")} />
    return (
      <code className={`${className ?? ""} rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-sm text-red-200`}>
        {children}
      </code>
    )
  },
  pre: (p) => <pre className="my-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4" {...p} />,
  h1: (p) => {
    const id = slugify(extractPlainText(p.children))
    return <h1 id={id} className="mt-8 mb-4 text-3xl font-bold text-white scroll-mt-20" {...p} />
  },
  h2: (p) => {
    const id = slugify(extractPlainText(p.children))
    return <h2 id={id} className="mt-8 mb-4 border-b border-zinc-800 pb-2 text-2xl font-semibold text-[var(--color-accent)] scroll-mt-20" {...p} />
  },
  h3: (p) => {
    const id = slugify(extractPlainText(p.children))
    return <h3 id={id} className="mt-6 mb-3 text-xl font-semibold text-[var(--color-accent-warm)] scroll-mt-20" {...p} />
  },
  p:          (p) => <p className="mb-4 leading-7 text-zinc-300" {...p} />,
  ul:         (p) => <ul className="mb-4 list-disc space-y-1 pl-6 text-zinc-300" {...p} />,
  ol:         (p) => <ol className="mb-4 list-decimal space-y-1 pl-6 text-zinc-300" {...p} />,
  blockquote: (p) => <blockquote className="my-4 rounded-r border-l-4 border-[var(--color-accent)] bg-zinc-900/30 py-2 pr-2 pl-4 italic text-zinc-400" {...p} />,
  a:          (p) => <a className="text-[var(--color-accent)] transition-colors hover:text-cyan-300 hover:underline" {...p} />,
}

/* ── Main page ───────────────────────────────────────────────── */
export default function TutorialViewer() {
  const params      = useParams()
  const projectName = params.project as string

  const [allFiles, setAllFiles]         = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent]           = useState("")
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [repoUrl, setRepoUrl]           = useState<string | null>(null)
  const [readFiles, setReadFiles]       = useState<Set<string>>(new Set())
  const [copied, setCopied]             = useState(false)

  // Video state
  const [isMiniPlayer, setIsMiniPlayer]       = useState(false)
  const [showAdjustments, setShowAdjustments] = useState(false)
  const [playbackRate, setPlaybackRate]       = useState(1)
  const [brightness, setBrightness]           = useState(1)
  const [contrast, setContrast]               = useState(1)
  const [saturation, setSaturation]           = useState(1)
  const videoRef      = useRef<HTMLVideoElement | null>(null)
  // BUG FIX 1: ref on the inner scroll container so scrollTo works
  const contentScrollRef = useRef<HTMLDivElement | null>(null)

  const markdownFiles = useMemo(
    () => allFiles.filter((f) => f.toLowerCase().endsWith(".md")),
    [allFiles]
  )
  const videoFile = useMemo(
    () => allFiles.find((f) => f.toLowerCase().endsWith("tutorial.mp4")),
    [allFiles]
  )
  const videoUrl = videoFile
    ? `${API_BASE}/output/${projectName}/${videoFile}?raw=1`
    : null

  const showVideoOnPage = Boolean(videoUrl && selectedFile === "index.md")

  /* ── Load files ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!projectName) return
    const load = async () => {
      const d = await getArtifacts(projectName)
      if (d?.files) {
        const sorted = [...d.files].sort((a: string, b: string) =>
          a === "index.md" ? -1 : b === "index.md" ? 1 : a.localeCompare(b)
        )
        setAllFiles(sorted)
        const mds = sorted.filter((f: string) => f.toLowerCase().endsWith(".md"))
        // Only set on first load — don't override the user's current selection
        setSelectedFile(prev => prev === null && mds.length > 0 ? mds[0] : prev)
      }
      setLoadingFiles(false)
    }
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [projectName])

  /* ── Load content ────────────────────────────────────────────── */
  useEffect(() => {
    if (!projectName || !selectedFile) return
    setLoadingContent(true)
    fetch(`${API_BASE}/output/${projectName}/${selectedFile}`)
      .then((r) => r.text())
      .then((text) => {
        setContent(text)
        setLoadingContent(false)
        // Extract repo URL from index
        if (selectedFile === "index.md") {
          const m = text.match(/\*\*Source Repository:\*\*\s*\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/i)
              ?? text.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i)
          if (m) setRepoUrl(m[1] ?? m[0])
        }
      })
      .catch(() => { setContent("Error loading file."); setLoadingContent(false) })
  }, [projectName, selectedFile])

  /* ── BUG FIX 2: fetch index.md on mount to get repoUrl immediately ── */
  useEffect(() => {
    if (!projectName) return
    fetch(`${API_BASE}/output/${projectName}/index.md`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        if (!text) return
        const m =
          text.match(/\*\*Source Repository:\*\*\s*\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/i) ??
          text.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i)
        if (m) setRepoUrl(m[1] ?? m[0])
      })
      .catch(() => {})
  }, [projectName])

  /* ── Reading progress ────────────────────────────────────────── */
  useEffect(() => {
    setReadFiles(getReadChapters(projectName))
  }, [projectName])

  const handleSelectFile = useCallback((file: string) => {
    setSelectedFile(file)
    markChapterRead(projectName, file)
    setReadFiles((prev) => new Set([...prev, file]))
    // BUG FIX 1: scroll the inner overflow container, not window
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "instant" })
  }, [projectName])

  /* ── Keyboard navigation ─────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      const idx = markdownFiles.indexOf(selectedFile ?? "")
      if ((e.key === "j" || e.key === "ArrowDown") && idx < markdownFiles.length - 1) {
        e.preventDefault() // BUG FIX 3: stop browser scroll on j/ArrowDown
        handleSelectFile(markdownFiles[idx + 1])
      }
      if ((e.key === "k" || e.key === "ArrowUp") && idx > 0) {
        e.preventDefault() // BUG FIX 3: stop browser scroll on k/ArrowUp
        handleSelectFile(markdownFiles[idx - 1])
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [markdownFiles, selectedFile, handleSelectFile])

  /* ── Playback rate ───────────────────────────────────────────── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate
  }, [playbackRate, videoUrl])

  const focusVideoSection = () => {
    if (selectedFile !== "index.md") handleSelectFile("index.md")
    setIsMiniPlayer(false)
    setTimeout(() => {
      // scrollIntoView works on the nearest scrollable ancestor (our inner div)
      document.getElementById("tutorial-video")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!content || !selectedFile) return
    const blob = new Blob([content], { type: "text/markdown" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = selectedFile
    a.click()
  }

  if (loadingFiles) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05050a]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#05050a] text-white">
      {/* Sidebar */}
      <TutorialSidebar
        projectName={projectName}
        markdownFiles={markdownFiles}
        selectedFile={selectedFile}
        readFiles={readFiles}
        onSelectFile={handleSelectFile}
        repoUrl={repoUrl}
        hasVideo={Boolean(videoUrl)}
        onFocusVideo={focusVideoSection}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#05050a]/80 backdrop-blur px-6">
          <h1 className="truncate font-display text-xl font-semibold text-white">
            {selectedFile?.replace(/_/g, " ").replace(".md", "") ?? "Select a chapter"}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyUrl}
              title="Copy link"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Share"}
            </button>
            <button
              onClick={handleDownload}
              title="Download .md"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            {selectedFile && (
              <a
                href={`${API_BASE}/output/${projectName}/${selectedFile}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                Raw <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Content + TOC */}
        <div className="flex flex-1 overflow-hidden">
          {/* Scrollable content — BUG FIX 1: ref for programmatic scrollTo */}
          <div ref={contentScrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-8 py-8 pb-24">
              {/* Video player section */}
              {showVideoOnPage && videoUrl && (
                <section
                  id="tutorial-video"
                  className={
                    isMiniPlayer
                      ? "fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] rounded-xl border border-white/20 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur"
                      : "not-prose mb-8 rounded-xl border border-white/[0.1] bg-zinc-950/70 p-4"
                  }
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Tutorial Video</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsMiniPlayer((p) => !p)}
                        className="h-7 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 text-xs text-zinc-300 hover:bg-white/[0.1] transition-colors"
                      >
                        {isMiniPlayer
                          ? <Maximize2 className="h-3.5 w-3.5" />
                          : <Minimize2 className="h-3.5 w-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => setShowAdjustments((p) => !p)}
                        className="h-7 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 text-xs text-zinc-300 hover:bg-white/[0.1] transition-colors"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls preload="metadata" playsInline
                    className="aspect-video w-full rounded-lg border border-white/[0.08] bg-black"
                    style={{ filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})` }}
                  />

                  {/* Playback speed */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <button
                        key={r}
                        onClick={() => setPlaybackRate(r)}
                        className={`h-6 rounded px-2 text-xs transition-colors ${
                          playbackRate === r
                            ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                            : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] border border-transparent"
                        }`}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>

                  {showAdjustments && (
                    <div className="mt-3 space-y-2 rounded-lg border border-white/[0.08] bg-black/40 p-3">
                      {([["Brightness", brightness, setBrightness, 0.5, 1.8],
                         ["Contrast",   contrast,   setContrast,   0.5, 1.8],
                         ["Saturation", saturation, setSaturation, 0.2, 2.0]] as const).map(([label, val, setter, min, max]) => (
                        <label key={label} className="block text-xs text-zinc-400">
                          {label} ({Number(val).toFixed(2)})
                          <input type="range" min={min} max={max} step={0.05} value={Number(val)}
                            onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                      ))}
                      <button
                        onClick={() => { setBrightness(1); setContrast(1); setSaturation(1) }}
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* Markdown content */}
              {loadingContent ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
                </div>
              ) : (
                <article className="prose prose-invert prose-zinc max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                    {content}
                  </ReactMarkdown>
                </article>
              )}

              {/* Chapter navigation footer */}
              {markdownFiles.length > 1 && (
                <div className="mt-12 flex items-center justify-between border-t border-white/[0.07] pt-6 text-sm">
                  {(() => {
                    const idx = markdownFiles.indexOf(selectedFile ?? "")
                    const prev = markdownFiles[idx - 1]
                    const next = markdownFiles[idx + 1]
                    return (
                      <>
                        {prev ? (
                          <button onClick={() => handleSelectFile(prev)}
                            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors">
                            ← <span className="capitalize">{prev.replace(/_/g," ").replace(".md","").replace(/^\d+\s+/,"")}</span>
                          </button>
                        ) : <span />}
                        {next ? (
                          <button onClick={() => handleSelectFile(next)}
                            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors">
                            <span className="capitalize">{next.replace(/_/g," ").replace(".md","").replace(/^\d+\s+/,"")}</span> →
                          </button>
                        ) : <span />}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* TOC */}
          <div className="overflow-y-auto px-4 py-8">
            <TableOfContents content={content} />
          </div>
        </div>
      </div>
    </div>
  )
}
