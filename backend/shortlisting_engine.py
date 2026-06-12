import re
import json

DEGREE_TIER_SCORES = {
    "PhD": 100, "Masters": 85, "MBA": 80,
    "Bachelors": 70, "Diploma": 50, "Associate": 45, "None": 0
}

class IntelligentShortlistingEngine:
    """
    Automates candidate classification into Highly Recommended, Recommended, Consider, or Reject
    based on custom Job Descriptions and Hiring Criteria.
    """

    def get_years_experience(self, parsed_data: dict) -> float:
        """Helper to estimate candidate's total years of experience from their history."""
        experience = parsed_data.get("Experience", [])
        if not experience:
            return 0.0

        total_months = 0
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
                total_months += 12  # default: assume 1 year if unparsed

        return round(total_months / 12.0, 1)

    def get_highest_degree(self, parsed_data: dict) -> str:
        """Helper to find candidate's highest degree level."""
        education = parsed_data.get("Education", [])
        if not education:
            return "None"

        highest_score = 0
        highest_degree = "None"
        for edu in education:
            degree = edu.get("Degree", "") if isinstance(edu, dict) else str(edu)
            # Standardize degree slightly
            deg_clean = "Bachelors"
            if "phd" in degree.lower() or "doctor" in degree.lower():
                deg_clean = "PhD"
            elif "master" in degree.lower() or "msc" in degree.lower() or "ms " in degree.lower() or degree.lower() == "ms":
                deg_clean = "Masters"
            elif "mba" in degree.lower():
                deg_clean = "MBA"
            elif "bachelor" in degree.lower() or "bsc" in degree.lower() or "btech" in degree.lower() or "be" in degree.lower() or "ba" in degree.lower():
                deg_clean = "Bachelors"
            elif "diploma" in degree.lower():
                deg_clean = "Diploma"
            elif "associate" in degree.lower():
                deg_clean = "Associate"

            score = DEGREE_TIER_SCORES.get(deg_clean, 30)
            if score > highest_score:
                highest_score = score
                highest_degree = deg_clean

        return highest_degree

    def classify_candidate(self, parsed_data: dict, criteria: dict) -> dict:
        """
        Classifies a single candidate based on provided hiring criteria.
        """
        # Parse criteria inputs
        min_experience = float(criteria.get("min_experience") or 0)
        mandatory_skills = [s.strip().lower() for s in criteria.get("mandatory_skills", []) if s.strip()]
        min_education = criteria.get("min_education", "None")
        required_certs = [c.strip().lower() for c in criteria.get("required_certifications", []) if c.strip()]
        project_kws = [k.strip().lower() for k in criteria.get("project_keywords", []) if k.strip()]

        candidate_skills = [s.lower() for s in parsed_data.get("Skills", [])]
        candidate_years = self.get_years_experience(parsed_data)
        candidate_degree = self.get_highest_degree(parsed_data)

        reasoning = []
        scores = {}

        # 1. Skill Match
        matched_mandatory = []
        missing_mandatory = []
        for s in mandatory_skills:
            if s in candidate_skills or any(s in cs for cs in candidate_skills):
                matched_mandatory.append(s)
            else:
                missing_mandatory.append(s)

        skill_ratio = 1.0
        if mandatory_skills:
            skill_ratio = len(matched_mandatory) / len(mandatory_skills)
            reasoning.append(f"Matches {len(matched_mandatory)} of {len(mandatory_skills)} mandatory skills ({', '.join(matched_mandatory).title()}).")
            if missing_mandatory:
                reasoning.append(f"Missing mandatory skill tags: {', '.join(missing_mandatory).title()}.")
        else:
            reasoning.append("No specific mandatory skills required.")
        
        scores["skills"] = int(skill_ratio * 100)

        # 2. Experience Match
        exp_score = 100
        if candidate_years >= min_experience:
            reasoning.append(f"Has {candidate_years} yrs experience, meeting the required minimum ({min_experience} yrs).")
        else:
            deficit = min_experience - candidate_years
            exp_score = max(0, int(100 - deficit * 20))
            reasoning.append(f"Has {candidate_years} yrs experience, which is under the minimum requirement of {min_experience} yrs.")
        
        scores["experience"] = exp_score

        # 3. Education Match
        edu_score = 100
        candidate_deg_val = DEGREE_TIER_SCORES.get(candidate_degree, 0)
        req_deg_val = DEGREE_TIER_SCORES.get(min_education, 0)

        if candidate_deg_val >= req_deg_val:
            reasoning.append(f"Meets education requirement with a {candidate_degree} degree.")
        else:
            edu_score = max(0, 100 - (req_deg_val - candidate_deg_val))
            reasoning.append(f"Highest degree is {candidate_degree}, below the required tier ({min_education}).")
            
        scores["education"] = edu_score

        # 4. Project Relevance
        proj_score = 100
        matched_proj_kws = []
        if project_kws:
            projects = parsed_data.get("Projects", [])
            proj_text = " ".join([
                (p.get("Name", "") + " " + p.get("Description", "") + " " + " ".join(p.get("Technologies", [])))
                for p in projects if isinstance(p, dict)
            ]).lower()
            
            for kw in project_kws:
                if kw in proj_text:
                    matched_proj_kws.append(kw)
                    
            proj_ratio = len(matched_proj_kws) / len(project_kws)
            proj_score = int(proj_ratio * 100)
            reasoning.append(f"Projects show {len(matched_proj_kws)} of {len(project_kws)} key terms relevance ({', '.join(matched_proj_kws).title()}).")
        else:
            reasoning.append("No specific project keywords requested.")
            
        scores["projects"] = proj_score

        # 5. Certification Match
        cert_score = 100
        matched_certs = []
        if required_certs:
            certs = parsed_data.get("Certifications", [])
            cert_text = " ".join([
                (c.get("Name", "") + " " + c.get("Issuer", ""))
                for c in certs if isinstance(c, dict)
            ]).lower()

            for cert in required_certs:
                if cert in cert_text:
                    matched_certs.append(cert)

            cert_ratio = len(matched_certs) / len(required_certs)
            cert_score = int(cert_ratio * 100)
            reasoning.append(f"Possesses {len(matched_certs)} of {len(required_certs)} required certifications.")
        else:
            reasoning.append("No specific certifications required.")

        scores["certifications"] = cert_score

        # Weighted Score Computation
        overall = int(
            scores["skills"] * 0.35 +
            scores["experience"] * 0.30 +
            scores["education"] * 0.15 +
            scores["projects"] * 0.10 +
            scores["certifications"] * 0.10
        )

        # Base Classification Logic
        # Strictly enforce mandatory skills and experience limits
        if overall >= 85 and len(missing_mandatory) == 0 and candidate_years >= min_experience:
            classification = "Highly Recommended"
        elif overall >= 65 and len(missing_mandatory) <= 1 and candidate_years >= (min_experience - 1.5):
            classification = "Recommended"
        elif overall >= 45 and len(missing_mandatory) <= 2 and candidate_years >= (min_experience - 3.0):
            classification = "Consider"
        else:
            classification = "Reject"

        # Check for Manual Override
        override = parsed_data.get("ShortlistOverride")
        is_overridden = False
        original_class = classification
        if override in ["Highly Recommended", "Recommended", "Consider", "Reject"]:
            classification = override
            is_overridden = True
            reasoning.insert(0, f"AI categorized this candidate as '{original_class}' (Score: {overall}), but was manually overridden by recruiter to '{override}'.")

        return {
            "overall_score": overall,
            "sub_scores": scores,
            "classification": classification,
            "original_classification": original_class,
            "is_overridden": is_overridden,
            "reasoning": reasoning,
            "matched_skills": [s.title() for s in matched_mandatory],
            "missing_skills": [s.title() for s in missing_mandatory]
        }
