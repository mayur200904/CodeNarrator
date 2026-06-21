export interface ProjectHistoryEntry {
  projectName: string
  repoUrl: string
  date: string
  jobId: string
}

const KEY = "cn_history"
const MAX = 20

function isBrowser() {
  return typeof window !== "undefined"
}

export function getHistory(): ProjectHistoryEntry[] {
  if (!isBrowser()) return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

export function addToHistory(entry: ProjectHistoryEntry) {
  if (!isBrowser()) return
  const prev = getHistory().filter((e) => e.projectName !== entry.projectName)
  const next = [entry, ...prev].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function clearHistory() {
  if (!isBrowser()) return
  localStorage.removeItem(KEY)
}
