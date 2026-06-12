import re
import json

# Standard industry keywords per tech domain for gap analysis
STANDARD_KEYWORDS = {
    "software_engineering": [
        "REST API", "Microservices", "CI/CD", "Docker", "Kubernetes", "Unit Testing", 
        "Agile", "Git", "SQL", "NoSQL", "System Design", "Scalability", "Data Structures"
    ],
    "ai_ml": [
        "PyTorch", "TensorFlow", "Deep Learning", "NLP", "Computer Vision", "Model Deployment",
        "Data Pipelines", "Scikit-Learn", "Pandas", "Feature Engineering", "Transformers"
    ],
    "general": [
        "Problem Solving", "Collaboration", "Project Management", "SDLC", "Code Review"
    ]
}

LEADERSHIP_VERBS = [
    "managed", "spearheaded", "led", "founded", "mentored", "coached", "directed", 
    "supervised", "established", "organized", "negotiated", "guided"
]

LEADERSHIP_TITLES = [
    "lead", "senior", "principal", "manager", "head", "director", "vp", "chief", "cto", "founder"
]

class DeepAnalysisEngine:
    """
    Evaluates resumes across multiple dimensions: structure, ATS compatibility,
    keyword density, skill coverage, career growth, technical strength, and leadership potential.
    """

    def analyze_resume(self, parsed_data: dict, raw_text: str = "") -> dict:
        """
        Runs the full multi-dimensional analysis suite.
        
        Args:
            parsed_data: Dict returned by ResumeNER/DataExporter containing Skills, Experience, etc.
            raw_text: Full un-normalized string text of the resume.
        """
        # Ensure raw_text is populated if empty (synthesize from experience/skills)
        if not raw_text:
            raw_text = self._synthesize_raw_text(parsed_data)

        # 1. Structure & Section Coverage
        structure_results = self._analyze_structure(parsed_data)
        
        # 2. ATS Compatibility
        ats_results = self._analyze_ats_compatibility(parsed_data, raw_text)
        
        # 3. Keyword Density
        density_results = self._analyze_keyword_density(raw_text)
        
        # 4. Skill Coverage
        skill_results = self._analyze_skill_coverage(parsed_data)
        
        # 5. Career Growth
        growth_results = self._analyze_career_growth(parsed_data)
        
        # 6. Technical Strength
        tech_strength_results = self._analyze_technical_strength(parsed_data)
        
        # 7. Leadership Potential
        leadership_results = self._analyze_leadership_potential(parsed_data, raw_text)

        # ── SCORE CALCULATIONS ──
        # ATS Score (0-100)
        ats_score = int(
            structure_results["score"] * 0.40 + 
            ats_results["score"] * 0.60
        )
        
        # Recruiter Score (0-100)
        recruiter_score = int(
            growth_results["tenure_score"] * 0.40 + 
            tech_strength_results["projects_score"] * 0.30 +
            (100 if parsed_data.get("Education") else 50) * 0.30
        )
        recruiter_score = min(100, max(30, recruiter_score))

        # Technical Score (0-100)
        technical_score = int(
            skill_results["coverage_score"] * 0.50 +
            tech_strength_results["tools_score"] * 0.50
        )

        # Leadership Score (0-100)
        leadership_score = int(
            leadership_results["score"] * 0.60 +
            growth_results["progression_score"] * 0.40
        )

        # Communication Score (0-100)
        communication_score = self._calculate_communication_score(parsed_data, raw_text)

        # ── DIAGNOSTICS & RECOMMENDATIONS ──
        strengths = []
        weaknesses = []
        suggestions = []
        missing_keywords = []

        # Strengths
        if ats_score >= 80:
            strengths.append("Excellent ATS-friendly resume formatting and header organization.")
        if technical_score >= 75:
            strengths.append("Demonstrates a robust and highly diverse technical skill set.")
        if leadership_score >= 60:
            strengths.append("Strong leadership footprint identified in prior roles and project ownership.")
        if communication_score >= 80:
            strengths.append("Descriptions are concise and make good use of team collaboration indicators.")
        if growth_results["progression_score"] >= 70:
            strengths.append("Clear upward mobility and seniority progression in career history.")
        if len(strengths) < 2:
            strengths.append("Has clearly defined contact and educational details.")

        # Weaknesses
        if not structure_results["has_summary"]:
            weaknesses.append("Lacks a professional summary section at the top of the resume.")
        if not structure_results["has_projects"]:
            weaknesses.append("No independent projects section detected to validate hands-on expertise.")
        if ats_results["missing_linkedin"]:
            weaknesses.append("Missing a professional LinkedIn profile link in the header.")
        if growth_results["has_hopping"]:
            weaknesses.append("Average tenure is under 18 months, indicating potential job-hopping risks.")
        if density_results["overstuffed"]:
            weaknesses.append("Unusually high keyword repeating density detected, which might look like keyword stuffing.")

        # Improvement Suggestions
        if not structure_results["has_summary"]:
            suggestions.append("Add a 3-4 sentence professional summary outlining your years of experience, core tech stack, and impact.")
        if not structure_results["has_projects"]:
            suggestions.append("Add a 'Projects' section featuring 2-3 technical projects. Include links to GitHub repositories or demo URLs.")
        if ats_results["non_standard_headers"]:
            suggestions.append("Change non-standard section headers (e.g. 'My Path') to standard ones like 'Experience' or 'Education'.")
        if ats_results["missing_phone"] or ats_results["missing_email"]:
            suggestions.append("Ensure complete contact detail coordinates (Email, Phone Number) are placed at the absolute top of the page.")
        if communication_score < 70:
            suggestions.append("Break long paragraph-based job duties into bullet points starting with strong action verbs.")

        # Missing Keywords
        # Check standard engineering / AI-ML keywords missing from raw text
        tech_domain = "ai_ml" if ("machine learning" in raw_text.lower() or "data science" in raw_text.lower()) else "software_engineering"
        for kw in STANDARD_KEYWORDS[tech_domain] + STANDARD_KEYWORDS["general"]:
            if not re.search(r'\b' + re.escape(kw) + r'\b', raw_text, re.I):
                missing_keywords.append(kw)

        # Truncate diagnostics to standard counts
        strengths = strengths[:4]
        weaknesses = weaknesses[:4]
        suggestions = suggestions[:4]
        missing_keywords = missing_keywords[:6]

        return {
            "ATSScore": ats_score,
            "RecruiterScore": recruiter_score,
            "TechnicalScore": technical_score,
            "LeadershipScore": leadership_score,
            "CommunicationScore": communication_score,
            
            "Structure": structure_results,
            "ATSCompatibility": ats_results,
            "KeywordDensity": density_results,
            "SkillCoverage": skill_results,
            "CareerGrowth": growth_results,
            "TechnicalStrength": tech_strength_results,
            "LeadershipPotential": leadership_results,

            "Strengths": strengths,
            "Weaknesses": weaknesses,
            "Suggestions": suggestions,
            "MissingKeywords": missing_keywords,
            "MissingSkills": missing_keywords[:3]  # Map missing keywords to missing skills for fallback
        }

    # ── INDIVIDUAL ANALYSERS ────────────────────────────────────────────────
    
    def _synthesize_raw_text(self, data: dict) -> str:
        """Fallback to compile raw text from structured fields if raw is empty."""
        parts = []
        if data.get("Name"): parts.append(" ".join(data["Name"]))
        if data.get("Skills"): parts.append(" ".join(data["Skills"]))
        
        for exp in data.get("Experience", []):
            if isinstance(exp, dict):
                parts.append(f"{exp.get('Role','')} {exp.get('Company','')} {exp.get('Duration','')}")
                parts.append(" ".join(exp.get("Responsibilities", [])))
            else:
                parts.append(str(exp))
                
        for proj in data.get("Projects", []):
            if isinstance(proj, dict):
                parts.append(f"{proj.get('Name','')} {proj.get('Description','')}")
            else:
                parts.append(str(proj))
        return " ".join(parts)

    def _analyze_structure(self, data: dict) -> dict:
        """Audits the presence of essential sections."""
        has_contact = bool(data.get("Contact") or data.get("Emails") or data.get("Phones"))
        has_skills = bool(data.get("Skills"))
        has_exp = bool(data.get("Experience"))
        has_edu = bool(data.get("Education"))
        has_projects = bool(data.get("Projects"))
        
        # Summary heuristic: check if summary text or a summary profile exists
        has_summary = False
        parsed_str = json.dumps(data).lower()
        if "summary" in parsed_str or "profile" in parsed_str or "objective" in parsed_str:
            has_summary = True

        sections_score = 0
        if has_contact: sections_score += 20
        if has_skills: sections_score += 20
        if has_exp: sections_score += 25
        if has_edu: sections_score += 15
        if has_projects: sections_score += 10
        if has_summary: sections_score += 10

        return {
            "score": sections_score,
            "has_contact": has_contact,
            "has_skills": has_skills,
            "has_experience": has_exp,
            "has_education": has_edu,
            "has_projects": has_projects,
            "has_summary": has_summary
        }

    def _analyze_ats_compatibility(self, data: dict, raw_text: str) -> dict:
        """Audits compatibility indices for standard ATS filters."""
        contact = data.get("Contact", {})
        emails = contact.get("Emails", []) or data.get("Emails", [])
        phones = contact.get("Phones", []) or data.get("Phones", [])
        linkedin = contact.get("LinkedIn", []) or data.get("LinkedIn", [])

        missing_email = len(emails) == 0
        missing_phone = len(phones) == 0
        missing_linkedin = len(linkedin) == 0

        # Check section header naming standard
        non_standard_headers = False
        raw_lower = raw_text.lower()
        # If headers like "my background", "chronology", "my story" exist instead of standard words
        if "my background" in raw_lower or "my story" in raw_lower or "technologies I know" in raw_lower:
            non_standard_headers = True

        # Check for complex elements (heuristic: high count of tables or vertical pipes in plain text)
        complex_layout = raw_text.count("|") > 20 or raw_text.count("│") > 10

        ats_score = 100
        if missing_email: ats_score -= 20
        if missing_phone: ats_score -= 15
        if missing_linkedin: ats_score -= 15
        if non_standard_headers: ats_score -= 15
        if complex_layout: ats_score -= 20

        return {
            "score": max(0, ats_score),
            "missing_email": missing_email,
            "missing_phone": missing_phone,
            "missing_linkedin": missing_linkedin,
            "non_standard_headers": non_standard_headers,
            "complex_layout": complex_layout
        }

    def _analyze_keyword_density(self, raw_text: str) -> dict:
        """Measures keyword repetition to prevent keyword stuffing and identify focus terms."""
        # Simple tokenization
        words = [w.strip().lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', raw_text)]
        total_words = len(words)
        
        if total_words == 0:
            return {"score": 50, "density": [], "overstuffed": False}

        # Filter out common stop words
        stopwords = {"and", "the", "for", "with", "from", "that", "this", "they", "was", "were", "are", "been"}
        clean_words = [w for w in words if w not in stopwords]

        frequencies = {}
        for w in clean_words:
            frequencies[w] = frequencies.get(w, 0) + 1

        sorted_freqs = sorted(frequencies.items(), key=lambda x: x[1], reverse=True)[:5]
        
        overstuffed = False
        density_list = []
        for kw, cnt in sorted_freqs:
            density = round((cnt / total_words) * 100, 2)
            density_list.append({"keyword": kw.title(), "count": cnt, "density_pct": density})
            if density > 4.5:  # Over 4.5% density for a single word might trigger stuffing filters
                overstuffed = True

        score = 100
        if overstuffed: score -= 25
        if total_words < 100: score -= 30  # Too short

        return {
            "score": max(0, score),
            "density": density_list,
            "overstuffed": overstuffed,
            "total_words": total_words
        }

    def _analyze_skill_coverage(self, data: dict) -> dict:
        """Measures diversity and count of candidate skills."""
        skills = data.get("Skills", [])
        cat_skills = data.get("CategorizedSkills", {})

        total_skills = len(skills)
        categories_count = len(cat_skills)

        # Compute a coverage score: 0 skills = 0, 5 skills = 40, 15 skills = 85, 25+ skills = 100
        if total_skills == 0:
            cov_score = 0
        elif total_skills <= 5:
            cov_score = total_skills * 8
        elif total_skills <= 15:
            cov_score = 40 + (total_skills - 5) * 4.5
        else:
            cov_score = 85 + min((total_skills - 15) * 1.5, 15)

        # Categories bonus: +5 pts per category up to 15
        bonus = min(categories_count * 4, 16)
        
        return {
            "coverage_score": min(100, int(cov_score + bonus)),
            "total_skills": total_skills,
            "categories_count": categories_count
        }

    def _analyze_career_growth(self, data: dict) -> dict:
        """Audits job seniority growth and tenure stability."""
        experience = data.get("Experience", [])
        if not experience:
            return {"tenure_score": 40, "progression_score": 40, "has_hopping": False, "avg_tenure_months": 0}

        total_months = 0
        roles_count = len(experience)
        
        # Estimate months
        import datetime
        current_year = datetime.datetime.now().year

        for exp in experience:
            duration = exp.get("Duration", "") if isinstance(exp, dict) else str(exp)
            years_found = re.findall(r'\b(20\d{2}|19\d{2})\b', duration)
            is_present = bool(re.search(r'present|current|now', duration, re.I))

            if len(years_found) >= 2:
                total_months += (int(years_found[-1]) - int(years_found[0])) * 12
            elif len(years_found) == 1 and is_present:
                total_months += (current_year - int(years_found[0])) * 12
            else:
                total_months += 12  # default assume 1 year if unparsed

        avg_tenure = total_months / max(roles_count, 1)

        # Job hopping flag: average tenure < 18 months
        has_hopping = avg_tenure < 18 and roles_count >= 2

        tenure_score = 100
        if avg_tenure < 12: tenure_score -= 40
        elif avg_tenure < 18: tenure_score -= 20
        elif avg_tenure > 36: tenure_score += 10 # long tenure bonus

        # Career progression check (seniority advancement in titles)
        titles = []
        for exp in experience:
            role = exp.get("Role", "") if isinstance(exp, dict) else str(exp)
            titles.append(role.lower())
        
        # Standard title progression logic: check if newer roles are senior to older ones
        # Newer roles are at the top (index 0), older ones at the bottom (index -1)
        progression_score = 60 # base
        if len(titles) >= 2:
            latest_role = titles[0]
            earliest_role = titles[-1]
            
            latest_is_senior = any(w in latest_role for w in ["senior", "lead", "manager", "head", "director", "principal", "architect"])
            earliest_is_junior = any(w in earliest_role for w in ["intern", "junior", "assistant", "associate", "trainee"])
            
            if latest_is_senior:
                progression_score += 20
            if latest_is_senior and earliest_is_junior:
                progression_score += 15 # excellent growth

        return {
            "tenure_score": min(100, max(0, tenure_score)),
            "progression_score": min(100, max(0, progression_score)),
            "has_hopping": has_hopping,
            "avg_tenure_months": int(avg_tenure)
        }

    def _analyze_technical_strength(self, data: dict) -> dict:
        """Measures technical skills depth and project evidence."""
        skills = data.get("Skills", [])
        projects = data.get("Projects", [])

        # Count core technical skills (Programming, DB, Cloud, DevOps, ML)
        cat_skills = data.get("CategorizedSkills", {})
        tech_categories = ["Programming Languages", "Frameworks", "Databases", "Cloud Platforms", "DevOps Tools", "AI/ML Skills"]
        tech_count = 0
        for cat in tech_categories:
            tech_count += len(cat_skills.get(cat, []))

        # Heuristic score for tools: 0 = 0, 5 = 40, 10 = 80, 15+ = 100
        tools_score = min(tech_count * 8, 100)
        if tech_count == 0 and len(skills) > 0: # fallback
            tools_score = min(len(skills) * 5, 100)

        # Projects evaluation
        proj_score = 40 # base for no projects
        if projects:
            proj_score = len(projects) * 25
            github_count = sum(1 for p in projects if isinstance(p, dict) and p.get("GitHub"))
            proj_score += github_count * 10
            proj_score = min(proj_score, 100)

        return {
            "tools_score": tools_score,
            "projects_score": proj_score,
            "tech_skills_count": tech_count
        }

    def _analyze_leadership_potential(self, data: dict, raw_text: str) -> dict:
        """Scans for leadership role titles and action verbs."""
        # Action verbs matching
        text_lower = raw_text.lower()
        verb_matches = []
        for verb in LEADERSHIP_VERBS:
            matches = len(re.findall(r'\b' + re.escape(verb) + r'\b', text_lower))
            if matches > 0:
                verb_matches.append({"verb": verb, "count": matches})

        total_verb_matches = sum(item["count"] for item in verb_matches)

        # Title matching
        experience = data.get("Experience", [])
        has_leadership_title = False
        leadership_roles = []
        for exp in experience:
            role = exp.get("Role", "") if isinstance(exp, dict) else str(exp)
            if any(w in role.lower() for w in LEADERSHIP_TITLES):
                has_leadership_title = True
                leadership_roles.append(role)

        lead_score = 40 # default base
        if has_leadership_title:
            lead_score += 35
        lead_score += min(total_verb_matches * 6, 25)

        return {
            "score": min(100, lead_score),
            "leadership_verbs_count": total_verb_matches,
            "has_leadership_title": has_leadership_title,
            "leadership_roles": leadership_roles
        }

    def _calculate_communication_score(self, data: dict, raw_text: str) -> int:
        """Heuristically measures formatting structure and concise description lengths."""
        experience = data.get("Experience", [])
        
        # Soft skills check
        soft_skills_count = 0
        cat_skills = data.get("CategorizedSkills", {})
        soft_skills_count = len(cat_skills.get("Soft Skills", []))
        if soft_skills_count == 0:
            # check in flat list
            flat_skills = [s.lower() for s in data.get("Skills", [])]
            for s in ["communication", "teamwork", "leadership", "collaboration", "management", "problem solving"]:
                if s in flat_skills:
                    soft_skills_count += 1

        # Readability & length checks (bullet points conciseness)
        total_bullets = 0
        good_length_bullets = 0
        
        for exp in experience:
            if isinstance(exp, dict):
                bullets = exp.get("Responsibilities", [])
                for b in bullets:
                    total_bullets += 1
                    # Bullet length should ideally be between 40 and 200 characters for maximum recruiter readability
                    if 40 <= len(b) <= 220:
                        good_length_bullets += 1

        conciseness_ratio = 1.0
        if total_bullets > 0:
            conciseness_ratio = good_length_bullets / total_bullets

        comm_score = 65 # base
        comm_score += min(soft_skills_count * 8, 20)
        comm_score += int(conciseness_ratio * 15)

        return min(100, max(35, comm_score))
