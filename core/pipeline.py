import os
import argparse
import asyncio
from flow import create_tutorial_flow
from core.constants import DEFAULT_INCLUDE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS
import shutil
from utils.repo_identity import derive_project_name

def run_tutorial_pipeline(params: dict):
    """
    Executes the tutorial generation pipeline.
    
    Args:
        params (dict): Configuration parameters including:
            - repo_url (str, optional): URL of the GitHub repository.
            - project_name (str, optional): Name of the project.
            - output_dir (str): Base output directory.
            - clean (bool): Whether to clean the output directory first.
            - video_mode (str): "none", "combined", or "only".
            - voice (str): Voice for video generation.
            - style (str): Visual style for video generation.
            - include_patterns (list): File patterns to include.
            - exclude_patterns (list): File patterns to exclude.
            - max_file_size (int): Max file size in bytes.
            - language (str): Target language.
            - use_cache (bool): Whether to use LLM caching.
            - max_abstractions (int): Max abstractions to identify.
            - github_token (str): GitHub API token.
            
    Returns:
        dict: Result of the flow execution.
    """
    
    repo_url = params.get("repo_url")
    project_name = params.get("project_name")
    
    # Derive project name if not provided
    if not project_name and repo_url:
        project_name = derive_project_name(repo_url)
        
    if not project_name:
        raise ValueError("Project name could not be determined. Please provide 'project_name' or 'repo_url'.")

    output_dir = params.get("output_dir", "output")
    
    # --- Clean Logic ---
    if params.get("clean", False):
        project_output = os.path.join(output_dir, project_name)
        if os.path.exists(project_output):
            print(f"Cleaning output directory: {project_output}")
            shutil.rmtree(project_output)

    # Initialize shared state
    shared = {
        "repo_url": repo_url,
        "local_dir": None, # Removed local directory support
        "project_name": project_name, 
        "github_token": params.get("github_token") or os.environ.get('GITHUB_TOKEN'),
        "output_dir": output_dir,

        "include_patterns": set(params.get("include_patterns") or DEFAULT_INCLUDE_PATTERNS),
        "exclude_patterns": set(params.get("exclude_patterns") or DEFAULT_EXCLUDE_PATTERNS),
        "max_file_size": params.get("max_file_size", 100000),

        "language": params.get("language", "english"),
        "use_cache": params.get("use_cache", True),
        "max_abstraction_num": params.get("max_abstractions", 10),
        
        "voice": params.get("voice", "en-US-AriaNeural"),
        "style": params.get("style", "dark"),

        "files": [],
        "abstractions": [],
        "relationships": {},
        "chapter_order": [],
        "chapters": [],
        "final_output_dir": None
    }
    
    video_mode = params.get("video_mode", "none")
    
    # Logging
    if video_mode == "only":
        print(f"Starting VIDEO generation for: {project_name}")
        print(f"  - Voice: {shared['voice']}")
        print(f"  - Style: {shared['style']}")
    else:
        print(f"Starting TEXT tutorial generation for: {repo_url} in {shared['language'].capitalize()} language")
        
    print(f"LLM caching: {'Enabled' if shared['use_cache'] else 'Disabled'}")

    # Create and run flow
    tutorial_flow = create_tutorial_flow(video_mode=video_mode)
    if hasattr(tutorial_flow, "run_async") and video_mode != "only":
        asyncio.run(tutorial_flow.run_async(shared))
    else:
        tutorial_flow.run(shared)
    
    return shared
