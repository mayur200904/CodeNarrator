"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useRef } from "react"
import type { JobLogEntry } from "@/lib/api"

interface TerminalLogsProps {
    status: string
    logs: JobLogEntry[]
}

export function TerminalLogs({ status, logs }: TerminalLogsProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight
            }
        }
    }, [logs])

    const displayLogs = logs.length
        ? logs
        : [{ timestamp: "", message: "Job initialized. Waiting for backend logs..." }]

    return (
        <section aria-label="Execution logs" className="flex h-60 w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#090d12] font-mono text-xs text-emerald-200 shadow-inner shadow-black/60">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <div aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-(--color-text-secondary)">Execution Logs</span>
            </div>
            <ScrollArea className="flex-1 px-3 py-2" viewportRef={scrollRef}>
                <div className="space-y-1.5 leading-5" role="log" aria-live="polite" aria-relevant="additions text">
                    {displayLogs.map((log, i) => (
                        <div key={`${log.timestamp}-${i}`} className="text-[11px] text-emerald-200/90">{`> ${log.message}`}</div>
                    ))}
                    {status === "processing" && (
                        <div className="animate-pulse text-emerald-300/70">_</div>
                    )}
                </div>
            </ScrollArea>
        </section>
    )
}
