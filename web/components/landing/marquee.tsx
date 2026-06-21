const REPOS_1 = [
  "facebook/react", "vercel/next.js", "django/django", "torvalds/linux",
  "microsoft/vscode", "openai/openai-python", "nodejs/node", "golang/go",
  "flutter/flutter", "kubernetes/kubernetes",
]
const REPOS_2 = [
  "tensorflow/tensorflow", "pytorch/pytorch", "rails/rails", "laravel/laravel",
  "rust-lang/rust", "denoland/deno", "sveltejs/svelte", "vuejs/vue",
  "nestjs/nest", "prisma/prisma",
]

function Track({ repos, reverse }: { repos: string[]; reverse?: boolean }) {
  const doubled = [...repos, ...repos]
  return (
    <div className="overflow-hidden">
      <div className={`flex gap-4 py-2 ${reverse ? "marquee-track-reverse" : "marquee-track"}`}>
        {doubled.map((repo, i) => (
          <div
            key={`${repo}-${i}`}
            className="shrink-0 flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-text-secondary)] font-mono"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-[var(--color-text-secondary)] opacity-70">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {repo}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarqueeSection() {
  return (
    <section className="relative py-14 overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#05050a] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#05050a] to-transparent" />

      <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
        Works with any public GitHub repository
      </div>

      <div className="space-y-3">
        <Track repos={REPOS_1} />
        <Track repos={REPOS_2} reverse />
      </div>
    </section>
  )
}
