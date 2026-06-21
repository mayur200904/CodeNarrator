"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Play, GitBranch, FileText, Video } from "lucide-react"

const WORDS = ["Any GitHub Repo.", "Full Video Tutorial.", "In Minutes."]

function TypewriterHeadline() {
  return (
    <div className="space-y-1">
      {WORDS.map((word, wi) => (
        <motion.div
          key={word}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1 + wi * 0.15, ease: [0.16, 1, 0.3, 1] }}
          className={wi === 1 ? "text-gradient-accent" : "text-white"}
        >
          {word}
        </motion.div>
      ))}
    </div>
  )
}

function BrowserMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ animation: "float-slow 8s ease-in-out infinite", animationDelay: "1s" }}
      className="relative w-full max-w-xl"
    >
      {/* Glow behind */}
      <div className="absolute -inset-4 rounded-3xl bg-[var(--color-accent)]/8 blur-2xl" />

      {/* Browser frame */}
      <div className="relative rounded-2xl border border-white/[0.12] bg-[#0d1117] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] bg-[#161b22] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 rounded-md bg-[#0d1117] border border-white/10 px-3 py-1 text-xs text-[var(--color-text-secondary)] font-mono">
            localhost:3000/tutorial/my-project
          </div>
        </div>

        {/* App mockup content */}
        <div className="flex h-72 overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 shrink-0 border-r border-white/[0.07] bg-black/30 p-3 space-y-1">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">Documentation</div>
            <div className="rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 px-2.5 py-2 text-xs text-[var(--color-accent)] flex items-center gap-2">
              <FileText className="h-3 w-3 shrink-0" /> index
            </div>
            {["01 frontend ui", "02 backend api", "03 pipeline", "04 crawler"].map((item) => (
              <div key={item} className="px-2.5 py-2 text-xs text-zinc-500 flex items-center gap-2 hover:text-zinc-300">
                <FileText className="h-3 w-3 shrink-0 opacity-50" /> {item}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-5 overflow-hidden">
            <div className="mb-3 h-3 w-32 rounded-full bg-white/10" />
            <div className="mb-2 h-2 w-full rounded-full bg-white/[0.06]" />
            <div className="mb-2 h-2 w-5/6 rounded-full bg-white/[0.06]" />
            <div className="mb-4 h-2 w-4/6 rounded-full bg-white/[0.06]" />

            {/* Mini diagram */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0a0f1a] p-3 mb-3">
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
                <div className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[var(--color-accent)]">Repo</div>
                <span>→</span>
                <div className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-300">LLM</div>
                <span>→</span>
                <div className="rounded border border-pink-500/30 bg-pink-500/10 px-2 py-1 text-pink-300">Docs</div>
                <span>→</span>
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">Video</div>
              </div>
            </div>

            <div className="mb-2 h-2 w-full rounded-full bg-white/[0.06]" />
            <div className="h-2 w-3/4 rounded-full bg-white/[0.06]" />

            {/* Video player hint */}
            <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/50 p-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20">
                <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" />
              </div>
              <div className="text-[10px] text-zinc-400">Tutorial Video · 2:48</div>
              <div className="ml-auto h-1.5 flex-1 max-w-[80px] rounded-full bg-white/10">
                <div className="h-full w-2/5 rounded-full bg-emerald-500/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0d1117]/90 px-3 py-2 backdrop-blur shadow-xl"
      >
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-zinc-300 font-medium">Video generated · 4m 32s</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="absolute -top-3 -right-3 flex items-center gap-2 rounded-xl border border-[var(--color-accent)]/20 bg-[#0d1117]/90 px-3 py-2 backdrop-blur shadow-xl"
      >
        <GitBranch className="h-3 w-3 text-[var(--color-accent)]" />
        <span className="text-xs text-[var(--color-accent)] font-medium">12 chapters mapped</span>
      </motion.div>
    </motion.div>
  )
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-[var(--color-accent)]/[0.07] blur-[100px]" />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-[var(--color-accent-warm)]/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 bg-purple-600/[0.05] blur-[100px]" />
        <div className="landing-grid-bg absolute inset-0 opacity-60" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              AI-Powered Code Intelligence
            </motion.div>

            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl mb-8">
              <TypewriterHeadline />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-lg leading-8 text-[var(--color-text-secondary)] max-w-lg mb-10"
            >
              Code Narrator reads your codebase, maps every abstraction, writes structured documentation,
              narrates it with AI voice, and exports an animated video tutorial — automatically.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                href="/app"
                className="shimmer-btn relative flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-sm font-bold text-[#05050a] hover:brightness-110 transition-all overflow-hidden shadow-[0_0_30px_rgba(43,233,255,0.25)]"
              >
                Generate Tutorial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                <Play className="h-4 w-4 text-[var(--color-accent)]" />
                See How It Works
              </a>
            </motion.div>

            {/* Micro-stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="mt-12 flex items-center gap-6 text-sm text-[var(--color-text-secondary)]"
            >
              {[
                { val: "~5 min", label: "to full tutorial" },
                { val: "Any repo", label: "public GitHub" },
                { val: "100%", label: "automated" },
              ].map(({ val, label }) => (
                <div key={val} className="flex flex-col">
                  <span className="font-mono text-base font-bold text-white">{val}</span>
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — mockup */}
          <div className="flex justify-center lg:justify-end">
            <BrowserMockup />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05050a] to-transparent" />
    </section>
  )
}
