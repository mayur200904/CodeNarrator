"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"

const EXAMPLES = [
  "facebook/react",
  "vercel/next.js",
  "django/django",
]

export function CtaSection() {
  const [url, setUrl] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    const full = trimmed.startsWith("http") ? trimmed : `https://github.com/${trimmed}`
    router.push(`/app?url=${encodeURIComponent(full)}`)
  }

  const handleExample = (repo: string) => {
    setUrl(`https://github.com/${repo}`)
  }

  return (
    <section id="demo" className="relative py-28 px-6 lg:px-8 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-[var(--color-accent)]/[0.06] blur-[120px]" />
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-[var(--color-accent-warm)]/[0.05] blur-[80px]" />
        <div className="landing-grid-bg absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]"
        >
          Try it now
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl mb-6 leading-tight"
        >
          Your next codebase video is one URL away
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-[var(--color-text-secondary)] text-lg mb-10 max-w-xl mx-auto"
        >
          Paste any public GitHub repository below and click generate. No account required.
        </motion.p>

        {/* URL input */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="glow-border relative flex items-center rounded-2xl border border-white/[0.12] bg-[#0d1117] p-2 transition-all duration-300"
          style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
        >
          <div className="flex items-center gap-2 pl-3 shrink-0 text-[var(--color-text-secondary)]">
            <Github className="h-4 w-4" />
            <span className="text-sm font-mono hidden sm:block">github.com/</span>
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="username/repository"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/25 font-mono outline-none"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="shimmer-btn relative shrink-0 flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[#05050a] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
          >
            Generate
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.form>

        {/* Example chips */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-xs text-[var(--color-text-secondary)]">Try an example:</span>
          {EXAMPLES.map((repo) => (
            <button
              key={repo}
              onClick={() => handleExample(repo)}
              className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-mono text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
            >
              {repo}
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
