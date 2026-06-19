// Use environment variable for API URL, fallback to localhost for dev
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type JobLogEntry = {
    timestamp: string;
    message: string;
};

export async function generateText(repoUrl: string, clean: boolean = false) {
    const res = await fetch(`${API_BASE}/api/generate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, clean }),
    });
    if (!res.ok) throw new Error("Failed to start text generation");
    return res.json();
}

export async function generateVideo(repoUrl: string, options: { voice?: string, style?: string } = {}) {
    const res = await fetch(`${API_BASE}/api/generate/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, ...options }),
    });
    if (!res.ok) throw new Error("Failed to start video generation");
    return res.json();
}

export async function getJobStatus(jobId: string) {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    if (!res.ok) throw new Error("Failed to fetch status");
    return res.json();
}

export async function getArtifacts(projectName: string) {
    const res = await fetch(`${API_BASE}/api/projects/${projectName}/artifacts`);
    if (!res.ok) return null; // Logic to handle 404 cleanly
    return res.json();
}

export async function getJobLogs(jobId: string, since: number = 0): Promise<{
    job_id: string;
    status: string;
    progress: number;
    logs: JobLogEntry[];
    next_since: number;
}> {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/logs?since=${since}`);
    if (!res.ok) throw new Error("Failed to fetch job logs");
    return res.json();
}

export async function getJobChapters(jobId: string): Promise<{
    job_id: string;
    project_name: string | null;
    status: string;
    total_chapters: number;
    completed_chapters: number;
    chapter_files: string[];
}> {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/chapters`);
    if (!res.ok) throw new Error("Failed to fetch chapter progress");
    return res.json();
}
