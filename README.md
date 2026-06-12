# 🤖 RecruitAI — AI-Powered Resume Parser & ATS Platform

> **A full-stack, production-ready Applicant Tracking System with AI resume parsing, candidate scoring, job matching, and recruitment intelligence.**

[![Backend](https://img.shields.io/badge/Backend-FastAPI%202.0-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![NLP](https://img.shields.io/badge/NLP-spaCy%203.8-09A3D5?style=flat-square)](https://spacy.io)
[![AI](https://img.shields.io/badge/AI-Multi--dimensional%20Scoring-8B5CF6?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

## 🚀 Live Demo
- **Frontend App**: [https://storage.googleapis.com/recruiterai-frontend-694414640481/index.html](https://storage.googleapis.com/recruiterai-frontend-694414640481/index.html)
- **Backend API Docs**: [https://recruiterai-backend-694414640481.us-central1.run.app/docs](https://recruiterai-backend-694414640481.us-central1.run.app/docs)

---

## 📸 Screenshots

| Dashboard | Resume Upload | Candidate Insights |
|-----------|---------------|-------------------|
| Analytics, charts & pipeline | Drag-drop, bulk parse | Deep AI analysis |

---

## ✨ Features

### 🔍 Resume Parsing
- **Multi-format support**: PDF, DOCX, TXT, PNG, JPG, JPEG
- **OCR integration**: Tesseract for scanned/image-based resumes
- **NLP extraction**: Name, Email, Phone, Education, Experience, Skills, Certifications, Projects
- **Bulk parsing**: Up to 20 resumes in a single request

### 🧠 AI Intelligence
- **Multi-dimensional scoring**: Technical, Experience, Education, Project scores (0–100)
- **Deep Analysis Engine**: Strengths, weaknesses, missing skills, recommendations
- **Career Growth Predictor**: Promotion readiness, salary trajectory, IC vs Management roadmap
- **Resume Enhancer**: AI-rewritten bullets, ATS-optimized keywords, PDF/DOCX download

### 🎯 Job Matching & ATS
- **JD Matching**: TF-IDF similarity ranking across all candidates
- **Skill Gap Analyzer**: Missing skills, learning roadmap, course recommendations
- **Shortlisting Engine**: Auto-classify as Highly Recommended / Recommended / Consider / Reject
- **Candidate Ranking**: Multi-factor ranking with JD alignment
- **CRM Pipeline**: Kanban-style candidate pipeline (Applied → Hired)

### 📊 Analytics & Intelligence
- **Dashboard**: Real-time stats, charts (skill frequency, score distribution, pipeline status)
- **Market Intelligence**: Hiring trends, salary trajectories, skill demand heatmaps
- **Job Intelligence**: Aggregated job listings with filtering & search
- **Fairness & Bias Assessment**: Demographic fairness analysis with Fairlearn

### 🔧 Recruitment Tools
- **Interview AI**: Auto-generated technical, behavioral, and HR questions per candidate
- **Hiring Copilot**: Natural language recruiter chat (e.g., "Find Python devs with 3+ years")
- **Resume Verification**: Authenticity analysis, gap detection, skill inflation scoring
- **Notes, Tags, Interviews, Email Logs**: Full CRM per candidate

### 📤 Exports
- CSV (single candidate or all candidates)
- PDF Analysis Report
- Enhanced Resume PDF / DOCX

---

## 🏗️ Architecture

```
Resume Parser/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # API routes (1,300+ lines, 50+ endpoints)
│   ├── database.py             # SQLAlchemy ORM models
│   ├── data_ingestion.py       # PDF/DOCX/TXT extraction (PyMuPDF)
│   ├── ocr_processor.py        # Tesseract OCR for scanned resumes
│   ├── text_preprocessor.py    # Normalization, tokenization
│   ├── entity_recognition.py   # spaCy NER + regex patterns
│   ├── skill_normalization.py  # ESCO taxonomy mapping
│   ├── ai_scorer.py            # Multi-dimensional scoring engine
│   ├── analysis_engine.py      # Deep resume analysis
│   ├── job_matching.py         # TF-IDF JD matching
│   ├── shortlisting_engine.py  # Auto-classification
│   ├── ranking_engine.py       # Candidate ranking & filtering
│   ├── interview_generator.py  # AI question generation
│   ├── skill_gap_engine.py     # Gap analysis & roadmap
│   ├── career_growth_predictor.py  # Career trajectory prediction
│   ├── resume_enhancer.py      # Resume rewriting & PDF/DOCX gen
│   ├── copilot_engine.py       # NL recruiter chat
│   ├── resume_verifier.py      # Authenticity analysis
│   ├── fairness_checks.py      # Bias detection (Fairlearn)
│   ├── job_intelligence.py     # Job aggregation
│   ├── market_intelligence.py  # Market trend analysis
│   ├── pdf_generator.py        # ReportLab PDF reports
│   ├── output_structuring.py   # JSON/CSV export
│   ├── Dockerfile              # Production Docker image
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React 19 + Vite frontend
│   ├── src/
│   │   ├── App.jsx             # Root + sidebar navigation
│   │   ├── index.css           # Design system (700+ lines)
│   │   └── components/         # 18 feature components
│   ├── public/favicon.svg      # SVG favicon
│   ├── vercel.json             # Vercel deployment config
│   └── package.json            # Node dependencies
│
├── docker-compose.yml          # Full-stack Docker setup
├── railway.json                # Railway deployment config
├── render.yaml                 # Render.com deployment config
├── .env.example                # Environment template
└── README.md                   # This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **Tesseract OCR** (for scanned resume support)
  - Windows: [Download installer](https://github.com/UB-Mannheim/tesseract/wiki)
  - Linux: `sudo apt install tesseract-ocr`
  - Mac: `brew install tesseract`

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/resume-parser.git
cd resume-parser
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
cd backend
pip install -r requirements.txt

# Download spaCy NLP model
python -m spacy download en_core_web_sm

# Configure environment
cp ../.env.example ../.env
# Edit .env with your settings

# Start backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create frontend env (optional — defaults to localhost:8000)
echo "VITE_BACKEND_URL=http://127.0.0.1:8000" > .env.local

npm run dev
```

### 4. Open the app
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🐳 Docker Deployment

```bash
# Full stack with Docker Compose
cp .env.example .env
docker-compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
```

---

## ☁️ Cloud Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel deploy

# Set environment variable in Vercel Dashboard:
# VITE_BACKEND_URL = https://your-backend-url.railway.app
```

### Backend → Railway
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up

# Set environment variables in Railway Dashboard:
# HOST=0.0.0.0
# CORS_ORIGINS=https://your-app.vercel.app
# SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(64))">
```

### Backend → Render.com
- Connect your GitHub repo at https://render.com/new
- Render will auto-detect `render.yaml`
- Set `CORS_ORIGINS` to your Vercel frontend URL in environment variables

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check (Docker/Railway) |
| POST | `/parse` | Parse single resume |
| POST | `/bulk-parse` | Parse up to 20 resumes |
| GET | `/candidates` | Paginated candidate list |
| GET | `/candidates/{id}` | Candidate detail + analysis |
| PUT | `/candidates/{id}/status` | Update pipeline status |
| DELETE | `/candidates/{id}` | Delete candidate |
| POST | `/match` | JD matching against all candidates |
| GET | `/candidates/{id}/interview` | Generate interview questions |
| GET | `/candidates/{id}/skill-gap` | Skill gap analysis |
| GET | `/candidates/{id}/career-growth` | Career growth forecast |
| POST | `/candidates/{id}/enhance` | AI resume enhancement |
| GET | `/candidates/ranking` | Ranked candidate list |
| GET | `/analytics` | Dashboard analytics |
| GET | `/jobs` | Job listings |
| GET | `/crm/pipeline` | CRM kanban pipeline |
| POST | `/copilot/query` | Hiring copilot NL query |
| GET | `/candidates/{id}/verification` | Resume authenticity report |
| GET | `/export/{id}` | Download candidate CSV |
| GET | `/export-all` | Download all candidates CSV |
| GET | `/candidates/{id}/analysis-pdf` | Download PDF analysis report |

Full interactive documentation at: `http://localhost:8000/docs`

---

## 🔒 Security Features

- ✅ Filename sanitization (path traversal prevention)
- ✅ File extension & size validation
- ✅ Traceback never exposed to client (internal logging only)
- ✅ Security HTTP headers (X-Content-Type-Options, X-Frame-Options, CSP-ready)
- ✅ CORS restricted to configured origins
- ✅ Non-root Docker user
- ✅ Environment variable protection (`.env` in `.gitignore`)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI 0.136 + Uvicorn |
| NLP | spaCy 3.8 + en_core_web_sm |
| PDF Parsing | PyMuPDF (fitz) + PyPDF2 |
| OCR | Tesseract + pytesseract |
| AI Scoring | scikit-learn + custom rules |
| Fairness | Fairlearn |
| PDF Generation | ReportLab |
| DOCX Generation | python-docx |
| Database ORM | SQLAlchemy 2.0 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React 19 + Vite 8 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Styling | Vanilla CSS (700+ lines design system) |
| Containerization | Docker + Docker Compose |

---

## 📋 Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

**Critical for production:**
- `SECRET_KEY` — Generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`
- `CORS_ORIGINS` — Set to your actual frontend domain
- `DATABASE_URL` — Use PostgreSQL URL for production scale

---

## 🧪 Development

```bash
# Run backend with hot reload
cd backend
uvicorn main:app --reload

# Run frontend with HMR
cd frontend
npm run dev

# Build frontend for production
npm run build
npm run preview

# Lint frontend
npm run lint
```

---

## 📊 Performance

- **Frontend bundle**: ~815KB (split into React, Recharts, Icons, App chunks)
- **Backend startup**: ~3-5s (spaCy model loading)
- **Resume parse time**: 0.5–3s per resume (varies by size/format)
- **Bulk parse**: Up to 20 resumes in parallel
- **Database**: SQLite handles 10,000+ candidates efficiently

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [spaCy](https://spacy.io) — Industrial-strength NLP
- [FastAPI](https://fastapi.tiangolo.com) — Modern Python web framework
- [Fairlearn](https://fairlearn.org) — AI fairness toolkit
- [ESCO](https://esco.ec.europa.eu) — European Skills taxonomy
- [Recharts](https://recharts.org) — React chart library

---

*Built with ❤️ as an AI-powered internship project demonstrating production-ready resume parsing and ATS capabilities.*
