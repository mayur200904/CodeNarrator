import dotenv
import os
import argparse
# Import the function that creates the flow
from flow import create_tutorial_flow

dotenv.load_dotenv()

# Default file patterns
from core.constants import DEFAULT_INCLUDE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS



# Import the core pipeline logic
from core.pipeline import run_tutorial_pipeline
from utils.repo_identity import derive_project_name

# --- Main Function ---
def main():
    parser = argparse.ArgumentParser(description="Generate a tutorial for a GitHub codebase.")

    # Source is now ONLY repo
    parser.add_argument("--repo", required=True, help="URL of the public GitHub repository.")
    
    # Removed --dir (Local directory support removed as per usage guidelines)

    parser.add_argument("-n", "--name", help="Project name (optional, derived from repo if omitted).")
    parser.add_argument("-t", "--token", help="GitHub personal access token (optional, reads from GITHUB_TOKEN env var if not provided).")
    parser.add_argument("-o", "--output", default="output", help="Base directory for output (default: ./output).")
    parser.add_argument("-i", "--include", nargs="+", help="Include file patterns (e.g. '*.py' '*.js'). Defaults to common code files if not specified.")
    parser.add_argument("-e", "--exclude", nargs="+", help="Exclude file patterns (e.g. 'tests/*' 'docs/*'). Defaults to test/build directories if not specified.")
    parser.add_argument("-s", "--max-size", type=int, default=100000, help="Maximum file size in bytes (default: 100000, about 100KB).")
    # Add language parameter for multi-language support
    parser.add_argument("--language", default="english", help="Language for the generated tutorial (default: english)")
    # Add use_cache parameter to control LLM caching
    parser.add_argument("--no-cache", action="store_true", help="Disable LLM response caching (default: caching enabled)")
    # Add max_abstraction_num parameter to control the number of abstractions
    parser.add_argument("--max-abstractions", type=int, default=10, help="Maximum number of abstractions to identify (default: 10)")
    
    # Enhanced Features
    parser.add_argument("--clean", action="store_true", help="Clean the output directory for the project before starting.")
    parser.add_argument("--voice", default="en-US-AriaNeural", help="Voice for video narration (default: en-US-AriaNeural).")
    parser.add_argument("--style", choices=["dark", "light", "cyberpunk"], default="dark", help="Visual style for video (default: dark).")

    # Modified video flag behavior
    parser.add_argument("--video", action="store_true", help="Generate video tutorial from EXISTING text tutorial (skips text generation). MUST be run after text generation.")
    
    args = parser.parse_args()

    # Prepare parameters for pipeline
    params = {
        "repo_url": args.repo,
        "project_name": args.name or derive_project_name(args.repo),
        "output_dir": args.output,
        "clean": args.clean,
        "video_mode": "only" if args.video else "none",
        "voice": args.voice,
        "style": args.style,
        "github_token": args.token,
        "include_patterns": args.include,
        "exclude_patterns": args.exclude,
        "max_file_size": args.max_size,
        "language": args.language,
        "use_cache": not args.no_cache,
        "max_abstractions": args.max_abstractions
    }
    
    try:
        run_tutorial_pipeline(params)
    except Exception as e:
        print(f"Error running pipeline: {e}")
        exit(1)

if __name__ == "__main__":
    main()
