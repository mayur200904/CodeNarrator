import os
import base64
import requests
import io
from PIL import Image
import pytest


def _render_mermaid(mermaid_code: str):
    try:
        graph_bytes = mermaid_code.encode("utf8")
        base64_bytes = base64.urlsafe_b64encode(graph_bytes)
        base64_string = base64_bytes.decode("ascii")
        
        url = f"https://mermaid.ink/img/{base64_string}?bgColor=333333"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        img = Image.open(io.BytesIO(response.content))
        return img.size
    except Exception as e:
        raise AssertionError(f"Mermaid render failed: {e}") from e


@pytest.mark.integration
@pytest.mark.skipif(
    os.getenv("RUN_MERMAID_INTEGRATION") != "1",
    reason="External Mermaid integration test is opt-in (set RUN_MERMAID_INTEGRATION=1).",
)
def test_mermaid_render_with_quoted_labels():
    fixed_content = (
        'graph TD\\n A["User/Program"] --> B{"FastAPI API"}\\n '
        'B -- "Authenticated POST Requests" --> C["Backend Workflow (Document URLs & Questions)"]\\n '
        'C --> D["Structured JSON Answer"]'
    )
    width, height = _render_mermaid(fixed_content)
    assert width > 0
    assert height > 0
