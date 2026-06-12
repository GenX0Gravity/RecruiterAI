import re
from typing import List, Dict, Tuple

class CareerGrowthPredictor:
    """
    Career Growth Predictor Engine.
    Analyzes candidate skills, experience years, certifications, and projects
    to forecast promotion readiness, salary projections, career tracks, and roadmaps.
    """

    def estimate_experience_years(self, parsed_data: dict) -> float:
        """Estimate experience years from candidate history."""
        # Check if ranking engine or scorer already estimated it
        intel = parsed_data.get("Intelligence", {})
        if "ExperienceScore" in intel:
            # map back roughly: e.g. 50 score = 2 yrs, 80 score = 5 yrs
            score = intel["ExperienceScore"]
            if score <= 50:
                return round(score / 25.0, 1)
            else:
                return round(2.0 + (score - 50) / 10.0, 1)
        
        # Fallback to basic text parsing from Experience list
        experience = parsed_data.get("Experience", [])
        if not experience:
            return 0.0
            
        import datetime
        current_year = datetime.datetime.now().year
        total_months = 0
        
        for exp in experience:
            duration = exp.get("Duration", "") if isinstance(exp, dict) else str(exp)
            years_found = re.findall(r'\b(20\d{2}|19\d{2})\b', duration)
            is_present = bool(re.search(r'present|current|now', duration, re.I))
            
            if len(years_found) >= 2:
                total_months += (int(years_found[-1]) - int(years_found[0])) * 12
            elif len(years_found) == 1 and is_present:
                total_months += (current_year - int(years_found[0])) * 12
            else:
                total_months += 12  # default 1 year
                
        return round(total_months / 12.0, 1)

    def predict_growth(self, parsed_data: dict, candidate_id: int) -> dict:
        """
        Runs analysis to predict promotion, roadmaps, salaries, and tracks.
        """
        # 1. Experience & specialization
        exp_years = self.estimate_experience_years(parsed_data)
        skills = [s.lower() for s in parsed_data.get("Skills", [])]
        certs = parsed_data.get("Certifications", [])
        projects = parsed_data.get("Projects", [])

        # Determine specialization
        spec = "Software Engineer"
        if any(s in skills for s in ["pytorch", "tensorflow", "nlp", "machine learning", "deep learning"]):
            spec = "Machine Learning Engineer"
        elif any(s in skills for s in ["kubernetes", "docker", "aws", "gcp", "azure", "devops", "cicd"]):
            spec = "DevOps Cloud Engineer"
        elif any(s in skills for s in ["react", "angular", "vue", "html", "css", "javascript", "typescript"]) and not any(s in skills for s in ["django", "flask", "fastapi", "spring", "node.js"]):
            spec = "Frontend Developer"

        # 2. Promotion Readiness Score
        readiness_score = 30
        if exp_years >= 8: readiness_score += 40
        elif exp_years >= 4: readiness_score += 25
        elif exp_years >= 2: readiness_score += 15

        # Check existing title seniority
        experience = parsed_data.get("Experience", [])
        current_title = ""
        if experience:
            exp_first = experience[0]
            current_title = exp_first.get("Role", "") if isinstance(exp_first, dict) else str(exp_first)
            
        t_lower = current_title.lower()
        if any(w in t_lower for w in ["senior", "lead", "principal", "manager", "head"]):
            readiness_score += 10
            
        if len(projects) >= 2: readiness_score += 10
        if len(certs) >= 1: readiness_score += 10
        
        readiness_score = min(100, readiness_score)
        
        # Status rating
        if readiness_score >= 85:
            readiness_status = "High Readiness (Promote Immediately)"
            timeline_to_promotion = "0 - 6 Months"
        elif readiness_score >= 60:
            readiness_status = "Moderate Readiness (Prep Phase)"
            timeline_to_promotion = "6 - 12 Months"
        else:
            readiness_status = "Development Phase (Upskilling)"
            timeline_to_promotion = "12 - 24 Months"

        # 3. Next Suitable Roles
        if exp_years < 2:
            suitable_roles = [f"Software Engineer I ({spec})", "Associate Web Developer", "Junior Backend Engineer"]
            ic_track = ["Associate Engineer", "Software Engineer II", "Senior Engineer", "Tech Lead", "Architect"]
            mgmt_track = ["Associate Engineer", "Software Engineer II", "Senior Engineer", "Scrum Master", "Engineering Lead"]
        elif exp_years < 5:
            suitable_roles = [f"Senior Software Engineer ({spec})", "Technical Lead", "System Design Consultant"]
            ic_track = [f"Software Engineer", f"Senior {spec}", "Tech Lead", "Software Architect", "Principal Engineer"]
            mgmt_track = [f"Software Engineer", f"Senior {spec}", "Engineering Lead", "Engineering Manager", "Director"]
        else:
            suitable_roles = ["Software Architect", "Engineering Manager", "Principal Infrastructure Consultant"]
            ic_track = [f"Senior {spec}", "Tech Lead", "Software Architect", "Principal Architect", "CTO / Fellow"]
            mgmt_track = [f"Senior {spec}", "Engineering Lead", "Engineering Manager", "Director of Engineering", "VP of Engineering"]

        # 4. Salary projections (preserve USD/INR currency flags)
        salary_val = parsed_data.get("SalaryExpectation")
        salary_cur = parsed_data.get("SalaryCurrency", "USD")

        # Fallback seed if missing
        if salary_val is None:
            if any(k in parsed_data.get("Contact", {}).get("Location", "").lower() for k in ["india", "bengaluru", "mumbai"]):
                salary_val = int(400000 + (exp_years * 200000))
                salary_cur = "INR"
            else:
                salary_val = int(70000 + (exp_years * 10000))
                salary_cur = "USD"

        # Trajectory projections
        sal_1yr = int(salary_val * 1.12)
        sal_3yr = int(salary_val * 1.45)
        sal_5yr = int(salary_val * 1.95)

        # Format salary display helper
        def format_sal(val: int) -> str:
            if salary_cur == "INR":
                return f"₹{(val // 100000)} Lakhs"
            return f"${(val // 1000):,}k"

        # 5. Phased roadmaps
        # 1-Year Roadmap details
        roadmap_1yr = {
            "goals": [
                "Acquire advanced domain competencies to handle core sub-system components independently.",
                "Complete a high-impact architectural redesign or code release challenge.",
                "Obtain 1 professional industry certification matching tech stack."
            ],
            "skills": ["System Design Basics", "Unit Testing Frameworks", "Advanced SQL queries"],
            "deliverable": "A production-ready code feature designed, implemented, and fully tested by candidate."
        }
        
        # 3-Year Roadmap details
        roadmap_3yr = {
            "goals": [
                "Transition towards system scale ownership, defining cross-functional API boundaries.",
                "Champion DevOps container orchestration and cloud scaling scripts.",
                "Mentor 2 junior developers and run technical workshops."
            ],
            "skills": ["Distributed Architecture", "Kubernetes / Docker", "Agile Leadership"],
            "deliverable": "Successfully migrated legacy microservice or led a core database partition project."
        }
        
        # 5-Year Roadmap details
        roadmap_5yr = {
            "goals": [
                "Steer department-wide technology strategies and vendor alignments.",
                "Participate in product planning roadmap designs and budgets scaling.",
                "Establish coding standards guidelines and system security parameters."
            ],
            "skills": ["Strategic Management", "Financial Budgeting", "Enterprise Networking Scale"],
            "deliverable": "Designed a global-scale platform layer handling 10x peak loads safely."
        }

        # 6. Recommendations
        recommendations = []
        if not certs:
            recommendations.append("Obtain an industry-recognized cloud/tech certification (e.g. AWS Associate Developer or CKA) within 6 months.")
        if len(projects) < 2:
            recommendations.append("Build 2 side projects showcasing modern frameworks (like FastAPI or React) on a public GitHub portfolio.")
        if exp_years >= 4 and not any("lead" in s or "mgmt" in s for s in skills):
            recommendations.append("Mentor junior engineers or run design workshops to demonstrate readiness for leadership roles.")
        if not any(s in skills for s in ["docker", "kubernetes", "jenkins"]):
            recommendations.append("Incorporate DevOps tools (Docker / basic CI pipelines) into your personal projects to build deployment versatility.")

        # Final recommendations fallback
        if not recommendations:
            recommendations.append("Familiarize yourself with enterprise system design parameters (caching patterns, database indexing).")
            recommendations.append("Contribute to open-source software libraries or lead technical talks to enhance professional visibility.")

        return {
            "promotion_readiness_pct": readiness_score,
            "readiness_status": readiness_status,
            "timeline_to_promotion": timeline_to_promotion,
            "suitable_roles": suitable_roles,
            "salary_currency": salary_cur,
            "salary_current": format_sal(salary_val),
            "salary_projections": {
                "1_year": format_sal(sal_1yr),
                "3_year": format_sal(sal_3yr),
                "5_year": format_sal(sal_5yr)
            },
            "ic_track": ic_track,
            "management_track": mgmt_track,
            "roadmaps": {
                "1_year": roadmap_1yr,
                "3_year": roadmap_3yr,
                "5_year": roadmap_5yr
            },
            "recommendations": recommendations[:3]
        }
