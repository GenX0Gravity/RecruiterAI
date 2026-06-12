# ============================================================
# RecruitAI Backend — Production Dockerfile
# ============================================================
FROM python:3.11-slim

# Metadata
LABEL org.opencontainers.image.title="RecruitAI Backend"
LABEL org.opencontainers.image.description="AI-powered Resume Parser & ATS Backend"
LABEL org.opencontainers.image.version="2.0.0"

WORKDIR /app

# System dependencies for spaCy, OCR, PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy NLP model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create required directories with proper permissions
RUN mkdir -p temp_uploads output && \
    chmod 755 temp_uploads output

# Create non-root user for security
RUN adduser --disabled-password --gecos "" atsuser && \
    chown -R atsuser:atsuser /app
USER atsuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
