"use client"

import { useState } from "react"
import { RepoForm } from "@/components/features/repo-form"
import { StatusTracker } from "@/components/features/status-tracker"

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState<string>("")

  const handleJobStarted = (jobId: string, url: string) => {
    setCurrentJobId(jobId)
    setRepoUrl(url)
  }

  const handleReset = () => {
    setCurrentJobId(null)
    setRepoUrl("")
  }

  return (
    <main className="page-shell relative min-h-screen overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -left-16 top-14 h-44 w-44 rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-1/4 h-56 w-56 rounded-full bg-[var(--color-accent-warm)]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8">
        {!currentJobId ? (
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <header className="glass-panel rise-in relative col-span-12 overflow-hidden rounded-3xl p-7 sm:p-9 lg:col-span-7 lg:min-h-[520px]">
              <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                Architecture Storytelling Engine
              </div>
              <h1 className="font-display text-4xl leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                Code Narrator
                <span className="block text-[var(--color-accent)]">From repo chaos to cinematic clarity.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                Generate chapter-wise technical breakdowns, architecture maps, and voice-ready walkthroughs from any GitHub repository.
                Watch real generation logs while the engine builds your output artifacts in real time.
              </p>

              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="stagger-in rounded-2xl border border-white/15 bg-white/5 p-3" style={{ "--stagger-delay": "80ms" } as React.CSSProperties}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Pipeline</p>
                  <p className="mt-1 text-base font-semibold text-white">Map/Reduce</p>
                </div>
                <div className="stagger-in rounded-2xl border border-white/15 bg-white/5 p-3" style={{ "--stagger-delay": "140ms" } as React.CSSProperties}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Logs</p>
                  <p className="mt-1 text-base font-semibold text-white">Realtime</p>
                </div>
                <div className="stagger-in rounded-2xl border border-white/15 bg-white/5 p-3" style={{ "--stagger-delay": "200ms" } as React.CSSProperties}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Output</p>
                  <p className="mt-1 text-base font-semibold text-white">Chapter-first</p>
                </div>
              </div>

              <div className="pointer-events-none absolute -bottom-10 right-8 h-40 w-40 rotate-12 rounded-[2.5rem] border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/8 pulse-accent" />
            </header>

            <aside className="stagger-in col-span-12 self-start lg:col-span-5" style={{ "--stagger-delay": "220ms" } as React.CSSProperties}>
              <RepoForm onJobStarted={handleJobStarted} />
            </aside>
          </div>
        ) : (
          <div className="rise-in">
            <StatusTracker jobId={currentJobId} repoUrl={repoUrl} onReset={handleReset} />
          </div>
        )}
      </section>
    </main>
  )
}
