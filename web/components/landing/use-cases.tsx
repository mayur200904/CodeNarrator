"use client"

import { motion } from "framer-motion"
import { Users, Code2, GraduationCap, ArrowRight } from "lucide-react"
import Link from "next/link"

const CASES = [
  {
    icon: Users,
    tag: "Onboarding",
    title: "Joining a new team?",
    body: "Instead of spending weeks reading unfamiliar code, generate a full walkthrough video in minutes. Understand every layer of the stack before your first standup.",
    cta: "Try it now",
    color: "var(--color-accent)",
  },
  {
    icon: Code2,
    tag: "Open Source",
    title: "Maintaining an open source project?",
    body: "Auto-generate contributor documentation and a narrated video tour for every release. Help new contributors get productive instantly.",
    cta: "See an example",
    color: "#a78bfa",
  },
  {
    icon: GraduationCap,
    tag: "Education",
    title: "Teaching a course?",
    body: "Turn any codebase into a structured, narrated video course. Each abstraction becomes a chapter. Architecture diagrams are generated automatically.",
    cta: "Start generating",
    color: "var(--color-accent-warm)",
  },
]

export function UseCasesSection() {
  return (
    <section className="relative py-28 px-6 lg:px-8">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]"
          >
            Use Cases
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold text-white sm:text-5xl"
          >
            Who uses Code Narrator
          </motion.h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {CASES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group relative rounded-2xl border border-white/[0.09] bg-[#0d1117] p-7 flex flex-col overflow-hidden"
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${c.color}80, transparent)` }}
              />

              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg border"
                  style={{ borderColor: `${c.color}30`, backgroundColor: `${c.color}12` }}
                >
                  <c.icon className="h-4.5 w-4.5" style={{ color: c.color }} />
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium border"
                  style={{ color: c.color, borderColor: `${c.color}30`, backgroundColor: `${c.color}10` }}
                >
                  {c.tag}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-3">{c.title}</h3>
              <p className="text-sm leading-6 text-[var(--color-text-secondary)] flex-1">{c.body}</p>

              <Link
                href="/app"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: c.color }}
              >
                {c.cta}
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
