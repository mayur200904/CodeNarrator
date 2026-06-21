"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Zap, ArrowLeft } from "lucide-react"
import { RepoForm } from "@/components/features/repo-form"
import { StatusTracker } from "@/components/features/status-tracker"
import { ProjectHistory } from "@/components/features/project-history"

function AppContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [jobId,   setJobId]   = useState<string | null>(searchParams.get("job"))
  const [repoUrl, setRepoUrl] = useState<string>(searchParams.get("url") ?? "")
  // If page loads with ?job= already in URL (e.g. after refresh), keep tracking it
  useEffect(() => {
    const j = searchParams.get("job")
    const u = searchParams.get("url")
    if (j && !jobId) setJobId(j)
    if (u && !repoUrl) setRepoUrl(u)
  }, [searchParams]) // eslint-disable-line

  const handleJobStarted = (id: string, url: string) => {
    setJobId(id)
    setRepoUrl(url)
    router.replace(`/app?job=${id}`, { scroll: false })
  }

  const handleReset = () => {
    setJobId(null)
    setRepoUrl("")
    router.replace("/app", { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#05050a]">
      {/* Top nav */}
      <header className="border-b border-white/[0.07] bg-[#05050a]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-white transition-colors text-sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30">
                <Zap className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              </div>
              <span className="text-sm font-semibold text-white">Code Narrator</span>
            </div>
          </div>
          {jobId && (
            <button
              onClick={handleReset}
              className="text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors border border-white/[0.1] rounded-lg px-3 py-1.5"
            >
              + New Project
            </button>
          )}
        </div>
      </header>

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[var(--color-accent)]/[0.06] blur-[100px]" />
        <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-[var(--color-accent-warm)]/[0.05] blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {!jobId ? (
          /* ── Form view ── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid gap-8 lg:grid-cols-5"
          >
            {/* Left: form */}
            <div className="lg:col-span-3 space-y-4">
              <div className="mb-6">
                <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  Generate a Tutorial
                </h1>
                <p className="mt-2 text-[var(--color-text-secondary)] text-sm leading-6">
                  Paste a public GitHub URL. The pipeline fetches code, identifies abstractions,
                  writes structured documentation, and assembles an AI-narrated video.
                </p>
              </div>
              <RepoForm onJobStarted={handleJobStarted} defaultUrl={repoUrl} />
            </div>

            {/* Right: history */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
                Recent Projects
              </p>
              <ProjectHistory />
            </div>
          </motion.div>
        ) : (
          /* ── StatusTracker view ── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl"
          >
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Pipeline Running</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)] font-mono truncate">{repoUrl}</p>
            </div>
            <StatusTracker
              jobId={jobId}
              repoUrl={repoUrl}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default function AppPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    }>
      <AppContent />
    </Suspense>
  )
}
