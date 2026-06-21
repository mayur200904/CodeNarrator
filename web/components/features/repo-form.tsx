"use client"

import { useEffect, useState } from "react"
import { generateText } from "@/lib/api"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

const EXAMPLES = ["facebook/react", "vercel/next.js", "django/django"]

const LANGUAGES = [
  "english", "hindi", "spanish", "french", "german", "chinese", "japanese",
]

function isValidGithubUrl(url: string): boolean | null {
  if (!url.trim()) return null
  return /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/.*)?$/.test(url.trim())
}

interface RepoFormProps {
  onJobStarted: (jobId: string, repoUrl: string) => void
  defaultUrl?: string
}

export function RepoForm({ onJobStarted, defaultUrl }: RepoFormProps) {
  const [url, setUrl]         = useState(defaultUrl ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [language, setLanguage] = useState("english")

  useEffect(() => { if (defaultUrl) setUrl(defaultUrl) }, [defaultUrl])

  const urlValid = isValidGithubUrl(url)

  const handleExample = (repo: string) => {
    setUrl(`https://github.com/${repo}`)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError("")
    const finalUrl = url.trim().startsWith("http")
      ? url.trim()
      : `https://github.com/${url.trim()}`
    try {
      const data = await generateText(finalUrl, false, language)
      onJobStarted(data.job_id, finalUrl)
    } catch {
      setError("Failed to start. Make sure the backend is running on port 8000.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.08] px-6 py-4">
        <h2 className="font-display text-xl font-bold text-white">Generate Tutorial</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Paste any public GitHub repository URL to begin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* URL input */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Repository URL
          </label>
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError("") }}
              placeholder="https://github.com/username/repo"
              spellCheck={false}
              className={`w-full rounded-xl border bg-black/40 px-4 py-3 pr-10 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 font-mono
                ${urlValid === true
                  ? "border-emerald-500/60 ring-1 ring-emerald-500/30"
                  : urlValid === false
                  ? "border-red-500/50 ring-1 ring-red-500/20"
                  : "border-white/[0.12] focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20"
                }`}
            />
            {urlValid === true  && <CheckCircle2 className="absolute right-3 top-3.5 h-4 w-4 text-emerald-400" />}
            {urlValid === false && <AlertCircle  className="absolute right-3 top-3.5 h-4 w-4 text-red-400" />}
          </div>
          {urlValid === false && (
            <p className="text-xs text-red-400">Enter a valid GitHub URL</p>
          )}
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-[var(--color-text-secondary)]">Try:</span>
          {EXAMPLES.map((repo) => (
            <button
              key={repo} type="button"
              onClick={() => handleExample(repo)}
              className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-mono text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
            >
              {repo}
            </button>
          ))}
        </div>

        {/* Language selector */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-[#0d1117] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-accent)]/50 transition-colors capitalize"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="capitalize">
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-400/20 bg-red-950/30 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-bold uppercase tracking-widest text-[#05050a] transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting…
            </span>
          ) : "Generate Tutorial →"}
        </button>
      </form>
    </div>
  )
}
