
import os
import json
import yaml
import subprocess
import textwrap
import re
import shutil
from uuid import uuid4
from pocketflow import Node
from utils.call_llm import call_llm
from PIL import Image, ImageDraw, ImageFont
from pygments import highlight
from pygments.lexers import get_lexer_by_name, PythonLexer, guess_lexer
from pygments.formatters import ImageFormatter
import io

# MoviePy imports - handled safely for v1/v2 compatibility if needed, 
# but assuming standard install works with direct imports or submodules.
try:
    from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips, TextClip, CompositeVideoClip
except ImportError:
    try:
        from moviepy import ImageClip, AudioFileClip, concatenate_videoclips, TextClip, CompositeVideoClip
    except ImportError:
        # Fallback for some v2 builds
        from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.video.VideoClip import ImageClip
        from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
        from moviepy.video.compositing.concatenate import concatenate_videoclips


class LoadExistingTutorial(Node):
    """Loads existing tutorial chapters from the output directory."""
    def prep(self, shared):
        return {
            "output_dir": shared.get("output_dir", "output"),
            "project_name": shared.get("project_name")
        }

    def exec(self, prep_res):
        output_dir = prep_res["output_dir"]
        project_name = prep_res["project_name"]
        
        if not project_name:
            print("Error: Project name required for loading existing tutorial.")
            return []
            
        project_path = os.path.join(output_dir, project_name)
        if not os.path.exists(project_path):
             print(f"Error: Project output directory {project_path} does not exist.")
             return []
             
        chapters = []
        # Find chapter files (format: 01_name.md)
        files = sorted(os.listdir(project_path))
        for f in files:
            if f.endswith(".md") and f != "index.md" and re.match(r"^\d+_", f):
                try:
                    with open(os.path.join(project_path, f), "r") as file:
                        content = file.read()
                        chapters.append(content)
                except Exception as e:
                    print(f"Error reading chapter {f}: {e}")
        
        print(f"Loaded {len(chapters)} existing chapters.")
        return chapters

    def post(self, shared, prep_res, exec_res):
        shared["chapters"] = exec_res


class GenerateVideoScript(Node):
    def prep(self, shared):
        chapters = shared.get("chapters", [])
        project_name = shared.get("project_name", "Project")
        return {
            "chapters": chapters,
            "project_name": project_name,
            "use_cache": shared.get("use_cache", True)
        }

    def exec(self, prep_res):
        chapters = prep_res["chapters"]
        project_name = prep_res["project_name"]
        use_cache = prep_res["use_cache"]
        
        print(f"Generating video script for {len(chapters)} chapters (target: 3 min)...")

        # --- Map Step: Summarize each chapter individually ---
        chapter_summaries = []
        for i, chapter_md in enumerate(chapters):
            # faster/cheaper prompt to summarize a single chapter
            # We treat the first chapter slightly differently (intro) vs others (body)
            context_type = "Project Introduction" if i == 0 else f"Chapter {i+1} Content"
            
            prompt = f"""
            Summarize the following technical tutorial chapter into 3-4 distinct, key takeaways for a video script.
            Focus on what the user learns or builds in this chapter. Ignore code details, focus on concepts.
            
            Chapter Context: {context_type}
            
            Content:
            {chapter_md[:8000]} # Truncate individual chapter if extremely huge
            
            Output format:
            - Key point 1
            - Key point 2
            ...
            """
            
            summary = call_llm(prompt, use_cache=use_cache)
            chapter_summaries.append(f"## Chapter {i+1} Summary:\n{summary}")
            print(f"  - Summarized Chapter {i+1}")

        # --- Reduce Step: Generate Script from Summaries ---
        all_summaries_text = "\n\n".join(chapter_summaries)
        
        prompt = f"""
        You are a professional video content creator. Create a concise 3-MINUTE video script for a technical project tutorial.
        
        Project: {project_name}
        
        The tutorial has the following chapters (Summarized):
        {all_summaries_text}
        
        CRITICAL REQUIREMENTS:
        1. The final video must be approximately 3 MINUTES (about 450 words of narration)
        2. Create a cohesive narrative that flows from the intro to the conclusion.
        3. Do NOT just list chapters "In chapter 1... In chapter 2...". Instead, tell a story: "First we set up... then we build... finally we..."
        4. Include 10-15 segments maximum.
        
        Output a JSON array of segments. Each segment has:
        - `type`: "slide" (text/title), "code" (snippet), or "diagram" (visual flow)
        - `content`: Text to display, code to show, or MERMAID.JS code for diagrams
        - `narration`: What to say (keep VERY concise - this must fit in 3 minutes total)
        
        For `type`: "diagram", providing valid Mermaid.js code (e.g., flowchart LR, sequenceDiagram) in `content`.
        Use diagrams to visualize the core workflow or architecture.
        
        CRITICAL DIAGRAM RULES:
        1. Always QUOTE node labels to prevent syntax errors with special characters. 
           Example: `id["Label (Extra Info)"]` instead of `id[Label (Extra Info)]`.
        2. Do not use markdown code fences in the content.
        
        Example structure:
        [
          {{
            "type": "slide",
            "content": "{project_name}",
            "narration": "Welcome to {project_name}..."
          }},
          {{
            "type": "diagram",
            "content": "graph TD\\n A[Input] --> B[Model] --> C[Output]",
            "narration": "Data flows from input through the model..."
          }}
        ]
        
        IMPORTANT: 
        - Keep narration BRIEF (total ~450 words)
        - Return ONLY the JSON array, no markdown formatting
        """
        
        response = call_llm(prompt, use_cache=use_cache)
        
        # Clean up response
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            try:
                # Try to find the array if just ``` is used
                start = response.index('[')
                end = response.rindex(']') + 1
                response = response[start:end]
            except:
                response = response.split("```")[1].split("```")[0].strip()
        
        try:
            segments = json.loads(response)
            return [{
                "chapter_index": 0,
                "segments": segments
            }]
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Response was: {response[:500]}")
            return []

    def post(self, shared, prep_res, exec_res):
        shared["video_scripts"] = exec_res


class GenerateAudio(Node):
    def prep(self, shared):
        return {
            "scripts": shared.get("video_scripts", []),
            "output_dir": shared.get("output_dir", "output"),
            "project_name": shared.get("project_name", "project"),
            "voice": shared.get("voice", "en-US-AriaNeural")
        }

    def exec(self, prep_res):
        scripts = prep_res["scripts"]
        output_dir = prep_res["output_dir"]
        project_name = prep_res["project_name"]
        
        # Structure: List of { "chapter_index": 0, "audio_files": [...] }
        all_audio_data = []

        # Use voice from shared context, default to Aria if not set
        voice = prep_res.get("voice", "en-US-AriaNeural")
        print(f"Using Voice: {voice}")
        
        # Audio setup
        import sys
        edge_tts_bin = os.path.join(os.path.dirname(sys.executable), "edge-tts")
        if not os.path.exists(edge_tts_bin):
            edge_tts_bin = "edge-tts"

        for chapter_data in scripts:
            i_chap = chapter_data["chapter_index"]
            segments = chapter_data["segments"]
            
            audio_dir = os.path.join(output_dir, project_name, "assets", f"chapter_{i_chap+1:02d}", "audio")
            os.makedirs(audio_dir, exist_ok=True)
            
            print(f"Generating audio for Chapter {i_chap+1} ({len(segments)} segments)...")
            
            chapter_audio_files = []
            
            for i_seg, segment in enumerate(segments):
                text = segment.get("narration", "")
                if not text:
                    chapter_audio_files.append(None)
                    continue
                    
                filename = os.path.join(audio_dir, f"seg_{i_seg:03d}.mp3")
                
                cmd = [edge_tts_bin, "--text", text, "--write-media", filename, "--voice", voice]
                
                try:
                    subprocess.run(cmd, check=True, capture_output=True)
                    chapter_audio_files.append(filename)
                except subprocess.CalledProcessError as e:
                    print(f"Error generating audio for segment {i_seg}: {e}")
                    chapter_audio_files.append(None)
            
            all_audio_data.append({
                "chapter_index": i_chap,
                "audio_files": chapter_audio_files
            })
        
        return all_audio_data

    def post(self, shared, prep_res, exec_res):
        shared["audio_assets_data"] = exec_res


class GenerateVisuals(Node):
    def prep(self, shared):
        return {
            "scripts": shared.get("video_scripts", []),
            "output_dir": shared.get("output_dir", "output"),
            "project_name": shared.get("project_name", "project"),
            "style": shared.get("style", "dark")
        }

    def exec(self, prep_res):
        scripts = prep_res["scripts"]
        output_dir = prep_res["output_dir"]
        project_name = prep_res["project_name"]
        style_name = prep_res.get("style", "dark")
        
        # --- Style Configurations ---
        STYLES = {
            "dark": {
                "bg_top": (40, 45, 60),      # Dark Blue-Grey
                "bg_bottom": (20, 25, 30),   # Darker
                "title_color": (100, 200, 255), # Light Blue
                "text_color": (240, 240, 240),  # White-ish
                "code_style": "monokai"
            },
            "light": {
                "bg_top": (255, 255, 255),   # White
                "bg_bottom": (240, 240, 250), # Very light blue
                "title_color": (0, 80, 160),  # Dark Blue
                "text_color": (30, 30, 30),   # Dark Grey
                "code_style": "default" # or friendly
            },
            "cyberpunk": {
                "bg_top": (45, 0, 45),       # Dark Purple
                "bg_bottom": (10, 0, 20),    # Darker Purple
                "title_color": (0, 255, 255), # Cyan
                "text_color": (255, 0, 150),  # Neon Pink/Magenta
                "code_style": "monokai"
            }
        }
        
        current_style = STYLES.get(style_name, STYLES["dark"])
        print(f"Using Visual Style: {style_name}")

        # Structure: List of { "chapter_index": 0, "image_files": [...] }
        all_visual_data = []
        
        # Font setup
        font_path = "/System/Library/Fonts/Helvetica.ttc"
        if not os.path.exists(font_path):
             font_path = None 
        
        width, height = 1920, 1080
        
        # Helper to create gradient background
        def create_background(w, h, config):
            base = Image.new('RGB', (w, h), config["bg_bottom"])
            top = Image.new('RGB', (w, h), config["bg_top"])
            mask = Image.new('L', (w, h))
            mask_data = []
            for y in range(h):
                for x in range(w):
                    mask_data.append(int(255 * (y / h)))
            mask.putdata(mask_data)
            base.paste(top, (0, 0), mask)
            return base

        for chapter_data in scripts:
            i_chap = chapter_data["chapter_index"]
            segments = chapter_data["segments"]
            
            images_dir = os.path.join(output_dir, project_name, "assets", f"chapter_{i_chap+1:02d}", "images")
            os.makedirs(images_dir, exist_ok=True)
            
            print(f"Generating enhanced visuals for Chapter {i_chap+1}...")
            
            chapter_image_files = []
            
            for i_seg, segment in enumerate(segments):
                filename = os.path.join(images_dir, f"slide_{i_seg:03d}.png")
                
                # Create background using style
                img = create_background(width, height, current_style)
                draw = ImageDraw.Draw(img)
                
                seg_type = segment.get("type", "slide")
                content = segment.get("content", "")
                
                if seg_type == "code":
                    # Render code with Pygments
                    try:
                        # Guess lexer or default to Python
                        try:
                            lexer = get_lexer_by_name("python", stripall=True)
                        except:
                            try:
                                lexer = guess_lexer(content)
                            except:
                                lexer = PythonLexer()
                        
                        # Generate code image using style
                        formatter = ImageFormatter(
                            style=current_style["code_style"], 
                            line_numbers=False, 
                            font_size=40
                        )
                        code_img_data = highlight(content, lexer, formatter)
                        
                        # Convert bytes to PIL Image
                        code_img = Image.open(io.BytesIO(code_img_data))
                        
                        # Scale if too large
                        max_w, max_h = width - 200, height - 200
                        if code_img.width > max_w or code_img.height > max_h:
                            code_img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                        
                        # Center paste
                        x_pos = (width - code_img.width) // 2
                        y_pos = (height - code_img.height) // 2
                        img.paste(code_img, (x_pos, y_pos))
                        
                    except Exception as e:
                        print(f"Error rendering code: {e}. Fallback to plain text.")
                        # Fallback
                        lines = content.split('\n')
                        y_text = 100
                        font = ImageFont.load_default()
                        for line in lines:
                             draw.text((100, y_text), line, font=font, fill=current_style["text_color"])
                             y_text += 50
                
                elif seg_type == "diagram":
                    # Render Mermaid Diagram
                    try:
                        import base64
                        import requests
                        
                        print("Rendering Mermaid diagram...")
                        
                        # Strip markdown fences if present
                        if "```" in content:
                            content = content.replace("```mermaid", "").replace("```", "").strip()

                        # Robust Regex Cleaning for Mermaid syntax
                        def clean_mermaid_syntax(text):
                            import re
                            # Fix unquoted labels in [], (), {}
                            def replacer(match):
                                node_id = match.group(1)
                                shape_start = match.group(2)
                                label = match.group(3)
                                shape_end = match.group(4)
                                if label.startswith('"') and label.endswith('"'):
                                    return f"{node_id}{shape_start}{label}{shape_end}"
                                # Escape inner quotes if we wrap in quotes
                                label = label.replace('"', "'")
                                return f'{node_id}{shape_start}"{label}"{shape_end}'

                            patterns = [
                                r'(\w+)(\[)(.*?)(\])',  # []
                                r'(\w+)(\()(.*?)(\))',  # ()
                                r'(\w+)(\{)(.*?)(\})',  # {}
                            ]
                            cleaned = text
                            for p in patterns:
                                try:
                                    cleaned = re.sub(p, replacer, cleaned)
                                except:
                                    pass
                            return cleaned
                        
                        content = clean_mermaid_syntax(content)


                        graph_bytes = content.encode("utf8")
                        base64_bytes = base64.urlsafe_b64encode(graph_bytes)
                        base64_string = base64_bytes.decode("ascii")
                        
                        # Use mermaid.ink API for rendering
                        # Adjust mermaid background color based on style if possible or keep generic dark/light
                        # For now, keep generic dark bg unless light style
                        bg_color = "FFFFFF" if style_name == "light" else "333333"
                        url = f"https://mermaid.ink/img/{base64_string}?bgColor={bg_color}"
                        response = requests.get(url, timeout=10)
                        
                        if response.status_code == 200:
                            diagram_img = Image.open(io.BytesIO(response.content))
                            
                            # Scale if too large
                            max_w, max_h = width - 100, height - 100
                            if diagram_img.width > max_w or diagram_img.height > max_h:
                                diagram_img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                            
                            # Center paste
                            x_pos = (width - diagram_img.width) // 2
                            y_pos = (height - diagram_img.height) // 2
                            img.paste(diagram_img, (x_pos, y_pos))
                        else:
                            raise Exception(f"Mermaid rendering failed: {response.status_code}")
                            
                    except Exception as e:
                        print(f"Error rendering diagram: {e}. Fallback to text.")
                        # Fallback to displaying the code
                        lines = content.split('\n')
                        y_text = 100
                        font = ImageFont.load_default()
                        for line in lines:
                             draw.text((100, y_text), line, font=font, fill=current_style["text_color"])
                             y_text += 50

                else:
                    # Render slide text (Title + Content)
                    # We assume 'content' might be a title or a point
                    
                    try:
                        if font_path:
                            title_font = ImageFont.truetype(font_path, 80)
                            body_font = ImageFont.truetype(font_path, 50)
                        else:
                            title_font = ImageFont.load_default()
                            body_font = ImageFont.load_default()
                    except:
                        title_font = ImageFont.load_default()
                        body_font = ImageFont.load_default()
                    
                    # Split into title/body if possible (heuristic)
                    parts = content.split(':', 1)
                    if len(parts) == 2 and len(parts[0]) < 50:
                        title = parts[0].strip()
                        body = parts[1].strip()
                    else:
                        title = ""
                        body = content
                    
                    # Draw Title
                    y_text = 300
                    if title:
                        try:
                            w = draw.textlength(title, font=title_font)
                        except:
                            w = len(title) * 30
                        x_text = (width - w) / 2
                        draw.text((x_text, 150), title, font=title_font, fill=current_style["title_color"])
                        y_text = 400
                    else:
                        y_text = (height // 2) - 100
                        
                    # Draw Body
                    lines = textwrap.wrap(body, width=50)
                    line_height = 70
                    
                    if not title:
                         total_height = len(lines) * line_height
                         y_text = (height - total_height) / 2
                    
                    for line in lines:
                        try:
                            w = draw.textlength(line, font=body_font)
                        except:
                            w = len(line) * 20
                        
                        x_text = (width - w) / 2
                        draw.text((x_text, y_text), line, font=body_font, fill=current_style["text_color"])
                        y_text += line_height
                
                img.save(filename)
                chapter_image_files.append(filename)
            
            all_visual_data.append({
                "chapter_index": i_chap,
                "image_files": chapter_image_files
            })
            
        return all_visual_data

    def post(self, shared, prep_res, exec_res):
        shared["visual_assets_data"] = exec_res


class AssembleVideo(Node):
    def prep(self, shared):
        return {
            "audio_data": shared.get("audio_assets_data", []),
            "visual_data": shared.get("visual_assets_data", []),
            "output_dir": shared.get("output_dir", "output"),
            "project_name": shared.get("project_name", "project")
        }

    def exec(self, prep_res):
        audio_data = prep_res["audio_data"]
        visual_data = prep_res["visual_data"]
        output_dir = prep_res["output_dir"]
        project_name = prep_res["project_name"]

        def _contains_moov_atom(file_path: str) -> bool:
            token = b"moov"
            overlap = b""
            try:
                with open(file_path, "rb") as f:
                    while True:
                        chunk = f.read(1024 * 1024)
                        if not chunk:
                            return False
                        data = overlap + chunk
                        if token in data:
                            return True
                        overlap = data[-3:]
            except OSError:
                return False

        def _is_valid_mp4_file(file_path: str) -> bool:
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                return False

            ffprobe_bin = shutil.which("ffprobe")
            if ffprobe_bin:
                cmd = [
                    ffprobe_bin,
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    file_path,
                ]
                probe = subprocess.run(cmd, capture_output=True, text=True)
                return probe.returncode == 0 and bool((probe.stdout or "").strip())

            # Fallback when ffprobe is unavailable.
            return _contains_moov_atom(file_path)
        
        # Helper to find matching visual data for an audio chapter
        def get_visuals_for_chapter(idx, v_data):
            for v in v_data:
                if v["chapter_index"] == idx:
                    return v["image_files"]
            return []
            
        # Collect ALL clips from all chapters into one list
        all_clips = []
        all_audio_clips = []
        
        print("Assembling single consolidated video...")

        for a_chapter in audio_data:
            i_chap = a_chapter["chapter_index"]
            audio_files = a_chapter["audio_files"]
            image_files = get_visuals_for_chapter(i_chap, visual_data)
            
            if len(audio_files) != len(image_files):
                print(f"Warning: Chapter {i_chap+1} mismatch - Audio: {len(audio_files)}, Visuals: {len(image_files)}")
                
            for audio_path, image_path in zip(audio_files, image_files):
                if not audio_path or not os.path.exists(audio_path):
                    continue
                if not image_path or not os.path.exists(image_path):
                    continue
                    
                try:
                    audio_clip = AudioFileClip(audio_path)
                    all_audio_clips.append(audio_clip)
                    # MoviePy 2.x uses with_duration and with_audio instead of set_
                    if hasattr(ImageClip, 'with_duration'):
                        image_clip = ImageClip(image_path).with_duration(audio_clip.duration)
                        image_clip = image_clip.with_audio(audio_clip)
                    else:
                        # Fallback for older versions
                        image_clip = ImageClip(image_path).set_duration(audio_clip.duration)
                        image_clip = image_clip.set_audio(audio_clip)
                        
                    all_clips.append(image_clip)
                except Exception as e:
                    print(f"Error creating clip: {e}")
        
        if not all_clips:
            print("No clips created.")
            return None
            
        # Concatenate ALL clips into ONE video
        print(f"Concatenating {len(all_clips)} clips into single video...")
        final_video = None
        output_path = os.path.join(output_dir, project_name, "tutorial.mp4")
        output_base, output_ext = os.path.splitext(output_path)
        effective_ext = output_ext or ".mp4"
        # Keep a real video extension so ffmpeg can infer the muxer.
        tmp_output_path = f"{output_base}.{uuid4().hex}.tmp{effective_ext}"

        try:
            final_video = concatenate_videoclips(all_clips, method="compose")

            print(f"Writing video to temporary file {tmp_output_path}...")
            final_video.write_videofile(
                tmp_output_path,
                fps=24,
                codec='libx264',
                audio_codec='aac',
                threads=4  # Use multiple threads for faster encoding
            )

            if not _is_valid_mp4_file(tmp_output_path):
                raise ValueError("Encoded MP4 validation failed (missing metadata/moov atom or unreadable file).")

            os.replace(tmp_output_path, output_path)

            duration = final_video.duration
            print(f"Video saved to: {output_path} (Duration: {duration:.1f}s)")
            return [output_path]  # Return as list for consistency
        finally:
            if final_video is not None:
                try:
                    final_video.close()
                except Exception:
                    pass

            for clip in all_clips:
                try:
                    clip.close()
                except Exception:
                    pass

            for audio_clip in all_audio_clips:
                try:
                    audio_clip.close()
                except Exception:
                    pass

            if os.path.exists(tmp_output_path):
                try:
                    os.remove(tmp_output_path)
                except OSError:
                    pass

    def post(self, shared, prep_res, exec_res):
        shared["video_paths"] = exec_res
