<div align="center">

# Code Narrator

### Turn any GitHub repository into an AI-narrated video tutorial — automatically.

[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Code Narrator Banner](assets/banner.png)

</div>

---

## What is Code Narrator?

Code Narrator is an end-to-end AI pipeline that reads a GitHub repository, understands its architecture, writes structured documentation, and produces a fully animated, AI-narrated video tutorial — all from a single URL paste.

No templates. No manual writing. Just paste a repo URL and get:
- **Chapter-by-chapter markdown documentation** with architecture diagrams
- **An animated MP4 video** with voice narration, syntax-highlighted code, Mermaid diagrams, intro/outro, and background music
- **A beautiful web viewer** to read the docs and watch the video

---

## Demo

| Landing Page | Tutorial Viewer | Generated Video |
|---|---|---|
| Animated hero, how-it-works, feature bento | Sidebar with search, TOC, reading progress | Playwright-rendered animated slides |

---

## Features

### AI Pipeline
- **Map-Reduce analysis** — Identifies abstractions, relationships, and chapter order from any codebase
- **Multi-LLM support** — Google Gemini with OpenRouter fallback
- **Chapter-first output** — Chapters appear as they complete, no waiting for the full run
- **Multi-language docs** — Generate documentation in English, Hindi, Spanish, French, and more

### Video Generation
- **Animated HTML slides** rendered by Playwright/Chromium (not static images)
- **3 segment types** — Rich slide cards, syntax-highlighted terminal code windows, Mermaid architecture diagrams
- **AI voice narration** — 3 voice options (Aria, Guy, Jenny) via edge-tts
- **Cinematic structure** — Intro card, section transitions, outro, progress bar, subtitle overlay
- **Ambient background music** — Synthesized Cmaj7 pad mixed under narration
- **3 visual themes** — Dark, Light, Cyberpunk

### Frontend
- **Landing page** — Animated hero, marquee, how-it-works, feature bento, stats counter, live URL CTA
- **Generation page** — URL input with validation, language selector, project history (localStorage)
- **Live pipeline tracker** — 5-stage visual progress, real-time chapter cards, elapsed timer
- **Tutorial viewer** — Chapter search (`/` shortcut), reading progress ring, auto TOC, keyboard nav (`J`/`K`), share + download
- **Video player** — Playback speed control, brightness/contrast/saturation adjustment, mini-player mode

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Shadcn UI |
| **Backend** | FastAPI, Python 3.9+, Background Tasks |
| **AI / LLM** | Google Gemini, PocketFlow (Map-Reduce pipeline) |
| **Video** | Playwright (frame rendering), MoviePy (assembly), edge-tts (narration), numpy (music synthesis) |
| **Diagrams** | Mermaid.js (browser-rendered in docs + video) |

---

## Project Structure

```
CodeNarrator/
├── server/
│   └── app.py              # FastAPI backend — job management, API endpoints
├── nodes.py                # Text generation pipeline nodes
├── nodes_video.py          # Video generation pipeline (Playwright + MoviePy)
├── flow.py                 # PocketFlow pipeline orchestration
├── core/
│   └── pipeline.py         # Pipeline runner
├── utils/
│   ├── call_llm.py         # LLM abstraction (Gemini + OpenRouter)
│   ├── crawl_github_files.py
│   └── repo_identity.py
├── web/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── app/            # Generation + status tracker page
│   │   └── tutorial/       # Tutorial viewer
│   ├── components/
│   │   ├── landing/        # Landing page sections
│   │   ├── tutorial/       # Sidebar, TOC
│   │   ├── features/       # RepoForm, StatusTracker, ProjectHistory
│   │   └── ui/             # Mermaid renderer, Shadcn components
│   └── lib/
│       ├── api.ts
│       ├── history.ts      # localStorage project history
│       └── reading-progress.ts
├── requirements.txt
└── output/                 # Generated tutorials (gitignored)
```

---

## Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- ffmpeg
- Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))
- GitHub personal access token (optional, increases rate limits)

### 1. Clone the repository

```bash
git clone https://github.com/PrathamPatil17/CodeNarrator.git
cd CodeNarrator
```

### 2. Backend setup

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright + Chromium (required for video generation)
playwright install chromium
playwright install-deps chromium   # Linux only — installs system libs
```

### 3. Environment variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here     # optional but recommended
```

### 4. Frontend setup

```bash
cd web
npm install
```

---

## Running Locally

### Start the backend

```bash
# From project root
./venv/bin/uvicorn server.app:app --port 8000 --reload
```

### Start the frontend

```bash
# From web/ directory
cd web
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Usage

1. **Paste a GitHub URL** on the Generate Tutorial page
2. **Select language** (English, Hindi, Spanish, etc.)
3. Click **Generate Tutorial →** and watch chapters appear in real time
4. **Open Tutorial** to read the docs with diagrams and code
5. In the tutorial viewer, click **Generate Video** in the sidebar to create the animated MP4
6. Choose your preferred **voice** (Aria / Guy / Jenny) and **theme** (Dark / Light / Cyberpunk)

---

## Command-Line Usage

You can also run the pipeline directly from the terminal:

```bash
# Generate text tutorial
python main.py --repo https://github.com/username/repo

# Generate video from existing tutorial
python main.py --repo https://github.com/username/repo --video

# Options
python main.py --repo URL \
  --name my-project \          # custom project name
  --language hindi \           # documentation language
  --voice en-US-AriaNeural \   # TTS voice
  --style dark                 # video theme: dark | light | cyberpunk
```

---

## Deployment

### Single VPS (Recommended)

```bash
# Install system dependencies (Ubuntu 22.04)
apt install -y python3 python3-venv nodejs npm ffmpeg nginx

# Install project
git clone https://github.com/PrathamPatil17/CodeNarrator.git /opt/code-narrator
cd /opt/code-narrator
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/playwright install chromium
./venv/bin/playwright install-deps chromium

# Build frontend
cd web
echo "NEXT_PUBLIC_API_URL=http://your-server-ip:8000" > .env.local
npm install && npm run build
```

Use `systemd` to keep both the backend (`uvicorn`) and frontend (`next start`) running.

### Vercel + Railway

- **Frontend** → Deploy `web/` to [Vercel](https://vercel.com), set `NEXT_PUBLIC_API_URL`
- **Backend** → Deploy to [Railway](https://railway.app) with a `nixpacks.toml` that installs `ffmpeg` and `chromium`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for LLM calls |
| `GITHUB_TOKEN` | Recommended | Increases GitHub API rate limit from 60 to 5000 req/hr |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL (default: `http://localhost:8000`) |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ using PocketFlow, FastAPI, Next.js, and Google Gemini
</div>
