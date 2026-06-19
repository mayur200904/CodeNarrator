"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { getArtifacts, generateVideo, getJobStatus, API_BASE } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Loader2, FileText, ChevronLeft, ExternalLink, Video, PlayCircle, Minimize2, Maximize2, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { Mermaid } from "@/components/ui/mermaid"

export default function TutorialViewer() {
    // params might be a Promise in newer Next.js server components, but this is a Client Component utilizing useParams
    const params = useParams()
    const projectName = params.project as string

    const [allFiles, setAllFiles] = useState<string[]>([])
    const [selectedFile, setSelectedFile] = useState<string | null>(null)
    const [content, setContent] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [loadedFile, setLoadedFile] = useState<string | null>(null)
    const [videoJobId, setVideoJobId] = useState<string | null>(null)
    const [videoStatus, setVideoStatus] = useState<string>("idle")
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [videoError, setVideoError] = useState<string | null>(null)
    const [repoUrl, setRepoUrl] = useState<string | null>(null)
    const [isMiniPlayer, setIsMiniPlayer] = useState(false)
    const [showAdjustments, setShowAdjustments] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [brightness, setBrightness] = useState(1)
    const [contrast, setContrast] = useState(1)
    const [saturation, setSaturation] = useState(1)
    const videoRef = useRef<HTMLVideoElement | null>(null)

    const markdownFiles = useMemo(() => {
        return allFiles.filter((file) => file.toLowerCase().endsWith(".md"))
    }, [allFiles])

    const discoveredVideoFile = useMemo(() => {
        const mp4Files = allFiles.filter((file) => file.toLowerCase().endsWith(".mp4"))
        if (mp4Files.length === 0) return null
        return mp4Files.find((file) => file.toLowerCase().endsWith("tutorial.mp4")) ?? mp4Files[0]
    }, [allFiles])

    const effectiveVideoUrl = discoveredVideoFile
        ? `${API_BASE}/output/${projectName}/${discoveredVideoFile}${discoveredVideoFile.toLowerCase().endsWith("tutorial.mp4") ? "?raw=1" : ""}`
        : videoUrl

    const shouldShowVideoOnCurrentPage = Boolean(effectiveVideoUrl && selectedFile === "index.md")

    const focusVideoSection = () => {
        if (selectedFile !== "index.md") {
            setSelectedFile("index.md")
        }
        setIsMiniPlayer(false)
        window.setTimeout(() => {
            const section = document.getElementById("tutorial-video")
            if (section) {
                section.scrollIntoView({ behavior: "smooth", block: "start" })
            }
        }, 50)
    }

    const extractRepoUrlFromIndex = (markdown: string): string | null => {
        const sourceRepoMatch = markdown.match(/\*\*Source Repository:\*\*\s*\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/i)
        if (sourceRepoMatch?.[1]) return sourceRepoMatch[1]

        const genericRepoMatch = markdown.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\/)?/i)
        return genericRepoMatch?.[0] ?? null
    }

    // Fetch file list
    useEffect(() => {
        if (!projectName) return

        const refreshArtifacts = async () => {
            const data = await getArtifacts(projectName)
            if (data && data.files) {
                const sorted = data.files.sort((a: string, b: string) => {
                    if (a === "index.md") return -1
                    if (b === "index.md") return 1
                    return a.localeCompare(b)
                })
                const markdownOnly = sorted.filter((file: string) => file.toLowerCase().endsWith(".md"))
                setAllFiles(sorted)

                if (!selectedFile && markdownOnly.length > 0) {
                    setSelectedFile(markdownOnly[0])
                } else if (selectedFile && !markdownOnly.includes(selectedFile) && markdownOnly.length > 0) {
                    setSelectedFile(markdownOnly[0])
                }
            }
        }

        refreshArtifacts()
            .finally(() => setLoading(false))

        const interval = setInterval(() => {
            refreshArtifacts().catch(() => {
                // Ignore transient polling errors and keep prior artifact list.
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [projectName, selectedFile])

    // Fetch content
    useEffect(() => {
        if (!projectName || !selectedFile) return

        fetch(`${API_BASE}/output/${projectName}/${selectedFile}`)
            .then(res => res.text())
            .then(text => {
                setContent(text)
                setLoadedFile(selectedFile)
            })
            .catch(() => {
                setContent("Error loading file.")
                setLoadedFile(selectedFile)
            })
    }, [projectName, selectedFile])

    useEffect(() => {
        if (!projectName) return

        fetch(`${API_BASE}/output/${projectName}/index.md`)
            .then((res) => (res.ok ? res.text() : ""))
            .then((text) => {
                if (!text) return
                const extracted = extractRepoUrlFromIndex(text)
                if (extracted) setRepoUrl(extracted)
            })
            .catch(() => {
                // It's fine if we cannot infer repo URL from index here.
            })
    }, [projectName])

    useEffect(() => {
        if (!videoJobId || videoStatus === "completed" || videoStatus === "failed") return

        const interval = setInterval(async () => {
            try {
                const data = await getJobStatus(videoJobId)
                setVideoStatus(data.status ?? "processing")
                if (data.status === "completed") {
                    setVideoUrl(`${API_BASE}/output/${projectName}/tutorial.mp4?raw=1`)
                }
                if (data.status === "failed") {
                    setVideoError(typeof data.error === "string" ? data.error : "Video generation failed.")
                }
            } catch {
                setVideoError("Unable to fetch video job status.")
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [videoJobId, videoStatus, projectName])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.playbackRate = playbackRate
    }, [playbackRate, effectiveVideoUrl])

    const handleGenerateVideo = async () => {
        setVideoError(null)
        const sourceRepoUrl = repoUrl ?? window.prompt("Enter the source GitHub repository URL:")?.trim() ?? ""

        if (!sourceRepoUrl) {
            setVideoError("Repository URL is required to generate video.")
            return
        }

        try {
            const data = await generateVideo(sourceRepoUrl, { voice: "en-US-GuyNeural", style: "cyberpunk" })
            setRepoUrl(sourceRepoUrl)
            setVideoJobId(data.job_id)
            setVideoStatus("queued")
            setVideoUrl(null)
        } catch {
            setVideoError("Failed to start video generation.")
        }
    }

    const contentLoading = Boolean(selectedFile && loadedFile !== selectedFile)

    const markdownComponents: Components = {
        code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const isMermaid = match?.[1] === "mermaid"

            if (isMermaid) {
                return <Mermaid chart={String(children).replace(/\n$/, "")} />
            }

            return (
                <code className={`${className} rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-sm text-red-200`} {...props}>
                    {children}
                </code>
            )
        },
        pre({ children, ...props }) {
            return (
                <pre className="my-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4" {...props}>
                    {children}
                </pre>
            )
        },
        h1: (props) => <h1 className="mt-8 mb-4 text-3xl font-bold text-white" {...props} />,
        h2: (props) => <h2 className="mt-8 mb-4 border-b border-zinc-800 pb-2 text-2xl font-semibold text-(--color-accent)" {...props} />,
        h3: (props) => <h3 className="mt-6 mb-3 text-xl font-semibold text-(--color-accent-warm)" {...props} />,
        p: (props) => <p className="mb-4 leading-7 text-zinc-300" {...props} />,
        ul: (props) => <ul className="mb-4 list-disc space-y-1 pl-6 text-zinc-300" {...props} />,
        ol: (props) => <ol className="mb-4 list-decimal space-y-1 pl-6 text-zinc-300" {...props} />,
        blockquote: (props) => <blockquote className="my-4 rounded-r border-l-4 border-(--color-accent) bg-zinc-900/30 py-2 pr-2 pl-4 italic text-zinc-400" {...props} />,
        a: (props) => <a className="text-(--color-accent) transition-colors hover:text-cyan-300 hover:underline" {...props} />,
    }

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin h-8 w-8 text-cyan-500" /></div>
    }

    return (
        <div className="flex h-screen overflow-hidden bg-(--color-bg) text-white">
            {/* Sidebar */}
            <aside aria-label="Tutorial chapters" className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-black/30 backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/10 p-4">
                    <Link href="/" aria-label="Back to Home" className="rounded-full p-2 transition-colors hover:bg-zinc-800">
                        <ChevronLeft className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                    </Link>
                    <div>
                        <h2 className="font-semibold text-sm text-zinc-200">Documentation</h2>
                        <Badge variant="outline" className="mt-1 border-white/20 text-xs text-zinc-400">{projectName}</Badge>
                    </div>
                </div>
                <ScrollArea className="flex-1 overflow-hidden">
                    <div className="p-2 space-y-1">
                        {effectiveVideoUrl && (
                            <Button
                                variant="secondary"
                                className="w-full justify-start bg-emerald-900/25 text-sm font-medium text-emerald-300 hover:bg-emerald-900/35"
                                onClick={focusVideoSection}
                            >
                                <PlayCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="truncate">Watch Video</span>
                            </Button>
                        )}
                        {markdownFiles.length === 0 && (
                            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                                No markdown chapters found for this project.
                            </p>
                        )}
                        {markdownFiles.map(file => (
                            <Button
                                key={file}
                                variant={selectedFile === file ? "secondary" : "ghost"}
                                className={`w-full justify-start text-sm font-normal truncate ${selectedFile === file ? 'bg-cyan-900/20 text-cyan-400 hover:bg-cyan-900/30' : 'text-zinc-400 hover:text-zinc-200'}`}
                                onClick={() => setSelectedFile(file)}
                            >
                                <FileText className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                                <span className="truncate">{file.replace(/_/g, " ").replace(".md", "")}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </aside>

            {/* Content Area */}
            <div className="flex min-w-0 flex-1 flex-col bg-transparent">
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-8">
                    <h1 className="truncate font-display text-3xl text-white">
                        {selectedFile?.replace(/_/g, " ").replace(".md", "") || "Select a chapter"}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleGenerateVideo}
                            disabled={videoStatus === "processing" || videoStatus === "queued"}
                            className="h-8 rounded-lg bg-(--color-accent) px-3 text-xs font-semibold text-(--color-bg) hover:brightness-110"
                        >
                            {videoStatus === "processing" || videoStatus === "queued" ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                                <Video className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {videoStatus === "processing" || videoStatus === "queued" ? "Generating..." : "Generate Video"}
                        </Button>

                        {effectiveVideoUrl && (
                            <Button
                                onClick={focusVideoSection}
                                className="h-8 rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-2.5 text-xs text-emerald-100 hover:bg-emerald-500/25"
                            >
                                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                Watch Video
                            </Button>
                        )}

                        {selectedFile && (
                            <a
                                href={`${API_BASE}/output/${projectName}/${selectedFile}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                Open Raw
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </div>
                {videoError && (
                    <p aria-live="polite" className="border-b border-red-400/20 bg-red-950/30 px-8 py-2 text-xs text-red-200">
                        {videoError}
                    </p>
                )}
                <ScrollArea className="flex-1 p-8 overflow-hidden">
                    {contentLoading ? (
                        <div className="flex items-center justify-center h-40 text-zinc-500">Loading content…</div>
                    ) : (
                        <article className="prose prose-invert prose-zinc mx-auto max-w-4xl pb-20">
                            {shouldShowVideoOnCurrentPage && (
                                <section
                                    id="tutorial-video"
                                    className={isMiniPlayer
                                        ? "fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] rounded-xl border border-white/20 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur"
                                        : "not-prose mb-6 rounded-xl border border-white/15 bg-zinc-950/70 p-4"
                                    }
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <h2 className="text-sm font-semibold text-zinc-100">Tutorial Video</h2>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 bg-white/10 text-xs text-zinc-200 hover:bg-white/20"
                                                onClick={() => setIsMiniPlayer((prev) => !prev)}
                                            >
                                                {isMiniPlayer ? <Maximize2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : <Minimize2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
                                                {isMiniPlayer ? "Restore" : "Minimize"}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 bg-white/10 text-xs text-zinc-200 hover:bg-white/20"
                                                onClick={() => setShowAdjustments((prev) => !prev)}
                                            >
                                                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                                Adjust
                                            </Button>
                                        </div>
                                    </div>
                                    <video
                                        ref={videoRef}
                                        src={effectiveVideoUrl ?? undefined}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        className="aspect-video w-full rounded-lg border border-white/10 bg-black"
                                        style={{
                                            filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`,
                                        }}
                                    />
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                            <Button
                                                key={rate}
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className={`h-7 px-2 text-xs ${playbackRate === rate ? "bg-cyan-700/50 text-cyan-100" : "bg-white/10 text-zinc-300 hover:bg-white/20"}`}
                                                onClick={() => setPlaybackRate(rate)}
                                            >
                                                {rate}x
                                            </Button>
                                        ))}
                                    </div>

                                    {showAdjustments && (
                                        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/40 p-3">
                                            <label className="block text-xs text-zinc-300">
                                                Brightness ({brightness.toFixed(2)})
                                                <input
                                                    type="range"
                                                    min={0.5}
                                                    max={1.8}
                                                    step={0.05}
                                                    value={brightness}
                                                    onChange={(e) => setBrightness(Number(e.target.value))}
                                                    className="mt-1 w-full"
                                                />
                                            </label>
                                            <label className="block text-xs text-zinc-300">
                                                Contrast ({contrast.toFixed(2)})
                                                <input
                                                    type="range"
                                                    min={0.5}
                                                    max={1.8}
                                                    step={0.05}
                                                    value={contrast}
                                                    onChange={(e) => setContrast(Number(e.target.value))}
                                                    className="mt-1 w-full"
                                                />
                                            </label>
                                            <label className="block text-xs text-zinc-300">
                                                Saturation ({saturation.toFixed(2)})
                                                <input
                                                    type="range"
                                                    min={0.2}
                                                    max={2}
                                                    step={0.05}
                                                    value={saturation}
                                                    onChange={(e) => setSaturation(Number(e.target.value))}
                                                    className="mt-1 w-full"
                                                />
                                            </label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className="h-7 bg-white/10 text-xs text-zinc-300 hover:bg-white/20"
                                                onClick={() => {
                                                    setBrightness(1)
                                                    setContrast(1)
                                                    setSaturation(1)
                                                }}
                                            >
                                                Reset Adjustments
                                            </Button>
                                        </div>
                                    )}
                                </section>
                            )}
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {content}
                            </ReactMarkdown>
                        </article>
                    )}
                </ScrollArea>
            </div>
        </div>
    )
}
