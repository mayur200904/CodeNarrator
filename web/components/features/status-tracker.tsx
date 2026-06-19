"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getJobStatus, generateVideo, getJobLogs, getJobChapters, type JobLogEntry, API_BASE } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TerminalLogs } from "./terminal-logs"
import { PlayCircle, FileText, CheckCircle2, Loader2, Video as VideoIcon } from "lucide-react"

interface StatusTrackerProps {
    jobId: string
    repoUrl: string
    onReset: () => void
}

export function StatusTracker({ jobId, repoUrl, onReset }: StatusTrackerProps) {
    const router = useRouter()
    const [status, setStatus] = useState("queued")
    const [progress, setProgress] = useState<number>(10)
    const [jobLogs, setJobLogs] = useState<JobLogEntry[]>([])
    const [logSince, setLogSince] = useState<number>(0)
    const [videoJobId, setVideoJobId] = useState<string | null>(null)
    const [videoStatus, setVideoStatus] = useState<string | null>(null)
    const [projectName, setProjectName] = useState<string | null>(null)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [chapterFiles, setChapterFiles] = useState<string[]>([])
    const [chapterTotal, setChapterTotal] = useState<number>(0)
    const [chapterCompleted, setChapterCompleted] = useState<number>(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [videoError, setVideoError] = useState<string | null>(null)
    const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false)
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
    const hasNavigated = useRef(false)

    const inferredProjectName = useMemo(() => {
        for (let i = jobLogs.length - 1; i >= 0; i -= 1) {
            const message = jobLogs[i]?.message ?? ""
            const match = message.match(/output\/([A-Za-z0-9._-]+)/)
            if (match?.[1]) {
                return match[1]
            }
        }
        return null
    }, [jobLogs])

    const resolvedProjectName = projectName ?? inferredProjectName
    const hasChapterOutput = chapterCompleted > 0 || chapterFiles.length > 0

    useEffect(() => {
        if (!jobId || status === "failed") return

        const interval = setInterval(async () => {
            try {
                const data = await getJobChapters(jobId)
                setChapterFiles(data.chapter_files || [])
                setChapterTotal(data.total_chapters || 0)
                setChapterCompleted(data.completed_chapters || 0)
                if (!projectName && data.project_name) {
                    setProjectName(data.project_name)
                }
            } catch (e) {
                console.error(e)
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [jobId, status, projectName])

    // Poll for Text Job Status
    useEffect(() => {
        if (!jobId || status === "completed" || status === "failed") return

        const interval = setInterval(async () => {
            try {
                const data = await getJobStatus(jobId)
                setStatus(data.status)
                if (typeof data.progress === "number") {
                    setProgress(data.progress)
                }
                if (data.status === "completed" && data.result) {
                    setProjectName(data.result.project_name)
                }
                if (data.status === "failed") {
                    setErrorMessage(typeof data.error === "string" ? data.error : "Generation failed before artifacts could be produced.")
                }
            } catch (e) { console.error(e) }
        }, 2000)
        return () => clearInterval(interval)
    }, [jobId, status])

    // Poll for Text Job Logs
    useEffect(() => {
        if (!jobId) return

        const interval = setInterval(async () => {
            try {
                const data = await getJobLogs(jobId, logSince)
                if (data.logs?.length) {
                    setJobLogs(prev => [...prev, ...data.logs])
                }
                setLogSince(data.next_since || logSince)
                if (typeof data.progress === "number") {
                    setProgress(data.progress)
                }
            } catch (e) {
                console.error(e)
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [jobId, logSince])

    // Poll for Video Job Status
    useEffect(() => {
        if (!videoJobId || videoStatus === "completed" || videoStatus === "failed") return

        const interval = setInterval(async () => {
            try {
                const data = await getJobStatus(videoJobId)
                setVideoStatus(data.status)
                if (data.status === "completed" && resolvedProjectName) {
                    setVideoUrl(`${API_BASE}/output/${resolvedProjectName}/tutorial.mp4`)
                }
            } catch (e) { console.error(e) }
        }, 2000)
        return () => clearInterval(interval)
    }, [videoJobId, videoStatus, resolvedProjectName])

    useEffect(() => {
        if (status !== "completed" || !resolvedProjectName || !hasChapterOutput || autoRedirectCancelled || hasNavigated.current) return

        const interval = setInterval(() => {
            setRedirectCountdown((previous) => {
                if (previous === null) return 7
                return previous > 0 ? previous - 1 : 0
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [status, resolvedProjectName, hasChapterOutput, autoRedirectCancelled])

    useEffect(() => {
        if (
            status === "completed" &&
            resolvedProjectName &&
            !autoRedirectCancelled &&
            hasChapterOutput &&
            redirectCountdown === 0 &&
            !hasNavigated.current
        ) {
            hasNavigated.current = true
            router.push(`/tutorial/${resolvedProjectName}`)
        }
    }, [status, resolvedProjectName, hasChapterOutput, autoRedirectCancelled, redirectCountdown, router])

    const handleGenerateVideo = async () => {
        try {
            setVideoError(null)
            const data = await generateVideo(repoUrl, { voice: "en-US-GuyNeural", style: "cyberpunk" })
            setVideoJobId(data.job_id)
            setVideoStatus("queued")
        } catch {
            setVideoError("Failed to start video generation. Verify backend health and retry.")
        }
    }

    // Calculate Progress for UI
    const getProgress = () => {
        if (typeof progress === "number") return progress
        if (status === "queued") return 10
        if (status === "processing") return 45
        if (status === "completed") return 100
        return 0
    }

    const resolvedStatus = status === "processing" && getProgress() >= 100 ? "finalizing" : status
    const outputReady = Boolean(resolvedProjectName && hasChapterOutput)

    const openTutorial = () => {
        if (!resolvedProjectName || !hasChapterOutput) return
        hasNavigated.current = true
        router.push(`/tutorial/${resolvedProjectName}`)
    }

    const openRawOutput = () => {
        if (!resolvedProjectName || !hasChapterOutput) return
        const opened = window.open(`${API_BASE}/output/${resolvedProjectName}/index.md`, "_blank", "noopener,noreferrer")
        if (opened) opened.opener = null
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <Card className="glass-panel overflow-hidden rounded-3xl border-white/15 bg-(--color-surface)/90 text-white shadow-[0_28px_70px_rgba(0,0,0,0.45)]">
                <CardHeader className="border-b border-white/10 bg-black/15 pb-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            {status === "processing" && <Loader2 className="h-5 w-5 animate-spin text-(--color-accent)" />}
                            {status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                            Narration Pipeline
                        </CardTitle>
                        <Badge
                            variant="secondary"
                            className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-(--color-text-primary)"
                        >
                            {resolvedStatus}
                        </Badge>
                    </div>

                    <div className="mt-1 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-(--color-text-secondary)">
                            <p className="uppercase tracking-[0.14em]">Job ID</p>
                            <p className="mt-1 truncate font-mono text-[11px] text-white/85">{jobId}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-(--color-text-secondary)">
                            <p className="uppercase tracking-[0.14em]">Text Build</p>
                            <p className="mt-1 text-sm font-semibold text-white">{getProgress()}%</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-(--color-text-secondary)">
                            <p className="uppercase tracking-[0.14em]">Video</p>
                            <p className="mt-1 text-sm font-semibold text-white">{videoStatus ?? "idle"}</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 p-5 sm:p-7">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs uppercase tracking-[0.14em] text-(--color-text-secondary)">
                            <span>Text Tutorial Generation</span>
                            <span>{getProgress()}%</span>
                        </div>
                        <Progress
                            value={getProgress()}
                            className="h-2 rounded-full bg-white/10"
                            indicatorClassName="bg-gradient-to-r from-(--color-accent) via-cyan-300 to-(--color-accent-warm)"
                        />
                    </div>

                    <p aria-live="polite" className="text-xs text-(--color-text-secondary)">
                        {outputReady
                            ? `Output ready for ${resolvedProjectName}.`
                            : resolvedProjectName
                                ? `Project detected (${resolvedProjectName}). Building first tutorial chapter...`
                                : "Building output artifacts. Stay on this page for live updates."}
                    </p>

                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-(--color-text-secondary)">
                        <p className="uppercase tracking-[0.14em]">Chapter Build</p>
                        <p className="mt-1 text-sm font-semibold text-white">
                            {chapterTotal > 0
                                ? chapterCompleted > 0
                                    ? `${chapterCompleted}/${chapterTotal} chapters ready`
                                    : `0/${chapterTotal} chapters ready (first chapter in progress)`
                                : "Preparing chapter plan..."}
                        </p>
                        {chapterFiles.length > 0 && (
                            <p className="mt-1 truncate text-[11px] text-white/80">Latest: {chapterFiles[chapterFiles.length - 1]}</p>
                        )}
                    </div>

                    <TerminalLogs status={status} logs={jobLogs} />

                    {status === "failed" && (
                        <div className="rounded-xl border border-red-400/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
                            <p className="font-semibold">Generation failed.</p>
                            <p className="mt-1 text-red-200/90">{errorMessage ?? "Check the execution logs for details, then start a new project."}</p>
                        </div>
                    )}

                    {outputReady && (
                        <div className="grid gap-3 pt-1 sm:grid-cols-2">
                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-white/20 bg-black/20 text-(--color-text-primary) hover:bg-white/10"
                                onClick={openTutorial}
                            >
                                <FileText className="mr-2 h-4 w-4 text-(--color-accent)" />
                                Open Tutorial
                            </Button>

                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-white/20 bg-black/20 text-(--color-text-primary) hover:bg-white/10"
                                onClick={openRawOutput}
                            >
                                Open Raw Output
                            </Button>

                            {status === "completed" && redirectCountdown !== null && !autoRedirectCancelled && hasChapterOutput && (
                                <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm">
                                    <p className="text-cyan-100">
                                        Redirecting to tutorial in {redirectCountdown ?? 8}s.
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="h-8 rounded-lg border-cyan-200/40 bg-transparent text-cyan-100 hover:bg-cyan-500/15"
                                        onClick={() => {
                                            setAutoRedirectCancelled(true)
                                        }}
                                    >
                                        Stay Here
                                    </Button>
                                </div>
                            )}

                            {!videoJobId ? (
                                <Button
                                    className="h-11 rounded-xl bg-(--color-accent) font-semibold text-(--color-bg) hover:brightness-110"
                                    onClick={handleGenerateVideo}
                                >
                                    <VideoIcon className="mr-2 h-4 w-4" />
                                    Generate AI Video
                                </Button>
                            ) : (
                                <div className="flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm">
                                    <span className="text-(--color-text-secondary)">Video: {videoStatus}</span>
                                    {videoStatus === "processing" && <Loader2 className="h-4 w-4 animate-spin text-(--color-accent)" />}
                                    {videoStatus === "completed" && videoUrl && (
                                        <Button
                                            size="sm"
                                            className="h-8 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400"
                                            onClick={() => {
                                                const opened = window.open(videoUrl, "_blank", "noopener,noreferrer")
                                                if (opened) opened.opener = null
                                            }}
                                        >
                                            <PlayCircle className="mr-1 h-4 w-4" /> Watch
                                        </Button>
                                    )}
                                </div>
                            )}

                            {videoError && (
                                <p aria-live="polite" className="col-span-full rounded-xl border border-red-400/20 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                                    {videoError}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="border-t border-white/10 pt-4 text-center">
                        <button
                            onClick={onReset}
                            className="text-xs uppercase tracking-[0.14em] text-(--color-text-secondary) transition-colors hover:text-white"
                        >
                            Start New Project
                        </button>
                    </div>
                </CardContent>
            </Card>

            {videoStatus === "completed" && videoUrl && (
                <Card className="glass-panel overflow-hidden rounded-2xl border-white/15 bg-black/30">
                    <video controls className="aspect-video w-full" src={videoUrl} />
                </Card>
            )}
        </div>
    )
}
