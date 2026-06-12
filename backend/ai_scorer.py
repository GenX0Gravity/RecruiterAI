"""
ai_scorer.py — CPU-efficient Candidate Intelligence Scoring Engine

Produces a multi-dimensional candidate score (0-100) using rule-based
heuristics that run entirely on CPU without any LLM dependency.
Architecture is modular so a GPT/LLM layer can replace individual
scoring methods in future upgrades.
"""

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Skill taxonomy weights (category → score contribution per skill, max cap)
# ---------------------------------------------------------------------------
CATEGORY_WEIGHTS = {
    "Programming Languages": 3.5,
    "Frameworks":            3.0,
    "Databases":             2.5,
    "Cloud Platforms":       3.0,
    "DevOps Tools":          2.5,
    "AI/ML Skills":          3.5,
    "Soft Skills":           1.5,
    "Other":                 1.0,
}

DEGREE_TIER = {
    "PhD": 100, "Masters": 85, "MBA": 80,
    "Bachelors": 70, "Diploma": 50, "Associate": 45,
}

SENIORITY_KEYWORDS = {
    "intern": 0, "junior": 20, "associate": 30,
    "mid": 50, "senior": 70, "lead": 80,
    "principal": 85, "staff": 85, "architect": 90,
    "director": 90, "vp": 95, "head": 90, "cto": 100, "ceo": 100,
}

RECOMMENDATION_THRESHOLDS = [
    (80, "Highly Recommended", "accent-green"),
    (60, "Recommended",        "accent-blue"),
    (40, "Consider",           "accent-yellow"),
    (0,  "Not Recommended",    "accent-red"),
]


class CandidateScorer:
    """
    Generates a structured intelligence report for a parsed candidate.
    All methods operate on the structured dict returned by ResumeNER.
    """

    def score(self, parsed_data: dict, job_keywords: list = None) -> dict:
        """
        Master scoring method. Returns the full intelligence report.

        Args:
            parsed_data:   Output dict from ResumeNER.extract_entities()
            job_keywords:  Optional list of required skill strings from JD

        Returns:
            dict with scores, recommendation, strengths, weaknesses, gaps
        """
        technical_score  = self._score_technical(parsed_data)
        experience_score = self._score_experience(parsed_data)
        education_score  = self._score_education(parsed_data)
        project_score    = self._score_projects(parsed_data)

        # Weighted overall (technical + exp most important for engineering roles)
        overall = round(
            technical_score  * 0.35 +
            experience_score * 0.30 +
            education_score  * 0.20 +
            project_score    * 0.15
        )
        overall = min(100, max(0, overall))

        recommendation, rec_color = self._get_recommendation(overall)
        strengths, weaknesses     = self._analyze_profile(parsed_data, technical_score,
                                                           experience_score, education_score)
        missing_skills = self._find_missing_skills(parsed_data, job_keywords or [])
        suggestions    = self._generate_suggestions(parsed_data, weaknesses, missing_skills)

        return {
            "OverallScore":      overall,
            "TechnicalScore":    round(technical_score),
            "ExperienceScore":   round(experience_score),
            "EducationScore":    round(education_score),
            "ProjectScore":      round(project_score),
            "Recommendation":    recommendation,
            "RecommendationColor": rec_color,
            "Strengths":         strengths,
            "Weaknesses":        weaknesses,
            "MissingSkills":     missing_skills,
            "Suggestions":       suggestions,
        }

    # ------------------------------------------------------------------
    # Technical Score  (0–100)
    # ------------------------------------------------------------------

    def _score_technical(self, data: dict) -> float:
        categorized = data.get("CategorizedSkills", {})
        flat_skills  = data.get("Skills", [])

        if categorized:
            total = 0
            for category, skills in categorized.items():
                weight = CATEGORY_WEIGHTS.get(category, 1.0)
                total += min(len(skills) * weight, 25)  # cap per category
            return min(total, 100)

        # Fallback: flat skill list
        return min(len(flat_skills) * 4, 100)

    # ------------------------------------------------------------------
    # Experience Score  (0–100)
    # ------------------------------------------------------------------

    def _score_experience(self, data: dict) -> float:
        experience = data.get("Experience", [])
        if not experience:
            return 0

        total_months = 0
        seniority_bonus = 0

        for exp in experience:
            if isinstance(exp, dict):
                duration = exp.get("Duration", "")
                role_raw = (exp.get("Role", "") + " " + exp.get("Company", "")).lower()
            else:
                duration = str(exp)
                role_raw = str(exp).lower()

            total_months += self._parse_months(duration)
            for kw, bonus in SENIORITY_KEYWORDS.items():
                if kw in role_raw:
                    seniority_bonus = max(seniority_bonus, bonus)

        years = total_months / 12
        # Score: 0 yrs=0, 1yr=30, 3yrs=60, 5yrs=80, 8+yrs=100
        if years <= 0:      base = 0
        elif years <= 1:    base = int(years * 30)
        elif years <= 3:    base = 30 + int((years - 1) * 15)
        elif years <= 5:    base = 60 + int((years - 3) * 10)
        elif years <= 8:    base = 80 + int((years - 5) * 4)
        else:               base = 92

        # Blend base years score with seniority
        return min((base * 0.65 + seniority_bonus * 0.35), 100)

    def _parse_months(self, duration: str) -> int:
        """Estimate months from a duration string like '2020 - 2022' or 'Jan 2021 - Present'."""
        if not duration:
            return 0

        years_found  = re.findall(r'\b(20\d{2}|19\d{2})\b', duration)
        is_present   = bool(re.search(r'present|current|now', duration, re.I))

        import datetime
        current_year = datetime.datetime.now().year

        if len(years_found) >= 2:
            return (int(years_found[-1]) - int(years_found[0])) * 12
        elif len(years_found) == 1 and is_present:
            return (current_year - int(years_found[0])) * 12
        elif is_present:
            return 12  # assume 1 year if "present" with no start year
        return 12       # default: assume 1 year per entry

    # ------------------------------------------------------------------
    # Education Score  (0–100)
    # ------------------------------------------------------------------

    def _score_education(self, data: dict) -> float:
        education = data.get("Education", [])
        if not education:
            return 30  # slight base score if unknown

        best_score = 0
        for edu in education:
            if isinstance(edu, dict):
                degree = edu.get("Degree", "")
                gpa_str = edu.get("GPA", "")
            else:
                degree = str(edu)
                gpa_str = ""

            degree_score = DEGREE_TIER.get(degree, 30)

            # GPA bonus: up to 10 points
            gpa_bonus = 0
            gpa_match = re.search(r'([0-9.]+)(?:/([0-9.]+))?', gpa_str)
            if gpa_match:
                val = float(gpa_match.group(1))
                scale = float(gpa_match.group(2)) if gpa_match.group(2) else 4.0
                normalized = val / scale
                gpa_bonus = int(normalized * 10)

            best_score = max(best_score, degree_score + gpa_bonus)

        return min(best_score, 100)

    # ------------------------------------------------------------------
    # Project Score  (0–100)
    # ------------------------------------------------------------------

    def _score_projects(self, data: dict) -> float:
        projects = data.get("Projects", [])
        if not projects:
            return 0

        score = 0
        for proj in projects:
            if isinstance(proj, dict):
                # +15 for having a project
                score += 15
                # +5 for having a GitHub link
                if proj.get("GitHub"):
                    score += 5
                # +5 for having a live demo
                if proj.get("Demo"):
                    score += 5
                # +1 per technology used (max 5)
                techs = proj.get("Technologies", [])
                score += min(len(techs), 5)
            else:
                score += 10

        return min(score, 100)

    # ------------------------------------------------------------------
    # Recommendation
    # ------------------------------------------------------------------

    def _get_recommendation(self, overall: int) -> tuple:
        for threshold, label, color in RECOMMENDATION_THRESHOLDS:
            if overall >= threshold:
                return label, color
        return "Not Recommended", "accent-red"

    # ------------------------------------------------------------------
    # Strengths & Weaknesses Analysis
    # ------------------------------------------------------------------

    def _analyze_profile(self, data: dict, tech: float, exp: float, edu: float) -> tuple:
        strengths  = []
        weaknesses = []

        skills = data.get("Skills", [])
        categorized = data.get("CategorizedSkills", {})
        experience = data.get("Experience", [])
        projects = data.get("Projects", [])
        education = data.get("Education", [])

        # Strengths
        if tech >= 70:
            strengths.append(f"Strong technical skill set ({len(skills)} skills identified)")
        if exp >= 70:
            strengths.append("Significant professional experience")
        if categorized.get("AI/ML Skills"):
            strengths.append(f"AI/ML expertise: {', '.join(categorized['AI/ML Skills'][:3])}")
        if categorized.get("Cloud Platforms"):
            strengths.append(f"Cloud skills: {', '.join(categorized['Cloud Platforms'][:3])}")
        if len(projects) >= 2:
            strengths.append(f"{len(projects)} projects demonstrate hands-on ability")
        if education and any(e.get("Degree") in ["PhD", "Masters"] for e in education if isinstance(e, dict)):
            strengths.append("Advanced academic qualifications")

        # Weaknesses
        if tech < 40:
            weaknesses.append("Limited technical skills breadth")
        if exp < 30:
            weaknesses.append("Limited professional experience")
        if not projects:
            weaknesses.append("No projects listed — harder to assess practical ability")
        if not education:
            weaknesses.append("Education background not clearly stated")
        if not data.get("Contact", {}).get("LinkedIn"):
            weaknesses.append("No LinkedIn profile listed")
        if not categorized.get("Cloud Platforms") and not categorized.get("DevOps Tools"):
            weaknesses.append("No cloud/DevOps skills detected")

        return strengths[:5], weaknesses[:5]

    # ------------------------------------------------------------------
    # Skill Gap Analysis
    # ------------------------------------------------------------------

    def _find_missing_skills(self, data: dict, job_keywords: list) -> list:
        if not job_keywords:
            return []

        candidate_skills = set(s.lower() for s in data.get("Skills", []))
        missing = []
        for kw in job_keywords:
            if kw.lower() not in candidate_skills:
                # Check partial match
                if not any(kw.lower() in s for s in candidate_skills):
                    missing.append(kw)

        return missing[:10]

    # ------------------------------------------------------------------
    # Improvement Suggestions
    # ------------------------------------------------------------------

    def _generate_suggestions(self, data: dict, weaknesses: list, missing: list) -> list:
        suggestions = []
        categorized = data.get("CategorizedSkills", {})

        if not categorized.get("Cloud Platforms"):
            suggestions.append("Consider obtaining AWS/GCP/Azure cloud certification")
        if not categorized.get("AI/ML Skills"):
            suggestions.append("Add ML frameworks (scikit-learn, TensorFlow, PyTorch) to expand AI relevance")
        if not data.get("Projects"):
            suggestions.append("Add GitHub projects to demonstrate practical experience")
        if not data.get("Contact", {}).get("LinkedIn"):
            suggestions.append("Add LinkedIn profile URL for professional visibility")
        if missing:
            suggestions.append(f"Develop these JD-required skills: {', '.join(missing[:5])}")

        return suggestions[:5]
