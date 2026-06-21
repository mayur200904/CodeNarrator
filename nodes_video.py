
import os
import json
import re
import shutil
import subprocess
import io
from uuid import uuid4
from pocketflow import Node
from utils.call_llm import call_llm
from PIL import Image
import numpy as np

# MoviePy imports
try:
    from moviepy.editor import (ImageClip, AudioFileClip, concatenate_videoclips,
                                 CompositeVideoClip, CompositeAudioClip)
    from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
    from moviepy.audio.AudioClip import AudioArrayClip
except ImportError:
    try:
        from moviepy import (ImageClip, AudioFileClip, concatenate_videoclips,
                              CompositeVideoClip, CompositeAudioClip)
        from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
        from moviepy.audio.AudioClip import AudioArrayClip
    except ImportError:
        from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.video.VideoClip import ImageClip
        from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
        from moviepy.video.compositing.concatenate import concatenate_videoclips
        from moviepy.audio.AudioClip import AudioArrayClip


# ─────────────────────────────────────────────────────────────────────────────
# Shared CSS / SVG fragments
# ─────────────────────────────────────────────────────────────────────────────

_WAVEFORM_HTML = """
<div class="waveform">
  <span></span><span></span><span></span><span></span><span></span>
</div>"""

_WAVEFORM_CSS = """
.waveform {
  display: flex; align-items: center; gap: 4px; height: 28px;
  margin-right: 16px;
}
.waveform span {
  display: inline-block; width: 4px; border-radius: 3px;
  background: linear-gradient(to top, #3b82f6, #8b5cf6);
  animation: wv 1.1s ease-in-out infinite;
}
.waveform span:nth-child(1) { animation-duration: 0.9s;  animation-delay: 0.0s; }
.waveform span:nth-child(2) { animation-duration: 1.1s;  animation-delay: 0.15s; }
.waveform span:nth-child(3) { animation-duration: 0.85s; animation-delay: 0.05s; }
.waveform span:nth-child(4) { animation-duration: 1.2s;  animation-delay: 0.2s; }
.waveform span:nth-child(5) { animation-duration: 0.95s; animation-delay: 0.1s; }
@keyframes wv { 0%,100% { height: 5px; } 50% { height: 24px; } }
"""

_FOOTER_CSS = """
.footer {
  position: absolute; bottom: 0; left: 0; right: 0; height: 76px;
  background: rgba(0,0,0,0.45); border-top: 1px solid rgba(255,255,255,0.07);
  display: flex; flex-direction: column; justify-content: center;
}
.progress-track { height: 3px; background: rgba(255,255,255,0.08); }
.progress-fill  { height: 100%; background: linear-gradient(90deg,#3b82f6,#8b5cf6); transition: none; }
.footer-row {
  display: flex; align-items: center; padding: 6px 40px 0;
}
.subtitle {
  flex: 1; font-size: 14px; color: rgba(255,255,255,0.48);
  font-style: italic; line-height: 1.4; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
"""

# ─────────────────────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────────────────────

INTRO_TEMPLATE = """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  width:1280px; height:720px; overflow:hidden;
  background: radial-gradient(ellipse at 60% 40%, #1e3a5f 0%, #0f1117 60%, #0d1520 100%);
  font-family:'Segoe UI',system-ui,sans-serif; color:#e2e8f0;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}}
.orb {{ position:absolute; border-radius:50%; filter:blur(90px); opacity:0.2; }}
.orb1 {{ width:500px; height:500px; background:#3b82f6; top:-150px; right:-120px; animation:float 9s ease-in-out infinite; }}
.orb2 {{ width:350px; height:350px; background:#8b5cf6; bottom:-100px; left:-80px; animation:float 7s ease-in-out infinite reverse; }}
.orb3 {{ width:220px; height:220px; background:#06b6d4; top:40%; left:10%; animation:float 11s ease-in-out infinite; }}
@keyframes float {{ 0%,100%{{transform:translate(0,0);}} 50%{{transform:translate(18px,-18px);}} }}

.top-stripe {{
  position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4,#ec4899);
  background-size:300% 100%;
  animation:stripe 4s linear infinite, bar-in 0.6s ease forwards;
  transform-origin:left; transform:scaleX(0);
}}
@keyframes stripe {{ 0%{{background-position:0%}} 100%{{background-position:300%}} }}
@keyframes bar-in  {{ to{{transform:scaleX(1);}} }}

.eyebrow {{
  font-size:13px; letter-spacing:4px; text-transform:uppercase; color:#60a5fa;
  opacity:0; animation:fade-up 0.5s 0.4s ease forwards;
  margin-bottom:20px;
}}
.title {{
  font-size:72px; font-weight:800; line-height:1.1; text-align:center;
  background:linear-gradient(135deg,#ffffff 0%,#93c5fd 50%,#c4b5fd 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  opacity:0; animation:fade-up 0.6s 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
  max-width:900px;
}}
.divider {{
  margin:28px auto;
  width:0; height:3px; border-radius:2px;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6);
  animation:grow-w 0.5s 1.0s ease forwards;
}}
@keyframes grow-w {{ to{{width:80px;}} }}
.tagline {{
  font-size:22px; color:rgba(255,255,255,0.55); letter-spacing:1px;
  opacity:0; animation:fade-up 0.5s 1.1s ease forwards;
}}
@keyframes fade-up {{ from{{opacity:0;transform:translateY(16px);}} to{{opacity:1;transform:translateY(0);}} }}

{waveform_css}
{footer_css}
</style></head><body>
<div class="orb orb1"></div>
<div class="orb orb2"></div>
<div class="orb orb3"></div>
<div class="top-stripe"></div>

<div class="eyebrow">AI-Generated Tutorial</div>
<div class="title">{project_name}</div>
<div class="divider"></div>
<div class="tagline">A deep dive into how it works</div>

<div class="footer">
  <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
  <div class="footer-row">
    {waveform_html}
    <div class="subtitle">{subtitle}</div>
  </div>
</div>
</body></html>"""


OUTRO_TEMPLATE = """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  width:1280px; height:720px; overflow:hidden;
  background: radial-gradient(ellipse at 40% 60%, #1e1b4b 0%, #0f1117 60%, #0d1520 100%);
  font-family:'Segoe UI',system-ui,sans-serif; color:#e2e8f0;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}}
.orb {{ position:absolute; border-radius:50%; filter:blur(90px); opacity:0.18; }}
.orb1 {{ width:450px; height:450px; background:#8b5cf6; top:-100px; left:-100px; animation:float 8s ease-in-out infinite; }}
.orb2 {{ width:300px; height:300px; background:#ec4899; bottom:-80px; right:-60px; animation:float 10s ease-in-out infinite reverse; }}
@keyframes float {{ 0%,100%{{transform:translate(0,0);}} 50%{{transform:translate(14px,-14px);}} }}

.top-stripe {{
  position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#8b5cf6,#ec4899,#3b82f6);
  animation:bar-in 0.6s ease forwards; transform-origin:left; transform:scaleX(0);
}}
@keyframes bar-in {{ to{{transform:scaleX(1);}} }}

.check {{
  width:72px; height:72px; border-radius:50%;
  background:linear-gradient(135deg,#3b82f6,#8b5cf6);
  display:flex; align-items:center; justify-content:center;
  font-size:36px; margin-bottom:24px;
  opacity:0; transform:scale(0.5);
  animation:pop 0.5s 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
}}
@keyframes pop {{ to{{opacity:1;transform:scale(1);}} }}
.heading {{
  font-size:56px; font-weight:800; text-align:center;
  background:linear-gradient(135deg,#ffffff,#c4b5fd);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  opacity:0; animation:fade-up 0.5s 0.7s ease forwards;
}}
.sub {{
  font-size:20px; color:rgba(255,255,255,0.5); margin-top:16px;
  opacity:0; animation:fade-up 0.5s 0.9s ease forwards;
}}
.project-chip {{
  margin-top:28px;
  padding:10px 28px; border-radius:40px;
  border:1px solid rgba(139,92,246,0.4); background:rgba(139,92,246,0.12);
  font-size:16px; font-weight:600; color:#c4b5fd; letter-spacing:1px;
  opacity:0; animation:fade-up 0.5s 1.1s ease forwards;
}}
@keyframes fade-up {{ from{{opacity:0;transform:translateY(14px);}} to{{opacity:1;transform:translateY(0);}} }}

{waveform_css}
{footer_css}
</style></head><body>
<div class="orb orb1"></div>
<div class="orb orb2"></div>
<div class="top-stripe"></div>

<div class="check">✓</div>
<div class="heading">Thanks for Watching!</div>
<div class="sub">Generated by Code Narrator · Powered by AI</div>
<div class="project-chip">{project_name}</div>

<div class="footer">
  <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
  <div class="footer-row">
    {waveform_html}
    <div class="subtitle">{subtitle}</div>
  </div>
</div>
</body></html>"""


TRANSITION_TEMPLATE = """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  width:1280px; height:720px; overflow:hidden;
  background:linear-gradient(135deg,#0f1117 0%,#1a1f35 50%,#0d1520 100%);
  font-family:'Segoe UI',system-ui,sans-serif; color:#e2e8f0;
  display:flex; align-items:center; justify-content:center;
}}
.line-h {{
  position:absolute; top:50%; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(59,130,246,0.5),transparent);
  transform:translateY(-60px);
  opacity:0; animation:fade-in 0.4s 0.1s ease forwards;
}}
.line-h2 {{
  position:absolute; top:50%; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(139,92,246,0.5),transparent);
  transform:translateY(60px);
  opacity:0; animation:fade-in 0.4s 0.2s ease forwards;
}}
@keyframes fade-in {{ to{{opacity:1;}} }}

.pill {{
  padding:6px 20px; border-radius:20px;
  background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.4);
  font-size:13px; letter-spacing:3px; text-transform:uppercase; color:#60a5fa;
  margin-bottom:16px;
  opacity:0; animation:fade-up 0.4s 0.3s ease forwards;
}}
.section-title {{
  font-size:52px; font-weight:700; text-align:center;
  background:linear-gradient(135deg,#ffffff,#93c5fd);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  opacity:0; animation:fade-up 0.5s 0.45s cubic-bezier(0.16,1,0.3,1) forwards;
  max-width:800px;
}}
.bar {{
  margin-top:20px; height:3px; width:0; border-radius:2px;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6);
  animation:grow-w 0.5s 0.8s ease forwards;
}}
@keyframes grow-w {{ to{{width:60px;}} }}
@keyframes fade-up {{ from{{opacity:0;transform:translateY(12px);}} to{{opacity:1;transform:translateY(0);}} }}

.center {{ display:flex; flex-direction:column; align-items:center; }}

{waveform_css}
{footer_css}
</style></head><body>
<div class="line-h"></div>
<div class="line-h2"></div>
<div class="center">
  <div class="pill">Next Up</div>
  <div class="section-title">{title}</div>
  <div class="bar"></div>
</div>

<div class="footer">
  <div class="progress-track"><div class="progress-fill" style="width:{progress_pct}%"></div></div>
  <div class="footer-row">
    {waveform_html}
    <div class="subtitle">{subtitle}</div>
  </div>
</div>
</body></html>"""


SLIDE_TEMPLATE = """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  width:1280px; height:720px; overflow:hidden;
  background:linear-gradient(135deg,#0f1117 0%,#1a1f35 50%,#0d1520 100%);
  font-family:'Segoe UI',system-ui,sans-serif; color:#e2e8f0;
}}
.orb {{ position:absolute; border-radius:50%; filter:blur(80px); opacity:0.15; }}
.orb1 {{ width:400px; height:400px; background:#3b82f6; top:-100px; right:-100px; }}
.orb2 {{ width:300px; height:300px; background:#8b5cf6; bottom:-80px; left:-60px; }}
.orb3 {{ width:200px; height:200px; background:#06b6d4; top:50%; left:40%; }}

.top-bar {{
  position:absolute; top:0; left:0; right:0; height:4px;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4);
  animation:bar-in 0.6s ease forwards; transform-origin:left; transform:scaleX(0);
}}
@keyframes bar-in {{ to{{transform:scaleX(1);}} }}

.header {{
  position:absolute; top:4px; left:0; right:0; height:52px;
  display:flex; align-items:center; padding:0 44px;
  background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.07);
  opacity:0; animation:fade-down 0.4s 0.2s ease forwards;
}}
@keyframes fade-down {{ from{{opacity:0;transform:translateY(-8px);}} to{{opacity:1;transform:translateY(0);}} }}
.project-name {{ font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#60a5fa; }}
.seg-label {{ margin-left:auto; font-size:12px; color:rgba(255,255,255,0.28); letter-spacing:1px; }}

.card {{
  position:absolute; top:68px; left:44px; right:44px; bottom:76px;
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09);
  border-radius:14px; padding:36px 52px;
  opacity:0; animation:card-rise 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
}}
@keyframes card-rise {{ from{{opacity:0;transform:translateY(20px);}} to{{opacity:1;transform:translateY(0);}} }}

.title {{
  font-size:38px; font-weight:700; line-height:1.15;
  background:linear-gradient(135deg,#ffffff 0%,#93c5fd 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  margin-bottom:8px;
  opacity:0; animation:slide-r 0.5s 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
}}
@keyframes slide-r {{ from{{opacity:0;transform:translateX(-24px);}} to{{opacity:1;transform:translateX(0);}} }}

.divider {{
  height:3px; width:0; border-radius:2px;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6);
  margin-bottom:24px;
  animation:grow-w 0.4s 0.75s ease forwards;
}}
@keyframes grow-w {{ to{{width:52px;}} }}

.bullet {{
  display:flex; align-items:flex-start; gap:14px;
  margin-bottom:15px; opacity:0; transform:translateX(-16px);
}}
.bullet-dot {{
  flex-shrink:0; width:7px; height:7px; border-radius:50%;
  background:#3b82f6; margin-top:10px; box-shadow:0 0 7px #3b82f6;
}}
.bullet-text {{ font-size:20px; line-height:1.55; color:#cbd5e1; font-weight:400; }}
.bullet-text strong {{ color:#93c5fd; font-weight:600; }}

{waveform_css}
{footer_css}
</style></head><body>
<div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>
<div class="top-bar"></div>
<div class="header">
  <span class="project-name">{project_name}</span>
  <span class="seg-label">{seg_label}</span>
</div>
<div class="card">
  <div class="title">{title}</div>
  <div class="divider"></div>
  {bullets_html}
</div>
<div class="footer">
  <div class="progress-track"><div class="progress-fill" style="width:{progress_pct}%"></div></div>
  <div class="footer-row">
    {waveform_html}
    <div class="subtitle">{subtitle}</div>
  </div>
</div>
<script>
document.querySelectorAll('.bullet').forEach((el,i) => {{
  el.animate(
    [{{opacity:0,transform:'translateX(-16px)'}},{{opacity:1,transform:'translateX(0)'}}],
    {{duration:380, delay:800+i*160, fill:'forwards', easing:'cubic-bezier(0.16,1,0.3,1)'}}
  );
}});
</script>
</body></html>"""


CODE_TEMPLATE = """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  width:1280px; height:720px; overflow:hidden;
  background:linear-gradient(135deg,#0f1117 0%,#1a1f35 50%,#0d1520 100%);
  font-family:'Segoe UI',system-ui,sans-serif; color:#e2e8f0;
}}
.orb {{ position:absolute; border-radius:50%; filter:blur(80px); opacity:0.12; }}
.orb1 {{ width:350px; height:350px; background:#3b82f6; top:-80px; right:-80px; }}
.orb2 {{ width:250px; height:250px; background:#8b5cf6; bottom:-60px; left:-40px; }}

.top-bar {{
  position:absolute; top:0; left:0; right:0; height:4px;
  background:linear-gradient(90deg,#10b981,#3b82f6,#8b5cf6);
  animation:bar-in 0.6s ease forwards; transform-origin:left; transform:scaleX(0);
}}
@keyframes bar-in {{ to{{transform:scaleX(1);}} }}

.header {{
  position:absolute; top:4px; left:0; right:0; height:52px;
  display:flex; align-items:center; padding:0 44px;
  background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.07);
  opacity:0; animation:fade-in 0.4s 0.2s ease forwards;
}}
@keyframes fade-in {{ to{{opacity:1;}} }}
.project-name {{ font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#34d399; }}
.lang-badge {{
  margin-left:auto; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3);
  color:#34d399; font-size:12px; font-weight:600; letter-spacing:1px;
  padding:4px 14px; border-radius:20px;
}}

.terminal {{
  position:absolute; top:68px; left:44px; right:44px; bottom:76px;
  background:#0d1117; border:1px solid rgba(255,255,255,0.1);
  border-radius:12px; overflow:hidden;
  opacity:0; animation:rise 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
}}
@keyframes rise {{ from{{opacity:0;transform:translateY(18px);}} to{{opacity:1;transform:translateY(0);}} }}

.term-bar {{
  height:38px; background:#161b22; border-bottom:1px solid rgba(255,255,255,0.07);
  display:flex; align-items:center; padding:0 14px; gap:8px;
}}
.dot {{ width:11px; height:11px; border-radius:50%; }}
.dot-r {{background:#ff5f56;}} .dot-y {{background:#ffbd2e;}} .dot-g {{background:#27c93f;}}
.term-title {{ margin-left:10px; font-size:12px; color:rgba(255,255,255,0.35); }}

.code-wrap {{
  padding:16px 20px; height:calc(100% - 38px); overflow:hidden; position:relative;
}}
pre {{ margin:0; }}
code.hljs {{
  background:transparent !important;
  font-size:15px !important;
  font-family:'JetBrains Mono','Fira Code','Cascadia Code',monospace !important;
  line-height:1.7 !important;
}}
.code-line {{
  display:block; opacity:0; transform:translateX(-10px);
}}
.cursor {{
  display:inline-block; width:2px; height:1.1em;
  background:#3b82f6; vertical-align:text-bottom;
  animation:blink 1s step-end infinite; margin-left:2px;
}}
@keyframes blink {{ 0%,100%{{opacity:1;}} 50%{{opacity:0;}} }}

{waveform_css}
{footer_css}
</style></head><body>
<div class="orb orb1"></div><div class="orb orb2"></div>
<div class="top-bar"></div>
<div class="header">
  <span class="project-name">{project_name}</span>
  <span class="lang-badge">{lang_label}</span>
</div>
<div class="terminal">
  <div class="term-bar">
    <div class="dot dot-r"></div><div class="dot dot-y"></div><div class="dot dot-g"></div>
    <span class="term-title">{file_label}</span>
  </div>
  <div class="code-wrap">
    <pre><code id="cb" class="{lang_class}">{code_escaped}</code></pre>
    <span class="cursor"></span>
  </div>
</div>
<div class="footer">
  <div class="progress-track"><div class="progress-fill" style="width:{progress_pct}%"></div></div>
  <div class="footer-row">
    {waveform_html}
    <div class="subtitle">{subtitle}</div>
  </div>
</div>
<script>
hljs.highlightAll();
const block = document.getElementById('cb');
const lines = block.innerHTML.split('\\n');
block.innerHTML = '';
lines.forEach((lineHtml, i) => {{
  const div = document.createElement('div');
  div.className = 'code-line';
  div.innerHTML = lineHtml + (i < lines.length-1 ? '\\n' : '');
  block.appendChild(div);
  // Web Animations API — scrubbable via document.getAnimations()
  div.animate(
    [{{opacity:0, transform:'translateX(-10px)'}}, {{opacity:1, transform:'translateX(0)'}}],
    {{duration:260, delay:500 + i*110, fill:'forwards', easing:'ease-out'}}
  );
}});
</script>
</body></html>"""


DIAGRAM_TEMPLATE = """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  width:1280px; height:720px; overflow:hidden;
  background:linear-gradient(135deg,#0f1117 0%,#1a1f35 50%,#0d1520 100%);
  font-family:'Segoe UI',system-ui,sans-serif; color:#e2e8f0;
}}
.orb {{ position:absolute; border-radius:50%; filter:blur(80px); opacity:0.12; }}
.orb1 {{ width:400px; height:400px; background:#06b6d4; top:-120px; right:-80px; }}
.orb2 {{ width:280px; height:280px; background:#8b5cf6; bottom:-60px; left:-40px; }}

.top-bar {{
  position:absolute; top:0; left:0; right:0; height:4px;
  background:linear-gradient(90deg,#06b6d4,#8b5cf6,#ec4899);
  animation:bar-in 0.6s ease forwards; transform-origin:left; transform:scaleX(0);
}}
@keyframes bar-in {{ to{{transform:scaleX(1);}} }}

.header {{
  position:absolute; top:4px; left:0; right:0; height:52px;
  display:flex; align-items:center; padding:0 44px;
  background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.07);
  opacity:0; animation:fade-in 0.4s 0.2s ease forwards;
}}
@keyframes fade-in {{ to{{opacity:1;}} }}
.project-name {{ font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#22d3ee; }}
.arch-label {{ margin-left:auto; font-size:12px; color:rgba(255,255,255,0.28); letter-spacing:1px; }}

.diagram-wrap {{
  position:absolute; top:68px; left:44px; right:44px; bottom:76px;
  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.09);
  border-radius:14px; display:flex; align-items:center; justify-content:center;
  opacity:0; animation:scale-in 0.6s 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
}}
@keyframes scale-in {{ from{{opacity:0;transform:scale(0.94);}} to{{opacity:1;transform:scale(1);}} }}

.mermaid svg {{ max-width:1100px; max-height:500px; }}

{waveform_css}
{footer_css}
</style></head><body>
<div class="orb orb1"></div><div class="orb orb2"></div>
<div class="top-bar"></div>
<div class="header">
  <span class="project-name">{project_name}</span>
  <span class="arch-label">ARCHITECTURE</span>
</div>
<div class="diagram-wrap">
  <div class="mermaid">
{mermaid_code}
  </div>
</div>
<div class="footer">
  <div class="progress-track"><div class="progress-fill" style="width:{progress_pct}%"></div></div>
  <div class="footer-row">
    {waveform_html}
    <div class="subtitle">{subtitle}</div>
  </div>
</div>
<script>
mermaid.initialize({{
  startOnLoad:true, theme:'dark',
  themeVariables:{{
    primaryColor:'#1e3a5f', primaryTextColor:'#e2e8f0',
    primaryBorderColor:'#3b82f6', lineColor:'#60a5fa',
    secondaryColor:'#1e1b4b', tertiaryColor:'#0f172a',
    background:'transparent', mainBkg:'rgba(30,58,95,0.8)',
    nodeBorder:'#3b82f6', clusterBkg:'rgba(30,27,75,0.6)',
    titleColor:'#e2e8f0', edgeLabelBackground:'rgba(15,17,23,0.8)',
    fontFamily:'system-ui,sans-serif', fontSize:'16px',
  }},
  flowchart:{{curve:'basis',padding:20}},
}});
</script>
</body></html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Music generation
# ─────────────────────────────────────────────────────────────────────────────

def _generate_ambient_music(duration_s, volume=0.07):
    """Synthesise a soft ambient pad using harmonic sine waves."""
    sr = 44100
    t  = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)

    # Cmaj7 chord spread across two octaves
    freqs = [65.41, 82.41, 98.00, 123.47,   # C2 E2 G2 B2
             130.81, 164.81, 196.00, 246.94]  # C3 E3 G3 B3
    music = np.zeros_like(t, dtype=np.float64)
    for f in freqs:
        music += np.sin(2 * np.pi * f * t) * 0.18
        music += np.sin(2 * np.pi * f * 2.0015 * t) * 0.07   # slight detune
        tremolo = 0.88 + 0.12 * np.sin(2 * np.pi * 0.25 * t)
        music *= tremolo

    # Soft high shimmer
    music += np.sin(2 * np.pi * 523.25 * t) * 0.04  # C5

    music /= np.max(np.abs(music) + 1e-9)
    music *= volume

    # Fade in/out 3 s
    fade = min(int(sr * 3), len(music) // 4)
    music[:fade]  *= np.linspace(0, 1, fade)
    music[-fade:] *= np.linspace(1, 0, fade)

    stereo = np.column_stack([music, music]).astype(np.float32)
    return AudioArrayClip(stereo, fps=sr)


# ─────────────────────────────────────────────────────────────────────────────
# Audio duration helper
# ─────────────────────────────────────────────────────────────────────────────

def _get_audio_duration(filepath):
    ffprobe = shutil.which("ffprobe")
    if ffprobe:
        try:
            r = subprocess.run(
                [ffprobe, "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", filepath],
                capture_output=True, text=True)
            return float(r.stdout.strip())
        except Exception:
            pass
    try:
        clip = AudioFileClip(filepath)
        d = clip.duration
        clip.close()
        return d
    except Exception:
        return 5.0


# ─────────────────────────────────────────────────────────────────────────────
# Nodes
# ─────────────────────────────────────────────────────────────────────────────

class LoadExistingTutorial(Node):
    def prep(self, shared):
        return {"output_dir": shared.get("output_dir", "output"),
                "project_name": shared.get("project_name")}

    def exec(self, prep_res):
        output_dir   = prep_res["output_dir"]
        project_name = prep_res["project_name"]
        if not project_name:
            print("Error: Project name required."); return []
        project_path = os.path.join(output_dir, project_name)
        if not os.path.exists(project_path):
            print(f"Error: {project_path} does not exist."); return []
        chapters = []
        for f in sorted(os.listdir(project_path)):
            if f.endswith(".md") and f != "index.md" and re.match(r"^\d+_", f):
                try:
                    chapters.append(open(os.path.join(project_path, f)).read())
                except Exception as e:
                    print(f"Error reading {f}: {e}")
        print(f"Loaded {len(chapters)} existing chapters.")
        return chapters

    def post(self, shared, prep_res, exec_res):
        shared["chapters"] = exec_res


class GenerateVideoScript(Node):
    def prep(self, shared):
        return {"chapters": shared.get("chapters", []),
                "project_name": shared.get("project_name", "Project"),
                "use_cache": shared.get("use_cache", True)}

    def exec(self, prep_res):
        chapters     = prep_res["chapters"]
        project_name = prep_res["project_name"]
        use_cache    = prep_res["use_cache"]
        print(f"Generating video script for {len(chapters)} chapters...")

        summaries = []
        for i, md in enumerate(chapters):
            ctx = "Project Introduction" if i == 0 else f"Chapter {i+1}"
            prompt = f"""Summarise this tutorial chapter into 4-5 key points for a video.
Each point must be a FULL SENTENCE — not a label.
Context: {ctx}
Content:
{md[:8000]}

Output:
- Full sentence 1
- Full sentence 2
..."""
            summaries.append(f"## Chapter {i+1}:\n{call_llm(prompt, use_cache=use_cache)}")
            print(f"  - Summarised Chapter {i+1}")

        all_summaries = "\n\n".join(summaries)

        prompt = f"""You are a professional technical video creator.
Create a visually rich 3-MINUTE video script for: {project_name}

Summaries:
{all_summaries}

RULES:
1. ~450 words of narration total.
2. 12-15 segments total including intro, transitions, and outro.
3. SEGMENT TYPES and their JSON shape:
   - intro:      {{"type":"intro","narration":"Welcome line."}}
   - slide:      {{"type":"slide","title":"Max 6 words","bullets":["Full sentence 1.","Full sentence 2.","Full sentence 3.","Full sentence 4."],"narration":"What to say."}}
   - transition: {{"type":"transition","title":"Next topic title","narration":""}}
   - code:       {{"type":"code","title":"Short label","content":"actual code (use \\\\n for newlines)","narration":"What to say."}}
   - diagram:    {{"type":"diagram","title":"Label","content":"mermaid syntax (no fences)","narration":"What to say."}}
   - outro:      {{"type":"outro","narration":"Closing line."}}

4. Structure: intro → slides/code/diagrams with 1-2 transitions → outro.
5. Include 1-2 diagrams and 1-2 code segments.
6. Each slide "bullets" array: 4 complete sentences, no labels.

CRITICAL JSON RULES:
- ALL string values on ONE line — no literal newlines inside strings.
- Use \\\\n in code content strings for line breaks.
- "bullets" is a JSON array of strings.
- Return ONLY the JSON array, no markdown.
"""
        response = call_llm(prompt, use_cache=use_cache)

        # Strip markdown fences
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            try:
                s = response.index('['); e = response.rindex(']') + 1
                response = response[s:e]
            except Exception:
                response = response.split("```")[1].split("```")[0].strip()

        try:
            segments = json.loads(response)
            return [{"chapter_index": 0, "segments": segments}]
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}. Attempting cleanup...")
            cleaned = re.sub(
                r'(?<=": ")(.*?)(?="[\s,\}])',
                lambda m: m.group(0).replace('\n', '\\n').replace('\r', ''),
                response, flags=re.DOTALL)
            try:
                return [{"chapter_index": 0, "segments": json.loads(cleaned)}]
            except Exception as e2:
                print(f"Cleanup failed: {e2}\nResponse: {response[:600]}")
                return []

    def post(self, shared, prep_res, exec_res):
        shared["video_scripts"] = exec_res


class GenerateAudio(Node):
    def prep(self, shared):
        return {"scripts": shared.get("video_scripts", []),
                "output_dir": shared.get("output_dir", "output"),
                "project_name": shared.get("project_name", "project"),
                "voice": shared.get("voice", "en-US-AriaNeural"),
                "project_name_raw": shared.get("project_name", "Project")}

    def exec(self, prep_res):
        import sys
        scripts      = prep_res["scripts"]
        output_dir   = prep_res["output_dir"]
        project_name = prep_res["project_name"]
        voice        = prep_res["voice"]
        proj_display = prep_res["project_name_raw"]

        edge_tts_bin = os.path.join(os.path.dirname(sys.executable), "edge-tts")
        if not os.path.exists(edge_tts_bin):
            edge_tts_bin = "edge-tts"

        print(f"Using Voice: {voice}")

        # Default narration for special types
        def default_narration(seg, proj):
            t = seg.get("type", "")
            if t == "intro":
                return seg.get("narration") or f"Welcome to {proj}. Let's explore how it works."
            if t == "outro":
                return seg.get("narration") or f"That's a wrap on {proj}. Thanks for watching!"
            if t == "transition":
                return ""   # silence — music fills it
            return seg.get("narration", "")

        all_audio_data = []
        for chapter_data in scripts:
            i_chap   = chapter_data["chapter_index"]
            segments = chapter_data["segments"]
            audio_dir = os.path.join(output_dir, project_name, "assets",
                                     f"chapter_{i_chap+1:02d}", "audio")
            os.makedirs(audio_dir, exist_ok=True)
            print(f"Generating audio — {len(segments)} segments...")

            audio_files, durations = [], []
            for i_seg, seg in enumerate(segments):
                text = default_narration(seg, proj_display)
                if not text.strip():
                    # transition / empty → short silence placeholder
                    audio_files.append(None)
                    durations.append(2.0)
                    continue

                fname = os.path.join(audio_dir, f"seg_{i_seg:03d}.mp3")
                cmd = [edge_tts_bin, "--text", text, "--write-media", fname, "--voice", voice]
                try:
                    subprocess.run(cmd, check=True, capture_output=True)
                    audio_files.append(fname)
                    durations.append(_get_audio_duration(fname))
                except subprocess.CalledProcessError as e:
                    print(f"  Audio error seg {i_seg}: {e}")
                    audio_files.append(None)
                    durations.append(3.0)

            all_audio_data.append({"chapter_index": i_chap,
                                   "audio_files": audio_files,
                                   "durations": durations})
        return all_audio_data

    def post(self, shared, prep_res, exec_res):
        shared["audio_assets_data"] = exec_res


class GenerateVisuals(Node):
    def prep(self, shared):
        return {"scripts":      shared.get("video_scripts", []),
                "audio_data":   shared.get("audio_assets_data", []),
                "output_dir":   shared.get("output_dir", "output"),
                "project_name": shared.get("project_name", "project")}

    def exec(self, prep_res):
        import html as html_module
        from playwright.sync_api import sync_playwright

        scripts      = prep_res["scripts"]
        audio_data   = prep_res["audio_data"]
        output_dir   = prep_res["output_dir"]
        project_name = prep_res["project_name"]

        duration_map = {a["chapter_index"]: a.get("durations", []) for a in audio_data}

        FPS          = 24
        ANIM_S       = 1.8   # animation phase length
        ANIM_FRAMES  = int(ANIM_S * FPS)
        MERMAID_WAIT = 900   # ms extra wait for mermaid render

        # ── helpers ──────────────────────────────────────────────────────────

        def fill_common(d):
            """Inject shared CSS/HTML snippets into a template dict."""
            d["waveform_css"]  = _WAVEFORM_CSS
            d["footer_css"]    = _FOOTER_CSS
            d["waveform_html"] = _WAVEFORM_HTML
            return d

        def capture(page, html_path, duration_s, images_dir, prefix, extra_wait=0):
            page.goto(f"file://{html_path}")
            page.wait_for_load_state("networkidle", timeout=12000)
            if extra_wait:
                page.wait_for_timeout(extra_wait)

            frame_paths = []
            for i in range(ANIM_FRAMES):
                t_ms = int(i * 1000 / FPS)
                page.evaluate(f"""
                    document.getAnimations().forEach(a => {{
                        try {{ a.currentTime = {t_ms}; }} catch(e) {{}}
                    }});
                """)
                p = os.path.join(images_dir, f"{prefix}_a{i:04d}.png")
                page.screenshot(path=p)
                frame_paths.append(("f", p))

            # Hold frame
            page.evaluate(f"""
                document.getAnimations().forEach(a => {{
                    try {{ a.currentTime = {int(ANIM_S*1000)}; a.pause(); }} catch(e) {{}}
                }});
            """)
            hp = os.path.join(images_dir, f"{prefix}_hold.png")
            page.screenshot(path=hp)
            hold_dur = max(0.1, duration_s - ANIM_S)
            frame_paths.append(("h", hp, hold_dur))
            return frame_paths

        def build_clip(frame_paths):
            anim_arrs, clips = [], []
            for item in frame_paths:
                if item[0] == "f":
                    anim_arrs.append(np.array(Image.open(item[1]).convert("RGB")))
                else:
                    if anim_arrs:
                        clips.append(ImageSequenceClip(anim_arrs, fps=FPS))
                        anim_arrs = []
                    arr = np.array(Image.open(item[1]).convert("RGB"))
                    hc = (ImageClip(arr).with_duration(item[2])
                          if hasattr(ImageClip, "with_duration")
                          else ImageClip(arr).set_duration(item[2]))
                    clips.append(hc)
            if anim_arrs:
                clips.append(ImageSequenceClip(anim_arrs, fps=FPS))
            if not clips: return None
            if len(clips) == 1: return clips[0]
            return concatenate_videoclips(clips, method="compose")

        def write_html(images_dir, prefix, content):
            path = os.path.abspath(os.path.join(images_dir, f"{prefix}.html"))
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return path

        def bullets_html(lines):
            parts = []
            for ln in lines:
                ln = ln.lstrip("- •*").strip() if isinstance(ln, str) else str(ln).strip()
                if not ln: continue
                esc = html_module.escape(ln)
                if ":" in esc:
                    a, b = esc.split(":", 1)
                    esc = f"<strong>{a}:</strong>{b}"
                parts.append(
                    f'<div class="bullet"><div class="bullet-dot"></div>'
                    f'<div class="bullet-text">{esc}</div></div>')
            return "\n".join(parts)

        # ── render ───────────────────────────────────────────────────────────

        all_visual_data = []

        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 720})

            for chapter_data in scripts:
                i_chap     = chapter_data["chapter_index"]
                segments   = chapter_data["segments"]
                durations  = duration_map.get(i_chap, [5.0] * len(segments))
                total_segs = len(segments)

                images_dir = os.path.join(output_dir, project_name, "assets",
                                          f"chapter_{i_chap+1:02d}", "frames")
                os.makedirs(images_dir, exist_ok=True)
                print(f"Rendering animated visuals — {total_segs} segments...")

                chapter_clips = []

                for i_seg, seg in enumerate(segments):
                    seg_type  = seg.get("type", "slide")
                    content   = seg.get("content", "")
                    title     = seg.get("title", "")
                    narration = seg.get("narration", "")
                    duration  = durations[i_seg] if i_seg < len(durations) else 5.0
                    progress  = (i_seg + 1) / total_segs
                    pct       = int(progress * 100)
                    subtitle  = narration[:150] + ("…" if len(narration) > 150 else "")
                    prefix    = f"seg_{i_seg:03d}"

                    print(f"  [{i_seg+1}/{total_segs}] {seg_type:12s} | "
                          f"{(title or content[:30])!r} | {duration:.1f}s")

                    try:
                        extra_wait = 0

                        if seg_type == "intro":
                            html = INTRO_TEMPLATE.format(**fill_common(dict(
                                project_name=html_module.escape(project_name),
                                subtitle=html_module.escape(subtitle),
                            )))

                        elif seg_type == "outro":
                            html = OUTRO_TEMPLATE.format(**fill_common(dict(
                                project_name=html_module.escape(project_name),
                                subtitle=html_module.escape(subtitle),
                            )))

                        elif seg_type == "transition":
                            html = TRANSITION_TEMPLATE.format(**fill_common(dict(
                                title=html_module.escape(title or "Next"),
                                progress_pct=pct,
                                subtitle=html_module.escape(subtitle),
                            )))

                        elif seg_type == "slide":
                            raw_bullets = seg.get("bullets", None)
                            if raw_bullets and isinstance(raw_bullets, list):
                                blist = raw_bullets
                            else:
                                blist = [l.lstrip("- •*").strip()
                                         for l in content.split("\n") if l.strip()]
                            if not title and blist:
                                title = blist[0].split(":")[0][:50]
                            html = SLIDE_TEMPLATE.format(**fill_common(dict(
                                project_name=html_module.escape(project_name),
                                seg_label=f"{i_seg+1} / {total_segs}",
                                title=html_module.escape(title),
                                bullets_html=bullets_html(blist),
                                progress_pct=pct,
                                subtitle=html_module.escape(subtitle),
                            )))

                        elif seg_type == "code":
                            lang_class, lang_label = "language-python", "Python"
                            if any(k in content for k in ["function", "const ", "let ", "=>"]):
                                lang_class, lang_label = "language-javascript", "JavaScript"
                            elif content.strip().startswith("<"):
                                lang_class, lang_label = "language-html", "HTML"
                            elif re.search(r'\bSELECT\b|\bFROM\b', content, re.I):
                                lang_class, lang_label = "language-sql", "SQL"
                            html = CODE_TEMPLATE.format(**fill_common(dict(
                                project_name=html_module.escape(project_name),
                                lang_label=lang_label,
                                lang_class=lang_class,
                                file_label=f"example.{lang_label.lower()}",
                                code_escaped=html_module.escape(content),
                                progress_pct=pct,
                                subtitle=html_module.escape(subtitle),
                            )))

                        elif seg_type == "diagram":
                            mermaid = content.replace("```mermaid","").replace("```","").strip()
                            extra_wait = MERMAID_WAIT
                            html = DIAGRAM_TEMPLATE.format(**fill_common(dict(
                                project_name=html_module.escape(project_name),
                                mermaid_code=mermaid,
                                progress_pct=pct,
                                subtitle=html_module.escape(subtitle),
                            )))

                        else:
                            html = SLIDE_TEMPLATE.format(**fill_common(dict(
                                project_name=html_module.escape(project_name),
                                seg_label=f"{i_seg+1} / {total_segs}",
                                title=html_module.escape(content[:60]),
                                bullets_html="",
                                progress_pct=pct,
                                subtitle=html_module.escape(subtitle),
                            )))

                        html_path    = write_html(images_dir, prefix, html)
                        frame_paths  = capture(page, html_path, duration,
                                               images_dir, prefix, extra_wait)
                        clip         = build_clip(frame_paths)
                        if clip is not None:
                            chapter_clips.append(clip)

                    except Exception as e:
                        print(f"  Error seg {i_seg}: {e}. Using fallback.")
                        arr = np.full((720, 1280, 3), (15, 17, 23), dtype=np.uint8)
                        fb = (ImageClip(arr).with_duration(duration)
                              if hasattr(ImageClip, "with_duration")
                              else ImageClip(arr).set_duration(duration))
                        chapter_clips.append(fb)

                all_visual_data.append({"chapter_index": i_chap, "clips": chapter_clips})

            browser.close()

        return all_visual_data

    def post(self, shared, prep_res, exec_res):
        shared["visual_assets_data"] = exec_res


class AssembleVideo(Node):
    def prep(self, shared):
        return {"audio_data":   shared.get("audio_assets_data", []),
                "visual_data":  shared.get("visual_assets_data", []),
                "output_dir":   shared.get("output_dir", "output"),
                "project_name": shared.get("project_name", "project")}

    def exec(self, prep_res):
        audio_data   = prep_res["audio_data"]
        visual_data  = prep_res["visual_data"]
        output_dir   = prep_res["output_dir"]
        project_name = prep_res["project_name"]

        def _valid_mp4(path):
            if not os.path.exists(path) or os.path.getsize(path) == 0:
                return False
            ff = shutil.which("ffprobe")
            if ff:
                r = subprocess.run(
                    [ff,"-v","error","-show_entries","format=duration",
                     "-of","default=noprint_wrappers=1:nokey=1", path],
                    capture_output=True, text=True)
                return r.returncode == 0 and bool((r.stdout or "").strip())
            return True

        def get_clips(idx):
            for v in visual_data:
                if v["chapter_index"] == idx:
                    return v.get("clips", [])
            return []

        print("Assembling final video...")
        all_clips, all_audio_clips = [], []

        for a_ch in audio_data:
            i_chap       = a_ch["chapter_index"]
            audio_files  = a_ch["audio_files"]
            visual_clips = get_clips(i_chap)

            if len(audio_files) != len(visual_clips):
                print(f"  Warning ch{i_chap+1}: audio={len(audio_files)} clips={len(visual_clips)}")

            for audio_path, vis_clip in zip(audio_files, visual_clips):
                if vis_clip is None: continue
                try:
                    if audio_path and os.path.exists(audio_path):
                        audio_clip = AudioFileClip(audio_path)
                        all_audio_clips.append(audio_clip)
                        target_dur = audio_clip.duration
                    else:
                        audio_clip = None
                        target_dur = vis_clip.duration

                    try:
                        vc = (vis_clip.with_duration(target_dur)
                              if hasattr(vis_clip, "with_duration")
                              else vis_clip.set_duration(target_dur))
                    except Exception:
                        vc = vis_clip

                    if audio_clip is not None:
                        fc = (vc.with_audio(audio_clip)
                              if hasattr(vc, "with_audio")
                              else vc.set_audio(audio_clip))
                    else:
                        fc = vc
                    all_clips.append(fc)
                except Exception as e:
                    print(f"  Clip error: {e}")

        if not all_clips:
            print("No clips to assemble."); return None

        print(f"Concatenating {len(all_clips)} clips...")
        output_path = os.path.join(output_dir, project_name, "tutorial.mp4")
        tmp_path    = output_path + f".{uuid4().hex}.tmp.mp4"

        final_video = None
        try:
            final_video = concatenate_videoclips(all_clips, method="compose")
            total_dur   = final_video.duration
            print(f"Total duration: {total_dur:.1f}s")

            # ── Background music ───────────────────────────────────────────
            print("Mixing ambient background music...")
            try:
                music_clip = _generate_ambient_music(total_dur, volume=0.07)
                if hasattr(music_clip, "with_duration"):
                    music_clip = music_clip.with_duration(total_dur)
                else:
                    music_clip = music_clip.set_duration(total_dur)

                existing_audio = final_video.audio
                if existing_audio is not None:
                    try:
                        from moviepy.audio.AudioClip import CompositeAudioClip as CAC
                    except ImportError:
                        from moviepy.editor import CompositeAudioClip as CAC
                    mixed = CAC([existing_audio, music_clip])
                    final_video = (final_video.with_audio(mixed)
                                   if hasattr(final_video, "with_audio")
                                   else final_video.set_audio(mixed))
                else:
                    final_video = (final_video.with_audio(music_clip)
                                   if hasattr(final_video, "with_audio")
                                   else final_video.set_audio(music_clip))
                print("  Background music mixed ✓")
            except Exception as e:
                print(f"  Music mix failed (video will still save): {e}")

            print(f"Writing video → {tmp_path}")
            final_video.write_videofile(
                tmp_path, fps=24, codec="libx264", audio_codec="aac",
                threads=4, logger=None)

            if not _valid_mp4(tmp_path):
                raise ValueError("Output MP4 validation failed.")

            os.replace(tmp_path, output_path)
            print(f"Video saved: {output_path}")
            return [output_path]

        finally:
            if final_video:
                try: final_video.close()
                except Exception: pass
            for c in all_clips:
                try: c.close()
                except Exception: pass
            for a in all_audio_clips:
                try: a.close()
                except Exception: pass
            if os.path.exists(tmp_path):
                try: os.remove(tmp_path)
                except Exception: pass

    def post(self, shared, prep_res, exec_res):
        shared["video_paths"] = exec_res
