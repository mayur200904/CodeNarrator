"use client"

import { motion } from "framer-motion"
import { BrainCircuit, Mic2, GitBranch, Video, Globe, Zap } from "lucide-react"

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "LLM-Powered Analysis",
    description:
      "Uses a map-reduce pipeline to identify abstractions, their relationships, and the optimal teaching order — just like a senior engineer would explain the codebase.",
    large: true,
    accent: "var(--color-accent)",
  },
  {
    icon: Video,
    title: "Animated Video Output",
    description:
      "Every tutorial ships as an MP4 — animated slides, code windows with syntax highlighting, Mermaid architecture diagrams, and a cinematic intro and outro.",
    large: true,
    accent: "var(--color-accent-warm)",
  },
  {
    icon: Mic2,
    title: "AI Voice Narration",
    description: "Natural-sounding TTS voices narrate every segment. Choose from multiple voice styles.",
    large: false,
    accent: "var(--color-accent)",
  },
  {
    icon: GitBranch,
    title: "Any GitHub Repo",
    description: "Paste any public GitHub URL. Supports all major languages and mono-repos.",
    large: false,
    accent: "#a78bfa",
  },
  {
    icon: Globe,
    title: "Multi-Language Docs",
    description: "Generate documentation in English and other languages from the same codebase.",
    large: false,
    accent: "var(--color-accent-warm)",
  },
  {
    icon: Zap,
    title: "Real-Time Progress",
    description: "Watch chapters appear as they complete. Streaming logs show every pipeline step.",
    large: false,
    accent: "#fbbf24",
  },
]

function FeatureTile({ feat, index }: { feat: (typeof FEATURES)[0]; index: number }) {
  const Icon = feat.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`group relative rounded-2xl border border-white/[0.09] bg-[#0d1117] p-6 overflow-hidden transition-shadow hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
        feat.large ? "lg:col-span-2" : ""
      }`}
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(400px circle at 50% 0%, ${feat.accent}0f, transparent 70%)`,
        }}
      />
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${feat.accent}60, transparent)` }}
      />

      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border"
        style={{
          borderColor: `${feat.accent}30`,
          backgroundColor: `${feat.accent}12`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color: feat.accent }} />
      </div>

      <h3 className="mb-2 font-semibold text-white text-lg">{feat.title}</h3>
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{feat.description}</p>
    </motion.div>
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 px-6 lg:px-8">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]"
          >
            Capabilities
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold text-white sm:text-5xl"
          >
            Everything built in
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-[var(--color-text-secondary)] max-w-lg mx-auto"
          >
            No integrations. No config files. Everything you need ships in one pipeline.
          </motion.p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feat, i) => (
            <FeatureTile key={feat.title} feat={feat} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
