function key(projectName: string) {
  return `cn_read_${projectName}`
}

function isBrowser() {
  return typeof window !== "undefined"
}

export function getReadChapters(projectName: string): Set<string> {
  if (!isBrowser()) return new Set()
  try {
    const raw = JSON.parse(localStorage.getItem(key(projectName)) ?? "[]")
    return new Set(raw)
  } catch {
    return new Set()
  }
}

export function markChapterRead(projectName: string, filename: string) {
  if (!isBrowser()) return
  const existing = getReadChapters(projectName)
  existing.add(filename)
  localStorage.setItem(key(projectName), JSON.stringify([...existing]))
}

export function getPrefs(): { voice: string; style: string; language: string } {
  if (!isBrowser()) return { voice: "en-US-AriaNeural", style: "dark", language: "english" }
  try {
    return {
      voice: localStorage.getItem("cn_voice_pref") ?? "en-US-AriaNeural",
      style: localStorage.getItem("cn_style_pref") ?? "dark",
      language: localStorage.getItem("cn_lang_pref") ?? "english",
    }
  } catch {
    return { voice: "en-US-AriaNeural", style: "dark", language: "english" }
  }
}

export function savePrefs(prefs: Partial<{ voice: string; style: string; language: string }>) {
  if (!isBrowser()) return
  if (prefs.voice)    localStorage.setItem("cn_voice_pref", prefs.voice)
  if (prefs.style)    localStorage.setItem("cn_style_pref", prefs.style)
  if (prefs.language) localStorage.setItem("cn_lang_pref",  prefs.language)
}
