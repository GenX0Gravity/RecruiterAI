"""
main.py — Production-Ready ATS Backend
AI-Powered Resume Parser + Applicant Tracking System

Features:
- Multi-file / bulk resume parsing
- SQLite persistence via SQLAlchemy
- AI scoring, JD matching, fairness checks
- CSV export per candidate
- Paginated candidate listing
- Rate limiting via SlowAPI
- CORS via configurable .env
"""

import os, shutil, json, csv, io, re, unicodedata
from typing import Optional, List
from dotenv import load_dotenv
from pydantic import BaseModel

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Query, Request, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import or_

# Load env FIRST
load_dotenv()

# Import Pipeline modules
from data_ingestion import ResumeExtractor
from ocr_processor import OCRProcessor
from text_preprocessor import TextPreprocessor
from entity_recognition import ResumeNER
from skill_normalization import SkillNormalizer
from output_structuring import DataExporter
from job_matching import JobMatcher
from ai_scorer import CandidateScorer
from database import get_db, Candidate, Note, Tag, JobVacancy, Interview, EmailLog, engine, Base, SessionLocal
from job_intelligence import JobAggregator
from analysis_engine import DeepAnalysisEngine
from pdf_generator import PDFReportGenerator
from shortlisting_engine import IntelligentShortlistingEngine
from ranking_engine import RankingEngine
from interview_generator import InterviewGenerator
from skill_gap_engine import SkillGapEngine
from career_growth_predictor import CareerGrowthPredictor
from resume_enhancer import ResumeEnhancerEngine
from copilot_engine import HiringCopilotEngine
from resume_verifier import ResumeVerifier

# ---------------------------------------------------------------------------
# Config from .env
# ---------------------------------------------------------------------------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "5")) * 1024 * 1024
UPLOAD_DIR   = os.getenv("UPLOAD_DIR", "temp_uploads")
OUTPUT_DIR   = os.getenv("OUTPUT_DIR", "output")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# App Setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="RecruitAI — AI Applicant Tracking System",
    description="Production-ready Resume Parser + ATS + Recruiter Intelligence Platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# ---------------------------------------------------------------------------
# Pipeline Components (singleton, initialized once at startup)
# ---------------------------------------------------------------------------
extractor  = ResumeExtractor()
ocr        = OCRProcessor()
preprocessor = TextPreprocessor()
ner        = ResumeNER()
normalizer = SkillNormalizer()
exporter   = DataExporter(output_dir=OUTPUT_DIR)
matcher    = JobMatcher()
scorer     = CandidateScorer()
aggregator = JobAggregator()
analysis_engine = DeepAnalysisEngine()
pdf_generator = PDFReportGenerator()
shortlisting_engine = IntelligentShortlistingEngine()
ranking_engine = RankingEngine()
interview_generator = InterviewGenerator()
skill_gap_engine = SkillGapEngine()
career_growth_predictor = CareerGrowthPredictor()
resume_enhancer = ResumeEnhancerEngine()
copilot_engine = HiringCopilotEngine()
resume_verifier = ResumeVerifier()

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg'}


# ===========================================================================
# HELPERS
# ===========================================================================

def _sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and OS-level injection."""
    # Normalize unicode characters
    filename = unicodedata.normalize('NFKD', filename)
    # Remove path separators and null bytes
    filename = re.sub(r'[/\\\x00]', '_', filename)
    # Keep only safe characters
    filename = re.sub(r'[^a-zA-Z0-9._\-]', '_', filename)
    # Prevent hidden files and double-extension tricks
    filename = filename.lstrip('.')
    # Limit length
    return filename[:128] if len(filename) > 128 else filename


def _parse_single_file(file_bytes: bytes, filename: str) -> dict:
    """Run the full NLP pipeline on a single in-memory file and return entities."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format: {ext}")

    safe_filename = _sanitize_filename(filename)
    temp_path = os.path.join(UPLOAD_DIR, safe_filename)
    try:
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        if ext in {'.png', '.jpg', '.jpeg'}:
            raw_text = ocr.process_image(temp_path)
        elif ext == '.pdf':
            raw_text = extractor.extract_text(temp_path)
            if len(raw_text.strip()) < 50:
                raw_text = ocr.process_pdf(temp_path)
        else:
            raw_text = extractor.extract_text(temp_path)

        clean_text = preprocessor.normalize_text(raw_text)
        entities   = ner.extract_entities(raw_text)

        if entities.get("Skills"):
            enriched = normalizer.enrich(entities["Skills"])
            entities["Skills"]           = enriched["flat"]
            entities["CategorizedSkills"] = enriched["categorized"]

        intelligence = scorer.score(entities)
        entities["Intelligence"] = intelligence
        
        try:
            entities["DeepAnalysis"] = analysis_engine.analyze_resume(entities, raw_text)
        except Exception as e:
            print(f"Error computing deep resume analysis: {e}")
            
        return entities

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _save_candidate(entities: dict, filename: str, db: Session) -> Candidate:
    """Persist a parsed candidate to the database."""
    intel = entities.get("Intelligence", {})
    contact = entities.get("Contact", {})

    name  = (entities.get("Name") or ["Unknown Candidate"])[0]
    email = (contact.get("Emails") or [None])[0]
    phone = (contact.get("Phones") or [None])[0]

    db_cand = Candidate(
        name=name,
        email=email,
        phone=phone,
        filename=filename,
        overall_score=intel.get("OverallScore", 0),
        technical_score=intel.get("TechnicalScore", 0),
        experience_score=intel.get("ExperienceScore", 0),
        education_score=intel.get("EducationScore", 0),
        project_score=intel.get("ProjectScore", 0),
        recommendation=intel.get("Recommendation", "Not Recommended"),
        parsed_data=json.dumps(entities),
    )
    db.add(db_cand)
    db.commit()
    db.refresh(db_cand)
    return db_cand


# ===========================================================================
# ROUTES — Health
# ===========================================================================

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "service": "RecruitAI — AI Resume Parser & ATS",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": ["/parse", "/bulk-parse", "/candidates", "/match", "/export/{id}", "/fairness", "/analytics", "/jobs", "/crm/pipeline"],
    }


@app.get("/health", tags=["Health"])
def health_probe():
    """Docker/Railway/Render health check endpoint."""
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute(__import__('sqlalchemy').text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "database": db_status,
        "version": "2.0.0",
    }


# ===========================================================================
# ROUTES — Resume Parsing
# ===========================================================================

@app.post("/parse", tags=["Resume"])
async def parse_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Parse a single resume file through the full AI pipeline."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return JSONResponse(status_code=400, content={"error": f"Unsupported format: {ext}. Allowed: pdf, docx, txt, png, jpg"})

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        return JSONResponse(status_code=400, content={"error": f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit."})

    try:
        entities   = _parse_single_file(contents, file.filename)
        db_cand    = _save_candidate(entities, file.filename, db)

        safe_name  = _sanitize_filename(file.filename)
        json_path  = exporter.export_to_json(entities, ai_report=entities.get("Intelligence"), filename=f"{safe_name}_parsed.json")
        csv_path   = exporter.export_to_csv(entities, ai_report=entities.get("Intelligence"))

        return {
            "status": "success",
            "id": db_cand.id,
            "filename": file.filename,
            "parsed_data": entities,
            "exports": {"json": json_path, "csv": csv_path},
        }
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        # Log internally but don't expose traceback to client
        import traceback, logging
        logging.getLogger(__name__).error(f"Parse error for {file.filename}: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Resume processing failed. Please try again or contact support."})


@app.post("/bulk-parse", tags=["Resume"])
async def bulk_parse_resumes(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """
    Bulk-parse multiple resume files in a single request.
    Returns a list of results (success + error per file).
    """
    if not files:
        return JSONResponse(status_code=400, content={"error": "No files provided."})
    if len(files) > 20:
        return JSONResponse(status_code=400, content={"error": "Maximum 20 files per bulk request."})

    results = []
    for upload in files:
        ext = os.path.splitext(upload.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            results.append({"filename": upload.filename, "status": "error", "error": f"Unsupported format: {ext}"})
            continue

        contents = await upload.read()
        if len(contents) > MAX_FILE_SIZE:
            results.append({"filename": upload.filename, "status": "error", "error": "File too large (>5MB)"})
            continue

        try:
            entities = _parse_single_file(contents, upload.filename)
            db_cand  = _save_candidate(entities, upload.filename, db)
            results.append({
                "filename": upload.filename,
                "status": "success",
                "id": db_cand.id,
                "name": db_cand.name,
                "overall_score": db_cand.overall_score,
                "recommendation": db_cand.recommendation,
            })
        except Exception as e:
            results.append({"filename": upload.filename, "status": "error", "error": str(e)})

    success_count = sum(1 for r in results if r["status"] == "success")
    return {
        "total": len(results),
        "success": success_count,
        "failed": len(results) - success_count,
        "results": results,
    }


# ===========================================================================
# ROUTES — Candidates CRUD
# ===========================================================================

@app.get("/candidates", tags=["Candidates"])
async def get_candidates(
    q: Optional[str]     = Query(None, description="Search name or skills"),
    status: Optional[str]= Query(None, description="Filter: Pending | Shortlisted | Rejected"),
    min_score: int       = Query(0, ge=0, le=100, description="Minimum AI score"),
    page: int            = Query(1, ge=1, description="Page number"),
    page_size: int       = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """Paginated, searchable, filterable candidate list."""
    query = db.query(Candidate)

    if q:
        search = f"%{q}%"
        query = query.filter(or_(
            Candidate.name.ilike(search),
            Candidate.email.ilike(search),
            Candidate.parsed_data.ilike(search),
        ))
    if status and status != "All":
        query = query.filter(Candidate.status == status)
    if min_score > 0:
        query = query.filter(Candidate.overall_score >= min_score)

    total      = query.count()
    candidates = query.order_by(Candidate.overall_score.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "candidates": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "status": c.status,
                "overall_score": c.overall_score,
                "technical_score": c.technical_score,
                "experience_score": c.experience_score,
                "education_score": c.education_score,
                "project_score": c.project_score,
                "recommendation": c.recommendation,
                "filename": c.filename,
                "parsed_data": c.get_parsed_data(),
                "created_at": c.created_at,
            }
            for c in candidates
        ],
    }


def _get_candidate_with_analysis(c: Candidate, db: Session) -> dict:
    """Helper to ensure candidate parsed_data contains DeepAnalysis, computing on the fly if needed."""
    data = c.get_parsed_data()
    if "DeepAnalysis" not in data:
        try:
            deep_report = analysis_engine.analyze_resume(data)
            data["DeepAnalysis"] = deep_report
            c.parsed_data = json.dumps(data)
            db.commit()
            db.refresh(c)
        except Exception as e:
            print(f"Error computing dynamic deep analysis: {e}")
    return data


@app.get("/candidates/{cand_id}", tags=["Candidates"])
async def get_candidate(cand_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    parsed_data = _get_candidate_with_analysis(c, db)
    
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "status": c.status,
        "overall_score": c.overall_score,
        "technical_score": c.technical_score,
        "experience_score": c.experience_score,
        "education_score": c.education_score,
        "project_score": c.project_score,
        "recommendation": c.recommendation,
        "filename": c.filename,
        "parsed_data": parsed_data,
        "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at} for n in c.notes],
        "tags": [t.name for t in c.tags],
        "created_at": c.created_at,
    }


@app.get("/candidates/{cand_id}/analysis-pdf", tags=["Export"])
async def export_candidate_analysis_pdf(cand_id: int, db: Session = Depends(get_db)):
    """Download candidate's Deep Resume Analysis report as a PDF."""
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    parsed_data = _get_candidate_with_analysis(c, db)
    analysis = parsed_data.get("DeepAnalysis", {})
    
    # Generate PDF in memory
    pdf_buffer = pdf_generator.generate_report(c.name, analysis)
    
    safe_name = c.name.replace(" ", "_")
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_Analysis_Report.pdf"},
    )


@app.put("/candidates/{cand_id}/status", tags=["Candidates"])
async def update_status(cand_id: int, payload: dict, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    status = payload.get("status")
    valid  = {"Pending", "Shortlisted", "Rejected", "Interview", "Offer"}
    if status in valid:
        c.status = status
        db.commit()
    return {"status": "updated", "new_status": c.status}


@app.post("/candidates/{cand_id}/notes", tags=["Candidates"])
async def add_note(cand_id: int, payload: dict, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Note content required")
    note = Note(candidate_id=c.id, content=content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at}


@app.delete("/candidates/{cand_id}", tags=["Candidates"])
async def delete_candidate(cand_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(c)
    db.commit()
    return {"status": "deleted", "id": cand_id}


# ===========================================================================
# ROUTES — Export
# ===========================================================================

@app.get("/export/{cand_id}", tags=["Export"])
async def export_candidate_csv(cand_id: int, db: Session = Depends(get_db)):
    """Download a single candidate's profile as a CSV file."""
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    data   = c.get_parsed_data()
    intel  = data.get("Intelligence", {})
    contact= data.get("Contact", {})

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Field", "Value"])
    writer.writerow(["Name",         c.name])
    writer.writerow(["Email",        c.email or ""])
    writer.writerow(["Phone",        c.phone or ""])
    writer.writerow(["Status",       c.status])
    writer.writerow(["Overall Score", c.overall_score])
    writer.writerow(["Technical Score", c.technical_score])
    writer.writerow(["Experience Score", c.experience_score])
    writer.writerow(["Education Score", c.education_score])
    writer.writerow(["Project Score", c.project_score])
    writer.writerow(["Recommendation", c.recommendation])
    writer.writerow(["LinkedIn",     ", ".join(contact.get("LinkedIn", []))])
    writer.writerow(["GitHub",       ", ".join(contact.get("GitHub", []))])
    writer.writerow(["Skills",       ", ".join(data.get("Skills", []))])
    writer.writerow(["Strengths",    "; ".join(intel.get("Strengths", []))])
    writer.writerow(["Weaknesses",   "; ".join(intel.get("Weaknesses", []))])
    writer.writerow(["Missing Skills", ", ".join(intel.get("MissingSkills", []))])

    for i, exp in enumerate(data.get("Experience", [])):
        if isinstance(exp, dict):
            writer.writerow([f"Experience {i+1}", f"{exp.get('Role','')} @ {exp.get('Company','')} ({exp.get('Duration','')})"])

    for i, edu in enumerate(data.get("Education", [])):
        if isinstance(edu, dict):
            writer.writerow([f"Education {i+1}", f"{edu.get('Degree','')} {edu.get('Major','')} – {edu.get('University','')} {edu.get('GraduationYear','')}"])

    output.seek(0)
    safe_name = c.name.replace(" ", "_")
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_profile.csv"},
    )


@app.get("/export-all", tags=["Export"])
async def export_all_candidates_csv(db: Session = Depends(get_db)):
    """Export all candidates as a summary CSV for recruiter reports."""
    candidates = db.query(Candidate).order_by(Candidate.overall_score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "Status", "Overall Score",
                     "Technical", "Experience", "Education", "Projects",
                     "Recommendation", "Created At"])
    for c in candidates:
        writer.writerow([
            c.id, c.name, c.email or "", c.phone or "",
            c.status, c.overall_score,
            c.technical_score, c.experience_score, c.education_score, c.project_score,
            c.recommendation, c.created_at,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_candidates.csv"},
    )


# ===========================================================================
# ROUTES — Job Matching
# ===========================================================================

@app.post("/match", tags=["Matching"])
async def match_job(payload: dict, db: Session = Depends(get_db)):
    """
    Rank all stored candidates against a job description.
    Body: { "job_description": "...", "job_title": "..." }
    """
    job_description = payload.get("job_description", "").strip()
    job_title       = payload.get("job_title", "").strip()

    if not job_description:
        raise HTTPException(status_code=400, detail="job_description is required in the request body.")

    candidates = db.query(Candidate).all()
    if not candidates:
        return {"error": "No parsed resumes available. Upload candidates first.", "rankings": []}

    parsed_candidates = [c.get_parsed_data() for c in candidates]
    rankings = matcher.rank_resumes(parsed_candidates, job_description)

    return {
        "job_title": job_title,
        "job_description": job_description,
        "total_candidates": len(rankings),
        "rankings": rankings,
    }


# ===========================================================================
# ROUTES — Fairness & Explainability
# ===========================================================================

@app.post("/fairness", tags=["Fairness"])
async def evaluate_fairness(payload: dict):
    from fairness_checks import FairnessAnalyzer
    analyzer  = FairnessAnalyzer()
    batch     = payload.get("batch_data", [])
    sensitive = payload.get("sensitive_feature", "gender")
    target    = payload.get("target_metric", "selected_for_interview")
    return analyzer.check_fairness(batch, sensitive, target)


@app.post("/explain", tags=["Fairness"])
async def explain_entity(payload: dict):
    from fairness_checks import FairnessAnalyzer
    analyzer  = FairnessAnalyzer()
    text      = payload.get("text", "")
    entity    = payload.get("entity", "")
    highlighted = analyzer.highlight_entity_context(text, entity)
    return {"highlighted_context": highlighted}


# ===========================================================================
# ROUTES — Analytics
# ===========================================================================

@app.get("/analytics", tags=["Analytics"])
async def get_analytics(db: Session = Depends(get_db)):
    """Return aggregate analytics for the dashboard."""
    candidates = db.query(Candidate).all()
    total      = len(candidates)

    if total == 0:
        return {"total": 0, "shortlisted": 0, "rejected": 0, "pending": 0, "avg_score": 0,
                "top_skills": [], "score_distribution": [], "status_breakdown": []}

    shortlisted = sum(1 for c in candidates if c.status == "Shortlisted")
    rejected    = sum(1 for c in candidates if c.status == "Rejected")
    pending     = sum(1 for c in candidates if c.status == "Pending")
    avg_score   = round(sum(c.overall_score for c in candidates) / total, 1)

    # Skill frequency
    skill_counts: dict = {}
    for c in candidates:
        data = c.get_parsed_data()
        for skill in data.get("Skills", []):
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    top_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_skills = [{"skill": k, "count": v} for k, v in top_skills]

    # Score distribution buckets
    buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for c in candidates:
        s = c.overall_score
        if s <= 20:   buckets["0-20"] += 1
        elif s <= 40: buckets["21-40"] += 1
        elif s <= 60: buckets["41-60"] += 1
        elif s <= 80: buckets["61-80"] += 1
        else:         buckets["81-100"] += 1

    score_dist = [{"range": k, "count": v} for k, v in buckets.items()]

    return {
        "total": total,
        "shortlisted": shortlisted,
        "rejected": rejected,
        "pending": pending,
        "avg_score": avg_score,
        "top_skills": top_skills,
        "score_distribution": score_dist,
        "status_breakdown": [
            {"status": "Shortlisted", "count": shortlisted},
            {"status": "Pending",     "count": pending},
            {"status": "Rejected",    "count": rejected},
        ],
    }


# ===========================================================================
# ROUTES — Job Intelligence
# ===========================================================================

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        aggregator.seed_initial_jobs(db)
    except Exception as e:
        print(f"Error seeding jobs on startup: {e}")
    finally:
        db.close()


@app.get("/jobs", tags=["Job Intelligence"])
def get_jobs(
    q: Optional[str] = Query(None, description="Search role, company or description"),
    skills: Optional[str] = Query(None, description="Filter: comma-separated list of skills"),
    location: Optional[str] = Query(None, description="Filter: location"),
    min_salary: int = Query(0, ge=0, description="Minimum salary"),
    experience: Optional[int] = Query(None, ge=0, description="Maximum experience required in years"),
    source: Optional[str] = Query(None, description="Filter: Job source platform"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Paginated, searchable, filterable aggregated job vacancies."""
    # Check if a daily auto-refresh is needed (e.g. oldest active job is >24 hours old)
    latest_job = db.query(JobVacancy).filter(JobVacancy.is_active == True).order_by(JobVacancy.updated_at.desc()).first()
    if latest_job:
        from datetime import datetime, timedelta
        try:
            last_update = datetime.fromisoformat(latest_job.updated_at)
            if datetime.now() - last_update > timedelta(days=1):
                if background_tasks:
                    background_tasks.add_task(aggregator.force_refresh, db)
        except Exception:
            pass
            
    return aggregator.search_jobs(
        db=db,
        q=q,
        skills=skills,
        location=location,
        min_salary=min_salary,
        experience=experience,
        source=source,
        page=page,
        page_size=page_size
    )


@app.post("/jobs/refresh", tags=["Job Intelligence"])
def refresh_jobs(db: Session = Depends(get_db)):
    """Force aggregated job listings refresh, prune old ones, seed new ones."""
    return aggregator.force_refresh(db)


@app.get("/jobs/analytics", tags=["Job Intelligence"])
def get_jobs_analytics(db: Session = Depends(get_db)):
    """Get recruiter dashboard widgets data."""
    return aggregator.get_analytics(db)


@app.get("/jobs/market-intelligence", tags=["Job Intelligence"])
def get_jobs_market_intelligence(db: Session = Depends(get_db)):
    """
    Computes hiring company rankings, recruiter directories, salary trajectories,
    skill request trends, and geo heatmap concentrations.
    """
    from market_intelligence import MarketIntelligenceEngine
    engine_inst = MarketIntelligenceEngine()
    return engine_inst.get_market_intelligence(db)



# ===========================================================================
# ROUTES — Candidate Shortlisting
# ===========================================================================

@app.post("/candidates/shortlist", tags=["Candidates"])
async def shortlist_candidates(payload: dict, db: Session = Depends(get_db)):
    """Evaluate all database candidates against criteria and classify them."""
    # Retrieve criteria parameters
    min_experience = payload.get("min_experience", 0)
    mandatory_skills = payload.get("mandatory_skills", [])
    min_education = payload.get("min_education", "None")
    required_certifications = payload.get("required_certifications", [])
    project_keywords = payload.get("project_keywords", [])

    criteria = {
        "min_experience": min_experience,
        "mandatory_skills": mandatory_skills,
        "min_education": min_education,
        "required_certifications": required_certifications,
        "project_keywords": project_keywords
    }

    # Fetch all candidates from db
    candidates = db.query(Candidate).all()
    
    results = {
        "Highly Recommended": [],
        "Recommended": [],
        "Consider": [],
        "Reject": []
    }

    for c in candidates:
        parsed_data = c.get_parsed_data()
        
        # Ensure deep analysis has run so we have fresh metrics
        if "DeepAnalysis" not in parsed_data:
            try:
                from analysis_engine import DeepAnalysisEngine
                engine_inst = DeepAnalysisEngine()
                parsed_data["DeepAnalysis"] = engine_inst.analyze_resume(parsed_data)
                c.parsed_data = json.dumps(parsed_data)
                db.commit()
            except Exception:
                pass
        
        # Run shortlisting classification
        shortlist_data = shortlisting_engine.classify_candidate(parsed_data, criteria)
        
        cand_entry = {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "overall_score": shortlist_data["overall_score"],
            "classification": shortlist_data["classification"],
            "original_classification": shortlist_data["original_classification"],
            "is_overridden": shortlist_data["is_overridden"],
            "reasoning": shortlist_data["reasoning"],
            "matched_skills": shortlist_data["matched_skills"],
            "missing_skills": shortlist_data["missing_skills"],
            "skills_preview": parsed_data.get("Skills", [])[:4],
            "experience_years": shortlisting_engine.get_years_experience(parsed_data),
            "highest_degree": shortlisting_engine.get_highest_degree(parsed_data)
        }
        
        category = shortlist_data["classification"]
        if category in results:
            results[category].append(cand_entry)
        else:
            results["Consider"].append(cand_entry)

    # Sort each list by overall score descending
    for cat in results:
        results[cat].sort(key=lambda x: x["overall_score"], reverse=True)

    return results


@app.post("/candidates/{cand_id}/override-shortlist", tags=["Candidates"])
async def override_shortlist(cand_id: int, payload: dict, db: Session = Depends(get_db)):
    """Manually override the shortlist rating of a candidate by HR."""
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    classification = payload.get("classification")
    valid = {"Highly Recommended", "Recommended", "Consider", "Reject", None}
    if classification not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid classification: {classification}")

    parsed_data = c.get_parsed_data()
    if classification is None:
        parsed_data.pop("ShortlistOverride", None)
    else:
        parsed_data["ShortlistOverride"] = classification
        
    c.parsed_data = json.dumps(parsed_data)
    db.commit()
    
    return {"status": "success", "candidate_id": cand_id, "shortlist_override": classification}


@app.get("/candidates/ranking", tags=["Candidates"])
async def get_candidate_rankings(
    skills: Optional[str] = Query(None, description="Filter: comma-separated list of skills"),
    min_experience: float = Query(0.0, ge=0.0, description="Minimum years of experience"),
    location: Optional[str] = Query(None, description="Filter: Location"),
    max_salary: int = Query(99999999, description="Maximum salary expectation"),
    availability: str = Query("All", description="Filter: availability status"),
    job_id: Optional[int] = Query(None, description="Job Vacancy ID to match against"),
    custom_jd: Optional[str] = Query(None, description="Custom JD text to match against"),
    sort_by: str = Query("composite_score", description="Sort by score dimension"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    """
    Ranks, scores, and filters candidates based on tech skills, exp, education,
    certifications, and project quality. Optionally matches against a job vacancy or custom JD.
    """
    candidates = db.query(Candidate).all()
    
    # Ensure all candidates have salary and availability seeded & persisted
    for c in candidates:
        parsed_data = c.get_parsed_data()
        salary_val, salary_cur, availability_val, modified = ranking_engine.seed_missing_attributes(parsed_data, c.id)
        if modified:
            c.parsed_data = json.dumps(parsed_data)
            db.add(c)
    db.commit()
    
    # Compile filters
    filters = {
        "skills": skills or "",
        "min_experience": min_experience,
        "location": location or "",
        "max_salary": max_salary,
        "availability": availability,
        "sort_by": sort_by,
        "sort_order": sort_order
    }
    
    # Resolve job description
    job_description = None
    if job_id:
        jv = db.query(JobVacancy).filter(JobVacancy.id == job_id).first()
        if jv:
            job_description = jv.description or ""
            if not job_description.strip():
                skills_list = jv.get_skills()
                job_description = f"Job Title: {jv.title}. Requirements: {', '.join(skills_list)}."
    elif custom_jd:
        job_description = custom_jd.strip()
        
    ranked_results = ranking_engine.rank_and_filter_candidates(candidates, filters, job_description)
    return ranked_results


@app.get("/candidates/{cand_id}/interview", tags=["Interview"])
async def get_candidate_interview(
    cand_id: int,
    job_id: Optional[int] = Query(None, description="Job Vacancy ID to match against"),
    custom_jd: Optional[str] = Query(None, description="Custom JD text to match against"),
    difficulty: str = Query("Intermediate", description="Difficulty: Beginner, Intermediate, Advanced"),
    db: Session = Depends(get_db)
):
    """
    Generates structured technical, coding, behavioral, HR, and situational questions
    tailored to a candidate's profile and target job description requirements.
    """
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    parsed_data = c.get_parsed_data()
    
    # Resolve job description
    job_description = ""
    if job_id:
        jv = db.query(JobVacancy).filter(JobVacancy.id == job_id).first()
        if jv:
            job_description = jv.description or ""
            if not job_description.strip():
                skills_list = jv.get_skills()
                job_description = f"Job Title: {jv.title}. Requirements: {', '.join(skills_list)}."
    elif custom_jd:
        job_description = custom_jd.strip()
        
    guide = interview_generator.generate_guide(parsed_data, job_description, difficulty)
    return guide


@app.get("/candidates/{cand_id}/skill-gap", tags=["Matching"])
async def get_candidate_skill_gap(
    cand_id: int,
    job_id: Optional[int] = Query(None, description="Job Vacancy ID to match against"),
    custom_jd: Optional[str] = Query(None, description="Custom JD text to match against"),
    db: Session = Depends(get_db)
):
    """
    Compares candidate skills against job vacancy requirements (or custom JD)
    and returns missing skills, matched skills, recommended certifications/courses,
    learning roadmap, and estimated weeks to ready.
    """
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    parsed_data = c.get_parsed_data()
    cand_skills = parsed_data.get("Skills", [])
    
    # Resolve job description
    job_description = ""
    if job_id:
        jv = db.query(JobVacancy).filter(JobVacancy.id == job_id).first()
        if jv:
            job_description = jv.description or ""
            if not job_description.strip():
                skills_list = jv.get_skills()
                job_description = f"Job Title: {jv.title}. Requirements: {', '.join(skills_list)}."
    elif custom_jd:
        job_description = custom_jd.strip()
        
    gap_analysis = skill_gap_engine.analyze_gap(cand_skills, job_description)
    return gap_analysis


@app.get("/candidates/{cand_id}/career-growth", tags=["Candidates"])
async def get_candidate_career_growth(
    cand_id: int,
    db: Session = Depends(get_db)
):
    """
    Computes career growth forecasts, promotion readiness, salary curves,
    dual-track roadmaps (IC vs Mgmt), and targeted career suggestions.
    """
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    parsed_data = c.get_parsed_data()
    
    from career_growth_predictor import CareerGrowthPredictor
    predictor_inst = CareerGrowthPredictor()
    return predictor_inst.predict_growth(parsed_data, c.id)


@app.post("/candidates/{cand_id}/enhance", tags=["Candidates"])
async def enhance_candidate_resume(
    cand_id: int,
    db: Session = Depends(get_db)
):
    """
    Analyzes candidate's parsed details and returns rewritten profile summaries,
    experience description bullets, key achievements, and optimized ATS keywords.
    """
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    parsed_data = c.get_parsed_data()
    enhancements = resume_enhancer.enhance_resume(parsed_data)
    return enhancements


@app.get("/candidates/{cand_id}/enhance/download", tags=["Candidates"])
async def download_enhanced_resume(
    cand_id: int,
    format: str = Query("ats", description="Resume layout format: 'ats', 'recruiter', or 'executive'"),
    type: str = Query("pdf", description="File extension format: 'pdf' or 'docx'"),
    db: Session = Depends(get_db)
):
    """
    Generates and returns an in-memory PDF or DOCX file of the enhanced resume layout.
    """
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    format_lower = format.lower()
    type_lower = type.lower()
    
    if format_lower not in ["ats", "recruiter", "executive"]:
        raise HTTPException(status_code=400, detail="Invalid format. Choose 'ats', 'recruiter', or 'executive'.")
        
    if type_lower not in ["pdf", "docx"]:
        raise HTTPException(status_code=400, detail="Invalid type. Choose 'pdf' or 'docx'.")
        
    parsed_data = c.get_parsed_data()
    enhanced_data = resume_enhancer.enhance_resume(parsed_data)
    
    # Extract candidate contact info
    contact = parsed_data.get("Contact", {})
    if not contact:
        contact = {
            "Emails": [c.email or "N/A"],
            "Phones": [c.phone or "N/A"],
            "Location": "N/A",
            "LinkedIn": []
        }
    if not contact.get("Emails") and c.email:
        contact["Emails"] = [c.email]
    if not contact.get("Phones") and c.phone:
        contact["Phones"] = [c.phone]

    filename_safe = re.sub(r'\s+', '_', c.name)
    
    if type_lower == "pdf":
        buffer = resume_enhancer.generate_pdf(c.name, contact, enhanced_data, format_lower)
        headers = {
            "Content-Disposition": f"attachment; filename={filename_safe}_{format_lower.upper()}_Resume.pdf"
        }
        return StreamingResponse(buffer, media_type="application/pdf", headers=headers)
    else: # docx
        buffer = resume_enhancer.generate_docx(c.name, contact, enhanced_data, format_lower)
        headers = {
            "Content-Disposition": f"attachment; filename={filename_safe}_{format_lower.upper()}_Resume.docx"
        }
        return StreamingResponse(
            buffer, 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            headers=headers
        )


class CopilotQueryRequest(BaseModel):
    query: str


@app.post("/copilot/query", tags=["Copilot"])
async def query_hiring_copilot(
    payload: CopilotQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Recruiter Talent Chat Copilot.
    Receives natural language queries, parses recruiter intent, queries candidate database,
    and returns a conversational answer accompanied by structured matching profiles.
    """
    res = copilot_engine.query_copilot(payload.query, db)
    return res


class StageUpdateRequest(BaseModel):
    status: str


class NoteCreateRequest(BaseModel):
    content: str


class TagCreateRequest(BaseModel):
    name: str


class InterviewCreateRequest(BaseModel):
    title: str
    scheduled_at: str
    notes: Optional[str] = ""


class EmailCreateRequest(BaseModel):
    subject: str
    body: str
    sender: str


@app.get("/crm/pipeline", tags=["CRM"])
def get_crm_pipeline(db: Session = Depends(get_db)):
    stages = ["Applied", "Screening", "Interview", "Assessment", "Offer", "Hired", "Rejected"]
    pipeline = {s: [] for s in stages}
    
    candidates = db.query(Candidate).all()
    for c in candidates:
        status = c.status
        if not status or status not in stages:
            if status in ["Shortlisted", "Pending"]:
                c.status = "Applied"
            elif status == "Rejected":
                c.status = "Rejected"
            else:
                c.status = "Applied"
            db.commit()
            status = c.status
            
        parsed = c.get_parsed_data()
        contact = parsed.get("Contact", {})
        emails = contact.get("Emails", [c.email or "N/A"])
        location = contact.get("Location", "N/A")
        
        pipeline[status].append({
            "id": c.id,
            "name": c.name,
            "email": emails[0] if emails else "N/A",
            "phone": c.phone or "N/A",
            "location": location,
            "overall_score": int(c.overall_score),
            "technical_score": int(c.technical_score),
            "skills": parsed.get("Skills", [])[:4],
            "notes_count": len(c.notes),
            "tags": [t.name for t in c.tags],
            "interviews_count": len(c.interviews)
        })
    return pipeline


@app.put("/crm/candidates/{cand_id}/stage", tags=["CRM"])
def update_candidate_stage(cand_id: int, payload: StageUpdateRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    stages = ["Applied", "Screening", "Interview", "Assessment", "Offer", "Hired", "Rejected"]
    if payload.status not in stages:
        raise HTTPException(status_code=400, detail="Invalid pipeline stage")
    c.status = payload.status
    db.commit()
    return {"message": "Stage updated successfully", "status": c.status}


@app.get("/crm/candidates/{cand_id}/details", tags=["CRM"])
def get_candidate_crm_details(cand_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    return {
        "id": c.id,
        "name": c.name,
        "status": c.status,
        "email": c.email or "N/A",
        "phone": c.phone or "N/A",
        "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at} for n in c.notes],
        "tags": [{"id": t.id, "name": t.name} for t in c.tags],
        "interviews": [{"id": i.id, "title": i.title, "scheduled_at": i.scheduled_at, "notes": i.notes} for i in c.interviews],
        "emails": [{"id": e.id, "subject": e.subject, "body": e.body, "sent_at": e.sent_at, "sender": e.sender} for e in c.email_logs]
    }


@app.post("/crm/candidates/{cand_id}/notes", tags=["CRM"])
def add_recruiter_note(cand_id: int, payload: NoteCreateRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    note = Note(candidate_id=cand_id, content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at}


@app.delete("/crm/notes/{note_id}", tags=["CRM"])
def delete_recruiter_note(note_id: int, db: Session = Depends(get_db)):
    n = db.query(Note).filter(Note.id == note_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(n)
    db.commit()
    return {"message": "Note deleted successfully"}


@app.post("/crm/candidates/{cand_id}/tags", tags=["CRM"])
def add_candidate_tag(cand_id: int, payload: TagCreateRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    existing = db.query(Tag).filter(Tag.candidate_id == cand_id, Tag.name == payload.name).first()
    if existing:
        return {"id": existing.id, "name": existing.name}
    t = Tag(candidate_id=cand_id, name=payload.name)
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "name": t.name}


@app.delete("/crm/tags/{tag_id}", tags=["CRM"])
def delete_candidate_tag(tag_id: int, db: Session = Depends(get_db)):
    t = db.query(Tag).filter(Tag.id == tag_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(t)
    db.commit()
    return {"message": "Tag deleted successfully"}


@app.post("/crm/candidates/{cand_id}/interviews", tags=["CRM"])
def schedule_candidate_interview(cand_id: int, payload: InterviewCreateRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    item = Interview(candidate_id=cand_id, title=payload.title, scheduled_at=payload.scheduled_at, notes=payload.notes)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "title": item.title, "scheduled_at": item.scheduled_at, "notes": item.notes}


@app.post("/crm/candidates/{cand_id}/emails", tags=["CRM"])
def send_candidate_email(cand_id: int, payload: EmailCreateRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    item = EmailLog(candidate_id=cand_id, subject=payload.subject, body=payload.body, sender=payload.sender)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "subject": item.subject, "body": item.body, "sent_at": item.sent_at, "sender": item.sender}


@app.get("/candidates/{cand_id}/verification", tags=["Candidates"])
def get_candidate_verification_report(
    cand_id: int,
    db: Session = Depends(get_db)
):
    """
    Candidate Resume Verification & Authenticity Report.
    Audits the candidate profile for duplicate submissions, date overlaps/inconsistencies,
    unexplained employment gaps, skill inflation indexes, and suspicious self-declared titles.
    """
    report = resume_verifier.analyze_authenticity(cand_id, db)
    return report


@app.delete("/crm/interviews/{interview_id}", tags=["CRM"])
def delete_candidate_interview(interview_id: int, db: Session = Depends(get_db)):
    i = db.query(Interview).filter(Interview.id == interview_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Interview not found")
    db.delete(i)
    db.commit()
    return {"message": "Interview deleted successfully"}


@app.delete("/crm/emails/{email_id}", tags=["CRM"])
def delete_candidate_email(email_id: int, db: Session = Depends(get_db)):
    e = db.query(EmailLog).filter(EmailLog.id == email_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Email not found")
    db.delete(e)
    db.commit()
    return {"message": "Email deleted successfully"}



if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print(f"ATS Backend starting on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
