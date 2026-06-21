import Link from "next/link"
import { Zap, Github } from "lucide-react"

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.07] px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30">
                <Zap className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              <span className="font-display font-semibold text-white text-sm">Code Narrator</span>
            </div>
            <p className="text-xs leading-5 text-[var(--color-text-secondary)] max-w-[200px]">
              Transform any GitHub repository into structured documentation and AI-narrated video tutorials.
            </p>
          </div>

          {/* Nav */}
          <div>
            <div className="mb-3 text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">Navigate</div>
            <ul className="space-y-2">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Features", href: "#features" },
                { label: "Demo", href: "#demo" },
                { label: "Open App", href: "/app" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <div className="mb-3 text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">Project</div>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.07] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
          <span>© {new Date().getFullYear()} Code Narrator. Built with Next.js, Python, and AI.</span>
          <span className="flex items-center gap-1">
            Powered by <span className="text-[var(--color-accent)] ml-1">PocketFlow</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
