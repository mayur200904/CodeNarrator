"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Link2, BrainCircuit, BookOpen, Film } from "lucide-react"

const STEPS = [
  {
    number: "01",
    icon: Link2,
    title: "Paste a GitHub URL",
    description:
      "Drop in any public GitHub repository URL. Code Narrator instantly clones and indexes every file — filtering by type, size, and relevance.",
    detail: "Supports Python, TypeScript, JavaScript, Go, Rust, Java, and more.",
    visual: (
      <div className="rounded-2xl border border-white/[0.09] bg-[#0d1117] p-6 font-mono text-sm">
        <div className="mb-3 text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">Repository URL</div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-4 py-3">
          <span className="text-[var(--color-text-secondary)]">https://github.com/</span>
          <span className="text-[var(--color-accent)]">your-org/your-repo</span>
          <span className="ml-auto h-4 w-0.5 bg-[var(--color-accent)] animate-pulse" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          {["*.py", "*.ts", "*.go", "*.rs", "*.js", "*.java"].map((ext) => (
            <div key={ext} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5 text-center text-[var(--color-text-secondary)]">
              {ext}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "02",
    icon: BrainCircuit,
    title: "AI Maps Your Codebase",
    description:
      "An LLM reads your code and identifies key abstractions, their relationships, and the optimal learning order — like having a senior engineer explain the architecture.",
    detail: "Uses map-reduce pipeline for scalability across large repositories.",
    visual: (
      <div className="rounded-2xl border border-white/[0.09] bg-[#0d1117] p-6">
        <div className="mb-4 text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">Abstraction Graph</div>
        <div className="relative space-y-2">
          {[
            { label: "Frontend UI", color: "bg-[var(--color-accent)]", w: "w-full", delay: "0s" },
            { label: "Backend API", color: "bg-purple-400", w: "w-10/12", delay: "0.2s" },
            { label: "Pipeline Engine", color: "bg-[var(--color-accent-warm)]", w: "w-9/12", delay: "0.4s" },
            { label: "LLM Nodes", color: "bg-emerald-400", w: "w-8/12", delay: "0.6s" },
            { label: "File Crawler", color: "bg-amber-400", w: "w-6/12", delay: "0.8s" },
          ].map(({ label, color, w, delay }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <div className={`h-1.5 ${w} rounded-full ${color} opacity-70`} style={{ animationDelay: delay }} />
              <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "03",
    icon: BookOpen,
    title: "Docs Written For You",
    description:
      "Each abstraction becomes a richly structured chapter — with explanations, Mermaid architecture diagrams, and code examples. Output is Markdown, ready to deploy.",
    detail: "Multi-language support. Diagrams auto-generated from real code structure.",
    visual: (
      <div className="rounded-2xl border border-white/[0.09] bg-[#0d1117] p-5 text-sm">
        <div className="mb-2 text-[var(--color-accent)] font-semibold text-base">Chapter 2: Backend API</div>
        <div className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
          <div className="h-2 w-full rounded-full bg-white/[0.06]" />
          <div className="h-2 w-5/6 rounded-full bg-white/[0.06]" />
          <div className="h-2 w-4/5 rounded-full bg-white/[0.06]" />
        </div>
        <div className="mt-3 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-[var(--color-accent)]">Architecture</div>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)]">
            <span className="rounded border border-[var(--color-accent)]/30 px-1.5 py-0.5 text-[var(--color-accent)]">Client</span>
            <span>→</span>
            <span className="rounded border border-purple-400/30 px-1.5 py-0.5 text-purple-300">FastAPI</span>
            <span>→</span>
            <span className="rounded border border-emerald-400/30 px-1.5 py-0.5 text-emerald-300">Pipeline</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    icon: Film,
    title: "Video Tutorial Ready",
    description:
      "Animated slides, syntax-highlighted code blocks, Mermaid diagrams, and AI-narrated voiceover are assembled into a professional MP4 — intro, chapters, and outro included.",
    detail: "Powered by Playwright + MoviePy. Ambient background music included.",
    visual: (
      <div className="rounded-2xl border border-white/[0.09] bg-[#0d1117] overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#1a1f35] to-[#0d1117] h-36 flex items-center justify-center">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "linear-gradient(rgba(43,233,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(43,233,255,0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />
          <div className="relative text-center">
            <div className="text-2xl font-display font-bold text-white mb-1">Code Narrator</div>
            <div className="text-xs text-[var(--color-accent)] uppercase tracking-widest">AI-Generated Tutorial</div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 h-0.5 bg-white/10 rounded-full">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-400" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.07]">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready to watch
          </div>
          <div className="ml-auto text-xs text-[var(--color-text-secondary)] font-mono">2:48</div>
        </div>
      </div>
    ),
  },
]

function Step({ step, index }: { step: (typeof STEPS)[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-100px" })
  const isEven = index % 2 === 0

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      {/* Text side */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -30 : 30 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={isEven ? "order-1" : "order-1 lg:order-2"}
      >
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-5xl font-bold text-white/[0.06]">{step.number}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10">
            <step.icon className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
        </div>
        <h3 className="font-display text-3xl font-bold text-white mb-4">{step.title}</h3>
        <p className="text-[var(--color-text-secondary)] leading-7 text-base mb-4">{step.description}</p>
        <p className="text-sm text-[var(--color-text-secondary)]/70 border-l-2 border-[var(--color-accent)]/30 pl-4">{step.detail}</p>
      </motion.div>

      {/* Visual side */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? 30 : -30 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className={isEven ? "order-2" : "order-2 lg:order-1"}
      >
        {step.visual}
      </motion.div>
    </div>
  )
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-28 px-6 lg:px-8">
      {/* Divider top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]"
          >
            The Process
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl font-bold text-white sm:text-5xl"
          >
            From repo to video in four steps
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-[var(--color-text-secondary)] max-w-xl mx-auto leading-7"
          >
            No configuration. No templates. Just paste a URL and watch the pipeline run.
          </motion.p>
        </div>

        <div className="space-y-28">
          {STEPS.map((step, i) => (
            <Step key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
