import spacy
import re
import os
from typing import Optional

# ---------------------------------------------------------------------------
# Compiled Regex Patterns (compiled once at module load for performance)
# ---------------------------------------------------------------------------
EMAIL_RE    = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_RE    = re.compile(r'(\+?\d[\d\s\-().]{7,}\d)')
LINKEDIN_RE = re.compile(r'linkedin\.com/in/[\w\-]+', re.I)
GITHUB_RE   = re.compile(r'github\.com/[\w\-]+', re.I)
PORTFOLIO_RE= re.compile(r'https?://(?!linkedin|github)[\w\-./]+', re.I)
GPA_RE      = re.compile(r'(?:GPA|CGPA|CPI)[:\s]*([0-9.]+)\s*(?:/\s*([0-9.]+))?', re.I)
YEAR_RE     = re.compile(r'\b(19|20)\d{2}\b')
URL_FULL_RE = re.compile(r'https?://\S+')

# Section heading keywords
EXPERIENCE_HEADINGS = {'experience', 'work experience', 'employment', 'professional experience',
                        'work history', 'career history', 'internship', 'internships'}
EDUCATION_HEADINGS  = {'education', 'academic background', 'qualifications', 'academic qualifications'}
SKILLS_HEADINGS     = {'skills', 'technical skills', 'core competencies', 'technologies',
                        'key skills', 'expertise', 'skill set'}
PROJECT_HEADINGS    = {'projects', 'personal projects', 'academic projects', 'key projects', 'portfolio'}
CERT_HEADINGS       = {'certifications', 'certificates', 'licenses', 'awards', 'achievements'}

DEGREE_KEYWORDS = {
    'phd': 'PhD', 'ph.d': 'PhD', 'doctorate': 'PhD',
    'master': 'Masters', 'm.s': 'Masters', 'm.e': 'Masters', 'mba': 'MBA', 'm.tech': 'Masters',
    'bachelor': 'Bachelors', 'b.s': 'Bachelors', 'b.e': 'Bachelors', 'b.tech': 'Bachelors',
    'b.sc': 'Bachelors', 'be': 'Bachelors', 'bsc': 'Bachelors',
    'diploma': 'Diploma', 'associate': 'Associate',
}

DURATION_RE = re.compile(
    r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*(?:\d{4})?'
    r'\s*[-–to]+\s*'
    r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*(?:\d{4})?'
    r'|(?:\d{4})\s*[-–to]+\s*(?:\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow)'
    r'|[Pp]resent|[Cc]urrent)',
    re.I
)


class ResumeNER:
    """
    Enhanced NER for structured resume entity extraction.
    Uses spaCy for ML-based recognition + comprehensive regex fallbacks.
    CPU-optimized with the lightweight en_core_web_sm model.
    """

    def __init__(self, model_path: str = "en_core_web_sm"):
        try:
            self.nlp = spacy.load(model_path)
        except OSError:
            print(f"[NER] Model '{model_path}' not found. Running regex-only mode.")
            self.nlp = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_entities(self, text: str) -> dict:
        """Full extraction pipeline. Returns structured resume data."""
        if not text or not text.strip():
            return self._empty_schema()

        lines = [l.strip() for l in text.splitlines()]
        sections = self._split_into_sections(lines)

        result = self._empty_schema()
        result["Contact"]        = self._extract_contact(text)
        result["Name"]           = self._extract_name(text, sections.get("header", []))
        result["Skills"]         = self._extract_skills(sections.get("skills", []), text)
        result["Education"]      = self._parse_education(sections.get("education", []))
        result["Experience"]     = self._parse_experience(sections.get("experience", []))
        result["Certifications"] = self._parse_certifications(sections.get("certifications", []))
        result["Projects"]       = self._parse_projects(sections.get("projects", []))
        result["RawText"]        = text
        return result

    def extract_contact_info(self, text: str) -> dict:
        """Standalone contact extraction (kept for backward compat)."""
        return self._extract_contact(text)

    # ------------------------------------------------------------------
    # Section Splitter
    # ------------------------------------------------------------------

    def _split_into_sections(self, lines: list) -> dict:
        """Heuristically splits resume lines into named sections."""
        sections = {"header": [], "skills": [], "education": [],
                    "experience": [], "certifications": [], "projects": [], "other": []}
        current = "header"

        for line in lines:
            lower = line.lower().strip().rstrip(':').rstrip('s')  # handle plural headings
            # Remove common formatting chars
            clean = re.sub(r'[|*_#\-=]', '', lower).strip()

            if clean in EXPERIENCE_HEADINGS or lower in EXPERIENCE_HEADINGS:
                current = "experience"; continue
            elif clean in EDUCATION_HEADINGS or lower in EDUCATION_HEADINGS:
                current = "education"; continue
            elif clean in SKILLS_HEADINGS or lower in SKILLS_HEADINGS:
                current = "skills"; continue
            elif clean in PROJECT_HEADINGS or lower in PROJECT_HEADINGS:
                current = "projects"; continue
            elif clean in CERT_HEADINGS or lower in CERT_HEADINGS:
                current = "certifications"; continue
            elif re.match(r'^(summary|objective|profile|about)', lower):
                current = "header"; continue

            if line:
                sections[current].append(line)

        return sections

    # ------------------------------------------------------------------
    # Contact Extraction
    # ------------------------------------------------------------------

    def _extract_contact(self, text: str) -> dict:
        emails    = list(set(EMAIL_RE.findall(text)))
        phones    = list(set(p.strip() for p in PHONE_RE.findall(text) if len(re.sub(r'\D', '', p)) >= 7))
        linkedins = list(set(LINKEDIN_RE.findall(text)))
        githubs   = list(set(GITHUB_RE.findall(text)))

        # Portfolio: any URL that is NOT linkedin/github
        all_urls = URL_FULL_RE.findall(text)
        portfolios = [u for u in all_urls
                      if 'linkedin' not in u.lower() and 'github' not in u.lower()]

        location = self._extract_location(text)

        return {
            "Emails":     emails,
            "Phones":     phones,
            "LinkedIn":   [f"https://{l}" for l in linkedins] or [],
            "GitHub":     [f"https://{g}" for g in githubs] or [],
            "Portfolio":  portfolios[:2],
            "Location":   location,
        }

    def _extract_location(self, text: str) -> str:
        """Simple location heuristic: look for City, State/Country patterns."""
        loc_pattern = re.compile(
            r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*'
            r'([A-Z]{2}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b'
        )
        match = loc_pattern.search(text)
        return match.group(0) if match else ""

    # ------------------------------------------------------------------
    # Name Extraction
    # ------------------------------------------------------------------

    def _extract_name(self, text: str, header_lines: list) -> list:
        """Use spaCy PERSON entity from first 5 lines, fallback to first header line."""
        candidates = []

        # Prioritize spaCy if available
        if self.nlp:
            sample = "\n".join(header_lines[:8]) or text[:400]
            doc = self.nlp(sample)
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    candidates.append(ent.text.strip())

        # Fallback: first non-empty header line that looks like a name
        if not candidates and header_lines:
            first = header_lines[0].strip()
            if first and len(first.split()) <= 5 and not any(c in first for c in ['@', '/', '.']):
                candidates.append(first)

        return list(dict.fromkeys(candidates))  # deduplicate preserving order

    # ------------------------------------------------------------------
    # Skills
    # ------------------------------------------------------------------

    def _extract_skills(self, skill_lines: list, full_text: str) -> list:
        """Extract skills from the skills section, splitting on common delimiters."""
        raw_skills = []
        text_to_parse = ' '.join(skill_lines) if skill_lines else ""

        # Split on commas, pipes, bullets, semicolons, newlines
        tokens = re.split(r'[,|•·;\n/]', text_to_parse)
        for t in tokens:
            clean = t.strip().strip('-').strip('*').strip()
            if 2 <= len(clean) <= 50 and not clean.isdigit():
                raw_skills.append(clean)

        return list(dict.fromkeys(raw_skills))  # preserve order, deduplicate

    # ------------------------------------------------------------------
    # Education
    # ------------------------------------------------------------------

    def _parse_education(self, lines: list) -> list:
        """Return list of structured education dicts."""
        results = []
        current = {}
        text_block = "\n".join(lines)

        # GPA
        gpa_match = GPA_RE.search(text_block)
        gpa_value = gpa_match.group(1) if gpa_match else None
        gpa_max   = gpa_match.group(2) if gpa_match else None

        for line in lines:
            lower = line.lower()

            # Detect degree type
            degree = None
            for kw, label in DEGREE_KEYWORDS.items():
                if kw in lower:
                    degree = label
                    break

            if degree:
                if current:
                    results.append(current)
                years = YEAR_RE.findall(line)
                current = {
                    "Degree": degree,
                    "Major":  self._extract_major(line),
                    "University": "",
                    "GraduationYear": years[-1] if years else "",
                    "GPA": f"{gpa_value}/{gpa_max}" if gpa_value else (gpa_value or ""),
                    "Raw": line
                }
            elif current and not current.get("University"):
                # Next meaningful line after degree is likely the university
                stripped = line.strip()
                if stripped and len(stripped) > 5:
                    current["University"] = stripped

        if current:
            results.append(current)

        # Fallback: if no structured data found, return raw lines
        if not results and lines:
            return [{"Raw": l} for l in lines if l.strip()]
        return results

    def _extract_major(self, line: str) -> str:
        """Extract major/field of study from a degree line."""
        patterns = [
            r'(?:in|of)\s+([A-Za-z\s&]+?)(?:\s*[-,(]|\s*$)',
            r'B\.?(?:S|E|Tech|Sc)\.?\s+([A-Za-z\s]+)',
        ]
        for p in patterns:
            m = re.search(p, line, re.I)
            if m:
                return m.group(1).strip()
        return ""

    # ------------------------------------------------------------------
    # Experience
    # ------------------------------------------------------------------

    def _parse_experience(self, lines: list) -> list:
        """Return list of structured experience dicts."""
        results = []
        current = None
        responsibilities = []

        for line in lines:
            dur = DURATION_RE.search(line)
            # Detect new experience entry: has a duration or looks like a job title line
            if dur or self._is_role_line(line):
                if current:
                    current["Responsibilities"] = responsibilities
                    results.append(current)
                    responsibilities = []

                company, role = self._extract_company_role(line)
                current = {
                    "Company":          company,
                    "Role":             role,
                    "Duration":         dur.group(0) if dur else "",
                    "Responsibilities": [],
                    "Raw":              line
                }
            elif current and line.startswith(('•', '-', '*', '–', '·')) or (current and line.strip()):
                responsibilities.append(line.strip().lstrip('•-*–·').strip())

        if current:
            current["Responsibilities"] = responsibilities
            results.append(current)

        if not results and lines:
            return [{"Raw": l} for l in lines if l.strip()]
        return results

    def _is_role_line(self, line: str) -> bool:
        """Check if a line looks like a job title/company line."""
        indicators = [' at ', ' @ ', ' | ', ' - ']
        return any(ind in line for ind in indicators) and len(line) < 120

    def _extract_company_role(self, line: str) -> tuple:
        """Split a role line into (company, role)."""
        for sep in [' at ', ' @ ', ' | ', ' – ', ' - ']:
            if sep in line:
                parts = line.split(sep, 1)
                return parts[1].strip(), parts[0].strip()
        return "", line.strip()

    # ------------------------------------------------------------------
    # Certifications
    # ------------------------------------------------------------------

    def _parse_certifications(self, lines: list) -> list:
        results = []
        for line in lines:
            if not line.strip():
                continue
            clean = line.strip().lstrip('•-*').strip()
            # Try to separate cert name from issuer
            parts = re.split(r'\s*[-–|,by]\s*', clean, maxsplit=1)
            results.append({
                "Name":         parts[0].strip(),
                "Issuer":       parts[1].strip() if len(parts) > 1 else "",
                "Date":         self._extract_date(clean),
            })
        return results

    def _extract_date(self, text: str) -> str:
        months = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*'
        m = re.search(fr'({months}[\s.,]*\d{{4}}|\d{{4}})', text, re.I)
        return m.group(0) if m else ""

    # ------------------------------------------------------------------
    # Projects
    # ------------------------------------------------------------------

    def _parse_projects(self, lines: list) -> list:
        results = []
        current = None

        for line in lines:
            stripped = line.strip().lstrip('•-*').strip()
            if not stripped:
                continue

            # A project header: short line, no bullet, maybe has tech markers
            if len(stripped) < 80 and not stripped.startswith(('http', 'Used', 'Built', 'Developed')):
                if current:
                    results.append(current)
                current = {
                    "Name":        stripped,
                    "Description": "",
                    "Technologies": [],
                    "GitHub":      "",
                    "Demo":        "",
                }
            elif current:
                github = GITHUB_RE.search(stripped)
                if github:
                    current["GitHub"] = f"https://{github.group(0)}"
                demo = re.search(r'https?://\S+', stripped)
                if demo and 'github' not in demo.group(0).lower():
                    current["Demo"] = demo.group(0)
                # Extract tech from descriptions like "Built using Python, FastAPI, React"
                tech_match = re.search(r'(?:using|with|built with|tech[:\s])\s*(.+)', stripped, re.I)
                if tech_match:
                    techs = re.split(r'[,/|]', tech_match.group(1))
                    current["Technologies"] += [t.strip() for t in techs if t.strip()]
                else:
                    current["Description"] += (" " + stripped).strip()

        if current:
            results.append(current)

        if not results and lines:
            return [{"Raw": l} for l in lines if l.strip()]
        return results

    # ------------------------------------------------------------------
    # Helper
    # ------------------------------------------------------------------

    def _empty_schema(self) -> dict:
        return {
            "Name":           [],
            "Contact":        {"Emails": [], "Phones": [], "LinkedIn": [], "GitHub": [], "Portfolio": [], "Location": ""},
            "Skills":         [],
            "Education":      [],
            "Experience":     [],
            "Certifications": [],
            "Projects":       [],
            "RawText":        "",
        }
