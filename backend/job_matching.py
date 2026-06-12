import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

class JobMatcher:
    """
    Enhanced Job Matcher.
    Extracts structured data from Job Descriptions and compares against parsed resumes.
    Uses TF-IDF + Heuristics for fast, lightweight CPU execution.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')

    def analyze_jd(self, job_description: str) -> dict:
        """
        Extracts key requirements from the Job Description text.
        """
        if not job_description:
            return {"Skills": [], "YearsExperience": 0, "Keywords": []}

        # Naive skill extraction (simulating NER for JD)
        # In a real app, we'd run the JD through spaCy NER too.
        # Here we extract common tech keywords based on simple regex for demo purposes.
        tech_keywords = [
            "python", "java", "c++", "c#", "javascript", "typescript", "react", "angular",
            "vue", "node", "aws", "gcp", "azure", "docker", "kubernetes", "sql", "nosql",
            "machine learning", "deep learning", "nlp", "computer vision", "data science",
            "agile", "scrum", "ci/cd", "linux", "git"
        ]
        
        jd_lower = job_description.lower()
        extracted_skills = [kw for kw in tech_keywords if kw in jd_lower]
        
        # Extract years of experience requirement
        # e.g. "3+ years", "2-4 years"
        exp_match = re.search(r'([0-9]+)(?:\s*[-+to]+\s*[0-9]+)?\s*years?(?:\s+of)?\s+experience', jd_lower)
        years_exp = int(exp_match.group(1)) if exp_match else 0

        # Also extract raw TF-IDF top terms as "Keywords"
        try:
            tfidf_matrix = self.vectorizer.fit_transform([job_description])
            feature_names = self.vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            # Get top 15 words
            top_indices = scores.argsort()[-15:][::-1]
            keywords = [feature_names[i] for i in top_indices if len(feature_names[i]) > 2]
        except ValueError:
            keywords = []

        return {
            "Skills": [s.title() for s in extracted_skills],
            "YearsExperience": years_exp,
            "Keywords": keywords,
            "RawText": job_description
        }

    def match_candidate(self, parsed_resume: dict, jd_analysis: dict) -> dict:
        """
        Matches a single candidate against the analyzed JD.
        """
        # Calculate semantic similarity
        resume_skills = parsed_resume.get("Skills", [])
        resume_exp = [e.get("Raw", "") if isinstance(e, dict) else str(e) for e in parsed_resume.get("Experience", [])]
        profile_text = " ".join(resume_skills) + " " + " ".join(resume_exp)
        
        score = self._calculate_tfidf_similarity(profile_text, jd_analysis.get("RawText", ""))
        
        # Skill alignment
        jd_skills = set([s.lower() for s in jd_analysis.get("Skills", [])])
        cand_skills = set([s.lower() for s in resume_skills])
        
        matching_skills = [s.title() for s in jd_skills.intersection(cand_skills)]
        missing_skills = [s.title() for s in jd_skills.difference(cand_skills)]
        
        # Base match score heavily depends on tfidf but we can boost it if skills match
        skill_match_ratio = len(matching_skills) / max(len(jd_skills), 1)
        
        # Blended score: 70% semantic, 30% exact skill match
        blended_score = score * 0.7 + skill_match_ratio * 0.3
        # Bound it between 0 and 1
        blended_score = min(max(blended_score, 0.0), 1.0)
        
        # AI Insights
        why_match = []
        if matching_skills:
            why_match.append(f"Candidate possesses {len(matching_skills)} required skills.")
        if score > 0.3:
            why_match.append("Strong semantic overlap with job responsibilities.")
            
        why_not_match = []
        if missing_skills:
            why_not_match.append(f"Missing {len(missing_skills)} key skills.")
        if jd_analysis.get("YearsExperience", 0) > 0 and not parsed_resume.get("Experience"):
            why_not_match.append("Job requires experience, but candidate lacks relevant entries.")

        # Candidate Name
        name_field = parsed_resume.get("Name", [])
        candidate_name = name_field[0] if isinstance(name_field, list) and name_field else "Unknown Candidate"

        return {
            "candidate": candidate_name,
            "match_score": round(blended_score, 4),
            "match_percentage": int(blended_score * 100),
            "matching_skills": matching_skills,
            "missing_skills": missing_skills,
            "why_match": why_match,
            "why_not_match": why_not_match,
            "upskilling_suggestions": [f"Learn {s}" for s in missing_skills[:3]]
        }

    def rank_resumes(self, parsed_resumes: list, job_description: str) -> list:
        """
        Ranks multiple resumes against a JD.
        """
        if not parsed_resumes or not job_description:
            return []
            
        jd_analysis = self.analyze_jd(job_description)
        
        ranked_candidates = []
        for resume in parsed_resumes:
            match_data = self.match_candidate(resume, jd_analysis)
            ranked_candidates.append(match_data)
            
        # Sort descending
        ranked_candidates.sort(key=lambda x: x["match_score"], reverse=True)
        return ranked_candidates

    def _calculate_tfidf_similarity(self, resume_text: str, job_description: str) -> float:
        """
        CPU-Optimized Matching: Calculates semantic similarity using TF-IDF.
        """
        if not resume_text.strip() or not job_description.strip():
            return 0.0
            
        try:
            tfidf_matrix = self.vectorizer.fit_transform([resume_text, job_description])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            return float(similarity[0][0])
        except ValueError:
            return 0.0

if __name__ == "__main__":
    print("Job Matcher initialized.")
    matcher = JobMatcher()
    
    jd = "We are looking for a Software Engineer with 3+ years experience in Python, React, and Cloud infrastructure (AWS)."
    print(f"JD Analysis: {matcher.analyze_jd(jd)}")
