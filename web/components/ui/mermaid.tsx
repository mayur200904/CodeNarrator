"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

// ── One-time initialisation guard (module level, client only) ──
let _ready = false
function ensureInit() {
  if (_ready) return
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    suppressErrorRendering: true,
    fontFamily: "system-ui, sans-serif",
  })
  _ready = true
}

// ── Sanitiser ─────────────────────────────────────────────────
// Mermaid v11 strict parser rejects unquoted special chars in:
//   - node labels  [] {}
//   - subgraph names
// Characters that cause failures: / : < > & \ (
function sanitizeMermaid(raw: string): string {
  // 1. Replace <br> tags
  let t = raw.replace(/<br\s*\/?>/gi, " ")

  // 2. Collapse literal newlines inside already-quoted strings
  t = t.replace(/"([^"]*)"/g, (_m, inner) =>
    `"${inner.replace(/\n/g, " ").trim()}"`
  )

  // 3. Trim trailing whitespace per line
  t = t.split("\n").map((l) => l.trimEnd()).join("\n")

  const UNSAFE = /[\/:<>&\\(]/

  // 4. Fix subgraph names  (e.g. "subgraph App Router (app/ directory)")
  t = t.replace(/^(\s*subgraph\s+)(.+)$/gm, (_m, prefix, name) => {
    name = name.trim()
    if (name.startsWith('"')) return _m           // already quoted
    if (UNSAFE.test(name)) {
      return prefix.trimEnd() + ' "' + name.replace(/"/g, "'") + '"'
    }
    return _m
  })

  // 5. Quote node labels inside [] and {} that contain unsafe chars
  function quoteLabels(src: string, open: string, close: string): string {
    let out = ""
    let i = 0
    while (i < src.length) {
      const ch = src[i]
      // Only process when opener follows a word char (node ID character)
      if (ch === open && i > 0 && /\w/.test(src[i - 1])) {
        let depth = 1
        let j = i + 1
        while (j < src.length && depth > 0) {
          if (src[j] === open)  depth++
          if (src[j] === close) depth--
          j++
        }
        const label = src.slice(i + 1, j - 1)

        if (label.startsWith('"') && label.endsWith('"')) {
          out += src.slice(i, j)                  // already quoted, leave as-is
        } else if (UNSAFE.test(label)) {
          // Remove {} [] (unsafe even inside quotes); keep () which are fine
          const flat = label.replace(/[{}\[\]]/g, "").replace(/"/g, "'").trim()
          out += open + '"' + flat + '"' + close
        } else {
          out += src.slice(i, j)
        }
        i = j
        continue
      }
      out += ch
      i++
    }
    return out
  }

  t = quoteLabels(t, "{", "}")
  t = quoteLabels(t, "[", "]")
  return t
}

// ── Component ─────────────────────────────────────────────────
export function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg]       = useState("")
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle")
  const mounted             = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!chart?.trim()) return

    setSvg("")
    setStatus("idle")

    // Always call inside effect so it definitely runs client-side
    ensureInit()

    const sanitized = sanitizeMermaid(chart)

    // Use a random id each call — avoids any cross-render id collision
    const id = `mmd_${Math.random().toString(36).slice(2)}`

    const render = async () => {
      // Try sanitised first, then raw (in case sanitiser introduced an error)
      const attempts = [sanitized]
      if (sanitized !== chart.trim()) attempts.push(chart.trim())

      for (const src of attempts) {
        try {
          // parse() returns false (not throws) when suppressErrors: true
          const parsed = await mermaid.parse(src, { suppressErrors: true })
          if (parsed === false) continue

          const { svg: out } = await mermaid.render(id, src)
          // clean up temp element mermaid may have left
          document.getElementById(id)?.remove()

          if (!mounted.current) return
          setSvg(out)
          setStatus("ok")
          return
        } catch (err) {
          document.getElementById(id)?.remove()
          console.warn("[Mermaid] render error:", err)
        }
      }

      if (mounted.current) setStatus("error")
    }

    render()
  }, [chart])

  if (status === "idle") {
    return (
      <div className="my-6 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/30 py-10">
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Rendering diagram…
        </span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="my-4 rounded-lg border border-zinc-700/40 bg-zinc-900/40 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Diagram — raw source
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-400 leading-5">
          {chart}
        </pre>
      </div>
    )
  }

  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex justify-center">
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      />
    </div>
  )
}
