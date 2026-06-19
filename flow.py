import os
from pocketflow import Flow, AsyncFlow
# Import all node classes from nodes.py
from nodes import (
    FetchRepo,
    IdentifyAbstractions,
    AnalyzeRelationships,
    OrderChapters,
    WriteChapters,
    CombineTutorial
)
from nodes_video import (
    LoadExistingTutorial,
    GenerateVideoScript,
    GenerateAudio,
    GenerateVisuals,
    AssembleVideo
)

def create_tutorial_flow(video_mode="none"): # modes: "none", "only"
    """
    Creates and returns the codebase tutorial generation flow.
    video_mode: 
      - "none": Text tutorial only.
      - "only": Video generation only (loads existing chapters).
    """

    node_max_retries = int(os.getenv("LLM_NODE_MAX_RETRIES", "2"))
    node_retry_wait = int(os.getenv("LLM_NODE_RETRY_WAIT_SEC", "4"))

    # Instantiate nodes
    fetch_repo = FetchRepo()
    identify_abstractions = IdentifyAbstractions(max_retries=node_max_retries, wait=node_retry_wait)
    analyze_relationships = AnalyzeRelationships(max_retries=node_max_retries, wait=node_retry_wait)
    order_chapters = OrderChapters(max_retries=node_max_retries, wait=node_retry_wait)
    write_chapters = WriteChapters(max_retries=node_max_retries, wait=node_retry_wait)
    combine_tutorial = CombineTutorial()

    # Video nodes
    load_existing = LoadExistingTutorial()
    generate_video_script = GenerateVideoScript(max_retries=3)
    generate_visuals = GenerateVisuals()
    generate_audio = GenerateAudio()
    assemble_video = AssembleVideo()

    # Define flows based on mode
    if video_mode == "only":
        # Video Only Flow: Load -> Script -> Visuals -> Audio -> Assemble
        load_existing >> generate_video_script
        generate_video_script >> generate_visuals
        generate_visuals >> generate_audio
        generate_audio >> assemble_video
        
        tutorial_flow = Flow(start=load_existing)
        
    else:
        # Standard Flow (Text Only)
        fetch_repo >> identify_abstractions
        identify_abstractions >> analyze_relationships
        analyze_relationships >> order_chapters
        order_chapters >> write_chapters
        write_chapters >> combine_tutorial
        
        # Text pipeline uses AsyncFlow to support parallel async chapter generation.
        tutorial_flow = AsyncFlow(start=fetch_repo)

    return tutorial_flow
