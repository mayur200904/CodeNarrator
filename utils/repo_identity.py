from typing import Optional
from urllib.parse import urlparse


def derive_project_name(repo_url: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
    """Return a stable repository name from common HTTPS/SSH GitHub URLs."""
    if not repo_url:
        return fallback

    raw = repo_url.strip().rstrip("/")
    if not raw:
        return fallback

    if raw.startswith("git@"):
        path = raw.split(":", 1)[1] if ":" in raw else raw
        parts = [segment for segment in path.split("/") if segment]
    else:
        parsed = urlparse(raw)
        parts = [segment for segment in parsed.path.split("/") if segment]

    if len(parts) >= 2:
        name = parts[1]
    elif parts:
        name = parts[-1]
    else:
        return fallback

    if name.endswith(".git"):
        name = name[:-4]

    return name or fallback
