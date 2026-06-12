# Resume Parser Project - Agent Guide

## 🎯 Objective
Develop a lightweight AI-powered resume parser that:
- Extracts structured information (skills, education, experience, certifications).
- Runs efficiently on CPU for initial deployment.
- Can later be scaled to GPU for larger datasets and advanced models.

## ⚙️ Environment
- Platform: Antigravity
- Initial setup: CPU-based execution
- Later upgrade: GPU acceleration for deep learning models

## 📚 Research Foundation
- Start with lightweight NLP models (spaCy, DistilBERT).
- Use rule-based + ML hybrid approaches for efficiency.
- Explore OCR + layout-aware models for complex resumes.
- Plan for fairness, transparency, and multilingual support.

## 🛠️ Sequential Build Prompts

### Step 1: Data Ingestion
- Prompt: *"Load resumes in PDF/DOCX/TXT formats and extract raw text using Apache Tika or PyPDF2."*
- CPU-friendly: Use text extraction libraries before OCR.

### Step 2: OCR for Scanned Resumes
- Prompt: *"Apply Tesseract OCR to scanned resumes and convert them into text."*
- Lightweight setup: Limit resolution to balance speed and accuracy.

### Step 3: Preprocessing
- Prompt: *"Normalize text (tokenization, lemmatization, stopword removal) using spaCy."*
- CPU-friendly: Use spaCy’s small English model (`en_core_web_sm`).

### Step 4: Entity Recognition
- Prompt: *"Train/fine-tune a lightweight NER model (spaCy or DistilBERT) to detect skills, education, job titles, and certifications."*
- CPU-friendly: Start with spaCy NER, later migrate to HuggingFace models on GPU.

### Step 5: Skill Normalization
- Prompt: *"Map extracted skills to standardized taxonomies (ESCO, O*NET)."*
- CPU-friendly: Use dictionary-based mapping first, later add embeddings.

### Step 6: Output Structuring
- Prompt: *"Store parsed resume data in JSON format with fields: {name, contact, skills, education, experience, certifications}."*
- Lightweight: Simple JSON/CSV export.

### Step 7: Fairness & Explainability
- Prompt: *"Integrate bias detection using Fairlearn and provide interpretable outputs (highlight text segments linked to extracted entities)."*
- CPU-friendly: Run fairness checks on small batches.

### Step 8: Semantic Job Matching (Optional Extension)
- Prompt: *"Use Sentence-BERT embeddings to match parsed resumes with job descriptions."*
- CPU-friendly: Start with TF-IDF similarity, later upgrade to SBERT on GPU.

## 🚀 Expected Outcomes
- A CPU-efficient resume parser prototype.
- Structured JSON/CSV outputs for recruiter use.
- Benchmarks on accuracy, fairness, and multilingual adaptability.
- Scalable design for GPU migration.

## 📌 Next Steps
- Implement Step 1–3 for a working baseline.
- Add NER + skill normalization.
- Test fairness metrics.
- Prepare demo video for internship submission.
