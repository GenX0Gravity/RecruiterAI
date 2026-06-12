import re
import json
import datetime
from typing import List, Dict, Tuple, Optional
from job_matching import JobMatcher

DEGREE_TIER_SCORES = {
    "PhD": 100, "Masters": 85, "MBA": 80,
    "Bachelors": 70, "Diploma": 50, "Associate": 45, "None": 30
}

class RankingEngine:
    """
    Candidate Ranking & Leaderboard Engine.
    Computes individual candidate dimensions, seeds missing attributes,
    filters candidates, and generates a ranked leaderboard.
    """
    def __init__(self):
        self.matcher = JobMatcher()

    def get_years_experience(self, parsed_data: dict) -> float:
        """Estimate candidate's total years of experience from their history."""
        experience = parsed_data.get("Experience", [])
        if not experience:
            return 0.0

        total_months = 0
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
        """Find candidate's highest degree level."""
        education = parsed_data.get("Education", [])
        if not education:
            return "None"

        highest_score = 0
        highest_degree = "None"
        for edu in education:
            degree = edu.get("Degree", "") if isinstance(edu, dict) else str(edu)
            deg_clean = "Bachelors"
            d_lower = degree.lower()
            if "phd" in d_lower or "doctor" in d_lower:
                deg_clean = "PhD"
            elif "master" in d_lower or "msc" in d_lower or "ms " in d_lower or d_lower == "ms":
                deg_clean = "Masters"
            elif "mba" in d_lower:
                deg_clean = "MBA"
            elif "bachelor" in d_lower or "bsc" in d_lower or "btech" in d_lower or "be " in d_lower or d_lower == "be" or "ba" in d_lower:
                deg_clean = "Bachelors"
            elif "diploma" in d_lower:
                deg_clean = "Diploma"
            elif "associate" in d_lower:
                deg_clean = "Associate"

            score = DEGREE_TIER_SCORES.get(deg_clean, 30)
            if score > highest_score:
                highest_score = score
                highest_degree = deg_clean

        return highest_degree

    def seed_missing_attributes(self, parsed_data: dict, candidate_id: int) -> Tuple[int, str, str, bool]:
        """
        Seeds SalaryExpectation and Availability deterministically based on location and name.
        Returns (salary_value, salary_currency, availability_status, is_modified)
        """
        modified = False
        
        # 1. Location and Salary Expectation
        contact = parsed_data.get("Contact", {})
        location = contact.get("Location", "").lower() if isinstance(contact, dict) else ""
        exp_years = self.get_years_experience(parsed_data)
        
        # Check if salary expectation is already in parsed_data
        salary_val = parsed_data.get("SalaryExpectation")
        salary_cur = parsed_data.get("SalaryCurrency", "USD")
        
        if salary_val is None:
            # Seed based on location
            is_india = any(k in location for k in ["india", "bengaluru", "mumbai", "delhi", "chennai", "pune", "hyderabad", "noida", "gurgaon"])
            if is_india:
                # Mock salary in INR lakhs, e.g. 4L base + 2.2L per year of experience
                lakhs = 4.0 + (exp_years * 2.2)
                lakhs = min(30.0, max(4.0, lakhs))
                salary_val = int(lakhs * 100000)
                salary_cur = "INR"
            else:
                # Mock salary in USD, e.g. 70k base + 12k per year of experience
                usd = 70.0 + (exp_years * 12.0)
                usd = min(180.0, max(60.0, usd))
                salary_val = int(usd * 1000)
                salary_cur = "USD"
            
            parsed_data["SalaryExpectation"] = salary_val
            parsed_data["SalaryCurrency"] = salary_cur
            modified = True
            
        # 2. Availability
        availability = parsed_data.get("Availability")
        if availability is None:
            # Seed deterministically based on candidate ID
            buckets = ["Immediate", "15 Days", "30 Days", "90 Days"]
            availability = buckets[candidate_id % len(buckets)]
            parsed_data["Availability"] = availability
            modified = True
            
        return salary_val, salary_cur, availability, modified

    def calculate_scores(self, parsed_data: dict, candidate_id: int, job_description: str = None) -> dict:
        """
        Computes all ranking scores for a candidate.
        """
        # Seeding
        salary_val, salary_cur, availability, _ = self.seed_missing_attributes(parsed_data, candidate_id)
        
        # 1. Technical Score (0-100)
        # Pull from CandidateScorer Intelligence report or fallback
        intel = parsed_data.get("Intelligence", {})
        tech_score = intel.get("TechnicalScore")
        if tech_score is None:
            flat_skills = parsed_data.get("Skills", [])
            tech_score = min(len(flat_skills) * 4.5, 100)
            
        # 2. Experience Score (0-100)
        exp_score = intel.get("ExperienceScore")
        exp_years = self.get_years_experience(parsed_data)
        if exp_score is None:
            # Estimate basic experience score: 0=0, 2yr=50, 5yr=80, 8+yr=100
            if exp_years <= 0: exp_score = 0
            elif exp_years <= 2: exp_score = int(exp_years * 25)
            elif exp_years <= 5: exp_score = 50 + int((exp_years - 2) * 10)
            else: exp_score = 80 + min(int((exp_years - 5) * 6.5), 20)
            
        # 3. Education Score (0-100)
        edu_score = intel.get("EducationScore")
        highest_deg = self.get_highest_degree(parsed_data)
        if edu_score is None:
            edu_score = DEGREE_TIER_SCORES.get(highest_deg, 30)

        # 4. Certifications Score (0-100)
        certs = parsed_data.get("Certifications", [])
        cert_score = min(len(certs) * 25, 100)

        # 5. Project Quality Score (0-100)
        # Check projects structure
        projects = parsed_data.get("Projects", [])
        if projects:
            proj_score = len(projects) * 20
            for p in projects:
                if isinstance(p, dict):
                    if p.get("GitHub"): proj_score += 15
                    if p.get("Demo"): proj_score += 15
            proj_score = min(proj_score, 100)
        else:
            proj_score = 30 # default baseline for no projects
            
        # 6. Job Match % (0-100)
        job_match_score = 0
        matching_skills = []
        missing_skills = []
        if job_description:
            jd_analysis = self.matcher.analyze_jd(job_description)
            match_data = self.matcher.match_candidate(parsed_data, jd_analysis)
            job_match_score = match_data.get("match_percentage", 0)
            matching_skills = match_data.get("matching_skills", [])
            missing_skills = match_data.get("missing_skills", [])
            
        # 7. Composite Score Calculation
        if job_description:
            # Job Match weighting: heavy match weight
            composite = (
                job_match_score * 0.40 +
                tech_score * 0.15 +
                exp_score * 0.15 +
                edu_score * 0.10 +
                cert_score * 0.10 +
                proj_score * 0.10
            )
        else:
            # Standard balanced weighting
            composite = (
                tech_score * 0.30 +
                exp_score * 0.25 +
                edu_score * 0.15 +
                cert_score * 0.15 +
                proj_score * 0.15
            )
            
        composite_score = round(min(100, max(0, composite)))
        
        # Format salary expectation display
        if salary_cur == "INR":
            salary_formatted = f"₹{salary_val // 100000} Lakhs"
        else:
            salary_formatted = f"${salary_val // 1000:,}"

        return {
            "technical_score": int(tech_score),
            "experience_score": int(exp_score),
            "experience_years": exp_years,
            "education_score": int(edu_score),
            "highest_degree": highest_deg,
            "certifications_score": int(cert_score),
            "certifications_count": len(certs),
            "project_score": int(proj_score),
            "job_match_score": int(job_match_score),
            "composite_score": composite_score,
            "salary_expectation": salary_val,
            "salary_currency": salary_cur,
            "salary_formatted": salary_formatted,
            "availability": availability,
            "matching_skills": matching_skills,
            "missing_skills": missing_skills
        }

    def rank_and_filter_candidates(
        self, 
        candidates_db_list: list, 
        filters: dict, 
        job_description: str = None
    ) -> list:
        """
        Processes database candidates: computes scores, filters, ranks, and sorts them.
        """
        ranked = []
        
        # Extract filters
        filter_skills = [s.strip().lower() for s in filters.get("skills", "").split(",") if s.strip()]
        min_exp = float(filters.get("min_experience") or 0)
        filter_loc = filters.get("location", "").strip().lower()
        max_sal = int(filters.get("max_salary") or 99999999)
        filter_avail = filters.get("availability", "All")
        
        for c in candidates_db_list:
            parsed_data = c.get_parsed_data()
            scores_data = self.calculate_scores(parsed_data, c.id, job_description)
            
            # --- FILTERING ---
            
            # 1. Skill Filter (candidate must possess all filtered skills)
            cand_skills = [s.lower() for s in parsed_data.get("Skills", [])]
            if filter_skills:
                matches_skills = True
                for fs in filter_skills:
                    # check for substring match or exact match
                    if not any(fs in cs for cs in cand_skills):
                        matches_skills = False
                        break
                if not matches_skills:
                    continue
                    
            # 2. Experience Filter
            if scores_data["experience_years"] < min_exp:
                continue
                
            # 3. Location Filter
            contact = parsed_data.get("Contact", {})
            loc = contact.get("Location", "").lower() if isinstance(contact, dict) else ""
            if filter_loc and filter_loc not in loc:
                continue
                
            # 4. Salary Filter
            # Standardize Indian Rupees to USD equivalent roughly for joint filtering if needed,
            # or filter in absolute value based on currency.
            # For simplicity: if a maximum salary is specified, check against it.
            # If recruiter filters by Max Salary, check the candidate's salary expectation.
            # US candidates ($70k-$180k) vs Indian (₹4L-₹30L = 400,000-3,000,000).
            # To avoid currency mismatch bugs, we check if max_sal is set (default very high).
            # If salary is in USD, and filter is like 120000, match USD.
            # If salary is in INR, and filter is like 15L (1500000), match INR.
            # We will handle it by matching absolute value <= max_sal.
            if max_sal < 99999999:
                if scores_data["salary_expectation"] > max_sal:
                    continue
                    
            # 5. Availability Filter
            if filter_avail != "All" and scores_data["availability"] != filter_avail:
                continue
                
            # Compile listing entry
            ranked.append({
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "location": contact.get("Location", "Remote") if isinstance(contact, dict) else "Remote",
                "scores": scores_data,
                "skills_preview": cand_skills[:5]
            })

        # --- SORTING ---
        sort_by = filters.get("sort_by", "composite_score")
        sort_order = filters.get("sort_order", "desc")
        
        def get_sort_key(item):
            # Sort by sub-field in 'scores'
            return item["scores"].get(sort_by, 0)

        is_reverse = (sort_order == "desc")
        ranked.sort(key=get_sort_key, reverse=is_reverse)
        
        # --- RANK NUMBER SEEDING ---
        for i, item in enumerate(ranked):
            item["rank"] = i + 1
            
        return ranked
