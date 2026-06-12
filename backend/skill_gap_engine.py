import re
from typing import List, Dict, Tuple

# Mapping database for courses and certifications
CERTIFICATIONS_MAP = {
    "aws": "AWS Certified Solutions Architect - Associate",
    "gcp": "Google Cloud Associate Cloud Engineer",
    "azure": "Microsoft Certified: Azure Fundamentals (AZ-900)",
    "kubernetes": "Certified Kubernetes Administrator (CKA)",
    "docker": "Docker Certified Associate (DCA)",
    "python": "PCAP: Certified Associate in Python Programming",
    "react": "Meta Front-End Developer Professional Certificate",
    "sql": "Oracle Database SQL Certified Associate",
    "machine learning": "Google Professional Machine Learning Engineer",
    "deep learning": "Deep Learning Specialization Certification",
    "git": "GitHub Actions Certification",
    "devops": "AWS Certified DevOps Engineer - Professional",
    "security": "CompTIA Security+",
    "agile": "PMI Agile Certified Practitioner (PMI-ACP)"
}

COURSES_MAP = {
    "aws": {"title": "AWS Cloud Technical Essentials", "platform": "Coursera", "duration": "4 weeks"},
    "gcp": {"title": "Google Cloud Fundamentals: Core Infrastructure", "platform": "Coursera", "duration": "3 weeks"},
    "azure": {"title": "Microsoft Azure Fundamentals AZ-900", "platform": "Udemy", "duration": "3 weeks"},
    "kubernetes": {"title": "Certified Kubernetes Administrator (CKA) Prep Course", "platform": "Udemy", "duration": "5 weeks"},
    "docker": {"title": "Docker Technologies for DevOps and Developers", "platform": "Udemy", "duration": "3 weeks"},
    "python": {"title": "Python for Everybody Specialization", "platform": "Coursera", "duration": "8 weeks"},
    "react": {"title": "React - The Complete Guide (incl Hooks, React Router, Redux)", "platform": "Udemy", "duration": "6 weeks"},
    "sql": {"title": "SQL for Data Science", "platform": "Coursera", "duration": "4 weeks"},
    "javascript": {"title": "The Complete JavaScript Course 2026: From Zero to Expert!", "platform": "Udemy", "duration": "8 weeks"},
    "machine learning": {"title": "Machine Learning Specialization by Andrew Ng", "platform": "Coursera", "duration": "10 weeks"},
    "deep learning": {"title": "Deep Learning Specialization by Andrew Ng", "platform": "Coursera", "duration": "12 weeks"},
    "fastapi": {"title": "Modern APIs with FastAPI and Python", "platform": "Talk Python", "duration": "3 weeks"},
    "devops": {"title": "DevOps Culture and Practice Specialization", "platform": "Coursera", "duration": "6 weeks"},
    "django": {"title": "Django for Beginners", "platform": "Udemy", "duration": "4 weeks"},
    "git": {"title": "Git & GitHub Complete Course", "platform": "Udemy", "duration": "2 weeks"}
}

SKILL_WEIGHTS = {
    # Cloud (4 weeks)
    "aws": 4, "gcp": 4, "azure": 4, "cloud": 4,
    # DevOps & Containers (3 weeks)
    "kubernetes": 3, "docker": 3, "jenkins": 3, "devops": 3, "cicd": 3,
    # Programming Languages (3 weeks)
    "python": 3, "javascript": 3, "go": 3, "rust": 3, "java": 3, "c++": 3, "typescript": 3,
    # Heavy Frameworks (3 weeks)
    "react": 3, "angular": 3, "django": 3, "spring": 3, "tensorflow": 3, "pytorch": 3, "vue": 3,
    # Databases & Storage (2 weeks)
    "sql": 2, "nosql": 2, "mongodb": 2, "postgresql": 2, "redis": 2, "mysql": 2, "database": 2,
    # Secondary APIs & Tools (2 weeks)
    "fastapi": 2, "git": 2, "rest api": 2, "graphql": 2, "flask": 2, "api": 2,
    # Soft skills (1 week)
    "agile": 1, "scrum": 1, "communication": 1, "teamwork": 1, "leadership": 1
}

class SkillGapEngine:
    """
    Skill Gap Detection Engine.
    Compares candidate profile skills against job requirements.
    Computes gap percentages, maps courses, certifications, and roadmap.
    """

    def analyze_gap(self, candidate_skills: List[str], job_requirements_text: str) -> dict:
        """
        Main gap analysis execution.
        """
        # Normalize sets
        cand_normalized = {s.lower().strip() for s in candidate_skills}
        reqs_normalized = self._parse_job_requirements(job_requirements_text)
        
        # If no requirements parsed, default to standard software engineering stack
        if not reqs_normalized:
            reqs_normalized = {"python", "javascript", "react", "sql", "git"}

        # Calculate sets intersection/difference
        matched_skills = list(cand_normalized & reqs_normalized)
        missing_skills = list(reqs_normalized - cand_normalized)
        
        # Math scores
        total_reqs = len(reqs_normalized)
        match_pct = round((len(matched_skills) / total_reqs) * 100) if total_reqs > 0 else 100
        gap_pct = 100 - match_pct

        # Recommendations
        recommended_certifications = []
        recommended_courses = []
        
        # Mapping courses/certifications based on missing skills
        for skill in missing_skills:
            # Check direct match
            if skill in CERTIFICATIONS_MAP:
                recommended_certifications.append({
                    "skill": skill.title(),
                    "certification": CERTIFICATIONS_MAP[skill]
                })
            
            if skill in COURSES_MAP:
                course = COURSES_MAP[skill]
                recommended_courses.append({
                    "skill": skill.title(),
                    "title": course["title"],
                    "platform": course["platform"],
                    "duration": course["duration"]
                })
        
        # Fallbacks for certifications/courses if missing is empty or short
        if not recommended_certifications:
            recommended_certifications.append({
                "skill": "Software Engineering",
                "certification": "AWS Certified Developer - Associate"
            })
        if not recommended_courses:
            recommended_courses.append({
                "skill": "Full Stack Development",
                "title": "Full Stack Web Developer Nanodegree",
                "platform": "Udacity",
                "duration": "12 weeks"
            })

        # Calculate estimated time to job-ready (weeks)
        total_weeks = 0
        for skill in missing_skills:
            weight = SKILL_WEIGHTS.get(skill, 2) # default to 2 weeks for unmapped skills
            total_weeks += weight
        
        # Limit timeframe cap: min 1 week (if has gap), max 24 weeks
        if gap_pct > 0:
            estimated_weeks = min(24, max(2, total_weeks))
        else:
            estimated_weeks = 0

        # Construct Step-by-Step Learning Roadmap
        roadmap = self._generate_roadmap(missing_skills)

        return {
            "match_percentage": match_pct,
            "gap_percentage": gap_pct,
            "matched_skills": [s.title() for s in matched_skills],
            "missing_skills": [s.title() for s in missing_skills],
            "recommended_certifications": recommended_certifications[:4],
            "recommended_courses": recommended_courses[:4],
            "learning_roadmap": roadmap,
            "estimated_weeks_to_ready": estimated_weeks,
            "weekly_commitment": "8-10 hours/week"
        }

    def _parse_job_requirements(self, text: str) -> set:
        """Helper to extract normalized skill terms from a job description."""
        if not text:
            return set()
        
        text_lower = text.lower()
        parsed = set()
        
        # Standard dictionary checks
        all_skills = list(SKILL_WEIGHTS.keys())
        for skill in all_skills:
            # Use word boundary checks to avoid partial substring collisions
            if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                parsed.add(skill)
                
        return parsed

    def _generate_roadmap(self, missing_skills: List[str]) -> List[dict]:
        """Arranges missing skills chronologically into curriculum roadmap phases."""
        roadmap = []
        if not missing_skills:
            return [{
                "phase": "Deployment & Review",
                "duration": "1 week",
                "topics": ["Resume Tuning", "Mock Interviews"],
                "description": "Candidate is fully aligned. Conduct final code portfolio sweeps and mock HR screening drills."
            }]

        # Categorize missing skills into phases
        languages_tools = []
        frameworks_apis = []
        databases_storage = []
        cloud_devops = []
        
        for skill in missing_skills:
            weight = SKILL_WEIGHTS.get(skill, 2)
            skill_title = skill.title()
            
            if skill in ["python", "javascript", "go", "rust", "java", "c++", "typescript", "git"]:
                languages_tools.append((skill_title, weight))
            elif skill in ["react", "angular", "django", "spring", "tensorflow", "pytorch", "vue", "fastapi", "flask", "rest api", "graphql"]:
                frameworks_apis.append((skill_title, weight))
            elif skill in ["sql", "nosql", "mongodb", "postgresql", "redis", "mysql", "database"]:
                databases_storage.append((skill_title, weight))
            else:
                cloud_devops.append((skill_title, weight))

        # Compile Phase 1
        if languages_tools:
            dur = sum(x[1] for x in languages_tools)
            roadmap.append({
                "phase": "Phase 1: Languages & Fundamentals",
                "duration": f"{dur} weeks",
                "topics": [x[0] for x in languages_tools],
                "description": "Establish syntax paradigms, local environments setup, and version control structures."
            })

        # Compile Phase 2
        if frameworks_apis:
            dur = sum(x[1] for x in frameworks_apis)
            roadmap.append({
                "phase": "Phase 2: Core Application & APIs",
                "duration": f"{dur} weeks",
                "topics": [x[0] for x in frameworks_apis],
                "description": "Understand routing mechanics, state lifecycle configurations, and API structures integration."
            })

        # Compile Phase 3
        if databases_storage:
            dur = sum(x[1] for x in databases_storage)
            roadmap.append({
                "phase": "Phase 3: Database & Storage layers",
                "duration": f"{dur} weeks",
                "topics": [x[0] for x in databases_storage],
                "description": "Configure entity relational models, run query optimization explainers, and index tables."
            })

        # Compile Phase 4
        if cloud_devops:
            dur = sum(x[1] for x in cloud_devops)
            roadmap.append({
                "phase": "Phase 4: Cloud Operations & DevOps",
                "duration": f"{dur} weeks",
                "topics": [x[0] for x in cloud_devops],
                "description": "Implement containers build automation, setup cloud server deployments, and write ingress scripts."
            })
            
        return roadmap
