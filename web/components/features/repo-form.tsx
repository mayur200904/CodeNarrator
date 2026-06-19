"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { generateText } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface RepoFormProps {
    onJobStarted: (jobId: string, repoUrl: string) => void
}

export function RepoForm({ onJobStarted }: RepoFormProps) {
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const data = await generateText(url, true)
            onJobStarted(data.job_id, url)
        } catch {
            setError("Failed to start job. Ensure the backend is running.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="glass-panel w-full rounded-3xl border-white/15 bg-(--color-surface)/85 shadow-[0_26px_70px_rgba(0,0,0,0.45)]">
            <CardHeader className="space-y-3 pb-4">
                <CardTitle className="font-display text-3xl leading-tight text-white">
                    Launch A New Narration Job
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-6 text-(--color-text-secondary)">
                    Paste any public GitHub repository URL. We fetch structure, detect abstractions, and begin chapter generation in the background.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block space-y-2">
                        <span className="text-xs uppercase tracking-[0.16em] text-(--color-text-secondary)">Repository URL</span>
                        <Input
                            type="url"
                            name="repositoryUrl"
                            autoComplete="url"
                            inputMode="url"
                            spellCheck={false}
                            placeholder="https://github.com/username/repo"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="h-12 rounded-xl border-white/15 bg-black/30 text-base text-white placeholder:text-(--color-text-secondary) focus-visible:ring-(--color-accent)"
                        />
                    </label>

                    {error && (
                        <p aria-live="polite" className="rounded-xl border border-red-400/20 bg-red-950/35 px-3 py-2 text-sm text-red-300">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading || !url}
                        className="h-12 w-full rounded-xl bg-(--color-accent) text-sm font-semibold uppercase tracking-[0.12em] text-(--color-bg) transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : "Start Generation"}
                    </Button>

                    <p className="text-xs text-(--color-text-secondary)">Example: https://github.com/pypa/sampleproject</p>
                </form>

                <div className="grid grid-cols-2 gap-3 text-xs text-(--color-text-secondary) sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Realtime execution logs</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Progressive chapter output</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:col-span-1 col-span-2">Optimized for large repositories</div>
                </div>
            </CardContent>
        </Card>
    )
}
