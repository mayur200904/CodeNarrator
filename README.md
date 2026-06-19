# Code Narrator
### Turning Codebases into Interactive Tutorials

Code Narrator is an advanced AI-powered engine that transforms static GitHub repositories into comprehensive, interactive video tutorials and technical documentation suites. It bridges the gap between complex code and human understanding by automatically analyzing, documenting, and explaining codebases.

![Code Narrator Interface](https://placehold.co/1200x600/18181b/white?text=Code+Narrator+Dashboard)

## 🚀 Features

- **Automated Analysis**: Deeply scans repository structure, dependencies, and core logic.
- **Interactive Documentation**: Generates a rich, chapter-based markdown documentation suite with visualized diagrams.
- **Video Tutorials**: Produces AI-narrated video walkthroughs of the codebase, explaining architecture and data flow.
- **Visual Diagrams**: Automatically renders Mermaid.js sequence and class diagrams to visualize system interactions.
- **Premium Frontend**: A modern, dark-mode Next.js interface for seamless user interaction.
- **Real-time Tracking**: Live "Terminal" style logs to track the generation process step-by-step.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Shadcn UI
- **Language**: TypeScript
- **Visuals**: Framer Motion, Lucide Icons

### Backend
- **Server**: FastAPI (Python)
- **AI Engine**: Google Gemini 1.5 Pro
- **Processing**: Async task queues for non-blocking generation
- **Video Architecture**: MoviePy for programmatic video editing

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- Gemini API Key

### 1. Backend Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd code-narrator

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment
# Create a .env file and add your key:
# GEMINI_API_KEY=your_key_here
```

### 2. Frontend Setup
```bash
cd web

# Install dependencies
npm install
```

## 🏃‍♂️ Usage

### Start the System
1. **Launch Backend**:
   ```bash
   # From root directory
   ./venv/bin/uvicorn server.app:app --port 8000 --reload
   ```

2. **Launch Frontend**:
   ```bash
   # From web directory
   cd web
   npm run dev
   ```

3. **Open Application**:
   Navigate to `http://localhost:3000`.

4. **Generate Tutorial**:
   - Paste a GitHub Repository URL.
   - Watch the generation process.
   - Click "Read Docs" to explore the generated artifacts.
   - Click "Generate Video" to create a cinematic walkthrough.

## 🏗️ Architecture

Code Narrator employs a Map-Reduce approach to handle large codebases:
1. **Map**: Deconstructs the repo into services and chapters.
2. **Analysis**: Uses LLMs to analyze files and generate specific chapter content (Introduction, Architecture, Data Flow, etc.).
3. **Visualization**: Generates Mermaid diagrams for visual context.
4. **Reduce**: Synthesizes chapter summaries into a cohesive video script.
5. **Production**: Compiles audio, visuals, and code snippets into a final MP4 video.

## 📄 License
MIT License
