# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for MoviePy & General Utils)
# ffmpeg: Video processing
# imagemagick: Image processing (TextClips)
# git: For cloning repos
RUN apt-get update && apt-get install -y \
    ffmpeg \
    imagemagick \
    git \
    && rm -rf /var/lib/apt/lists/*

# Fix ImageMagick security policy for TextClips (common issue)
# Allow reading/writing text across common ImageMagick config locations.
RUN set -eux; \
        found=0; \
        for p in /etc/ImageMagick-6/policy.xml /etc/ImageMagick-7/policy.xml /etc/ImageMagick*/policy.xml; do \
            if [ -f "$p" ]; then \
                sed -i 's/none/read,write/g' "$p"; \
                found=1; \
            fi; \
        done; \
        if [ "$found" -eq 0 ]; then \
            echo "No ImageMagick policy.xml found; continuing without policy patch."; \
        fi

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright's managed Chromium browser and Linux runtime deps.
# Railway will prefer this Dockerfile when present, so the browser must be
# downloaded here rather than only in nixpacks.toml.
RUN python -m playwright install --with-deps chromium

# Copy application code
COPY . .

# Create output directories
RUN mkdir -p output downloads logs temp

# Set permissions (important for some cloud runners)
RUN chmod -R 777 output downloads logs temp

# Expose port (Hugging Face Spaces defaults to 7860)
EXPOSE 7860

# Config environment variables for production
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Run the application
CMD ["python", "start.py"]
