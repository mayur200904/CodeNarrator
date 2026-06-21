"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"

const STATS = [
  { value: 5, suffix: " min", label: "Average generation time", prefix: "~" },
  { value: 10, suffix: "+", label: "Supported file types", prefix: "" },
  { value: 4, suffix: "", label: "Segment types in video", prefix: "" },
  { value: 100, suffix: "%", label: "Automated — no manual steps", prefix: "" },
]

function Counter({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1400
    const step = 16
    const increment = value / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [inView, value])

  return (
    <span ref={ref} className="font-mono text-5xl font-bold text-white sm:text-6xl">
      {prefix}{count}{suffix}
    </span>
  )
}

export function StatsSection() {
  return (
    <section className="relative py-24 px-6 lg:px-8">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-[600px] rounded-full bg-[var(--color-accent)]/[0.04] blur-[80px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">By the numbers</div>
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">Built for speed</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.07]">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex flex-col items-center py-10 px-6 text-center"
            >
              <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              <p className="mt-3 text-sm text-[var(--color-text-secondary)] max-w-[140px] leading-5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
