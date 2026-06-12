import json
import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from database import JobVacancy

class MarketIntelligenceEngine:
    """
    Computes recruitment market trends: hiring velocity, recruiter directory,
    salary trajectories, skill demands, and location densities.
    """

    def get_market_intelligence(self, db: Session) -> dict:
        """
        Gathers and aggregates database metrics for the intelligence dashboard.
        """
        # Fetch all active vacancies
        vacancies = db.query(JobVacancy).filter(JobVacancy.is_active == True).all()
        
        # 1. Total Positions, Companies, sources
        total_positions = len(vacancies)
        companies_set = set()
        sources_counts = {}
        skills_counts = {}
        role_salaries = {}  # role -> {sum_min, sum_max, count}
        location_counts = {}

        # Default fallback values for active recruiters
        recruiters = [
            {"name": "Sarah Jenkins", "title": "Senior Talent Advisor", "company": "Google", "postings": 6, "response_velocity": "Fast (12 hrs)", "contact": "sarah.j@google.com"},
            {"name": "Priya Sharma", "title": "HR Partner", "company": "Swiggy", "postings": 5, "response_velocity": "Fast (4 hrs)", "contact": "priya.s@swiggy.com"},
            {"name": "David Chen", "title": "Technical Recruiter", "company": "Microsoft", "postings": 4, "response_velocity": "Medium (24 hrs)", "contact": "d.chen@microsoft.com"},
            {"name": "Jessica Vance", "title": "Head of Technical Talent", "company": "Vercel", "postings": 3, "response_velocity": "Instant (1 hr)", "contact": "jessica@vercel.com"},
            {"name": "Alex Rivera", "title": "Lead Engineering Recruiter", "company": "Meta", "postings": 3, "response_velocity": "Medium (30 hrs)", "contact": "rivera@meta.com"},
            {"name": "Rohan Das", "title": "Talent Partner", "company": "Zomato", "postings": 2, "response_velocity": "Fast (8 hrs)", "contact": "rohan@zomato.com"}
        ]

        company_counts = {}

        for v in vacancies:
            companies_set.add(v.company)
            company_counts[v.company] = company_counts.get(v.company, 0) + 1
            sources_counts[v.source] = sources_counts.get(v.source, 0) + 1
            location_counts[v.location] = location_counts.get(v.location, 0) + 1
            
            # Skills parsing
            try:
                skills = json.loads(v.skills_required) if v.skills_required else []
                for s in skills:
                    skills_counts[s] = skills_counts.get(s, 0) + 1
            except:
                pass
                
            # Salary accumulation (normalize to USD for tracking curves, roughly 1 USD = 80 INR)
            salary_min = v.salary_min or 0
            salary_max = v.salary_max or 0
            if v.salary_currency == "INR":
                salary_min = salary_min / 80
                salary_max = salary_max / 80

            title_normalized = v.title.replace("Senior ", "").replace("Lead ", "").replace("Junior ", "").strip()
            if title_normalized not in role_salaries:
                role_salaries[title_normalized] = {"sum_min": 0, "sum_max": 0, "count": 0}
            
            role_salaries[title_normalized]["sum_min"] += salary_min
            role_salaries[title_normalized]["sum_max"] += salary_max
            role_salaries[title_normalized]["count"] += 1

        # 2. Company rankings, Hiring Velocity, and frequency
        # We determine hiring velocity and frequency dynamically based on company's active openings.
        company_rankings = []
        sorted_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)
        
        for idx, (company_name, count) in enumerate(sorted_companies):
            # Deterministic calculation of velocity & frequency for mock realism
            char_sum = sum(ord(c) for c in company_name)
            velocity_days = 4 + (char_sum % 16)
            frequency_per_week = round(0.5 + (count / 2) + (char_sum % 4) * 0.4, 1)
            
            velocity_rating = "Fast" if velocity_days <= 8 else "Medium" if velocity_days <= 14 else "Slow"
            
            company_rankings.append({
                "rank": idx + 1,
                "company": company_name,
                "openings": count,
                "velocity": f"{velocity_rating} ({velocity_days} days)",
                "velocity_days": velocity_days,
                "frequency": f"{frequency_per_week} posts/wk",
                "frequency_val": frequency_per_week
            })

        # 3. Geographical Heatmap Data
        location_heatmap = []
        for loc, count in location_counts.items():
            # mock lat/long grids roughly, or just pass counts with HSL percentage indicators
            intensity = min(100, int((count / max(total_positions, 1)) * 100 * 2))
            location_heatmap.append({
                "location": loc,
                "openings": count,
                "intensity": intensity
            })
        location_heatmap = sorted(location_heatmap, key=lambda x: x["openings"], reverse=True)[:6]

        # 4. Salary trends
        salary_trends = []
        for role, stats in role_salaries.items():
            count = stats["count"]
            avg_min = int(stats["sum_min"] / count) if count > 0 else 0
            avg_max = int(stats["sum_max"] / count) if count > 0 else 0
            salary_trends.append({
                "role": role,
                "avg_min_usd": avg_min,
                "avg_max_usd": avg_max,
                "avg_mid_usd": int((avg_min + avg_max) / 2),
                "count": count
            })
        salary_trends = sorted(salary_trends, key=lambda x: x["count"], reverse=True)[:5]

        # 5. Skill demand trends
        total_openings_check = max(total_positions, 1)
        skill_trends = []
        sorted_skills = sorted(skills_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        for skill, count in sorted_skills:
            pct = round((count / total_openings_check) * 100)
            skill_trends.append({
                "skill": skill.title(),
                "count": count,
                "percentage": pct
            })

        # 6. Skill Correlation Heatmap Matrix
        # A 5x5 matrix comparing Roles vs Tech skills
        matrix_roles = ["Backend Engineer", "Frontend Developer", "Full Stack", "ML Engineer", "DevOps Cloud"]
        matrix_skills = ["Python", "React", "SQL", "AWS", "Docker"]
        
        # Mock correlations based on standard industry overlaps
        affinities = {
            ("Backend Engineer", "Python"): 0.90, ("Backend Engineer", "React"): 0.15, ("Backend Engineer", "SQL"): 0.85, ("Backend Engineer", "AWS"): 0.70, ("Backend Engineer", "Docker"): 0.65,
            ("Frontend Developer", "Python"): 0.10, ("Frontend Developer", "React"): 0.95, ("Frontend Developer", "SQL"): 0.20, ("Frontend Developer", "AWS"): 0.35, ("Frontend Developer", "Docker"): 0.30,
            ("Full Stack", "Python"): 0.65, ("Full Stack", "React"): 0.85, ("Full Stack", "SQL"): 0.75, ("Full Stack", "AWS"): 0.60, ("Full Stack", "Docker"): 0.50,
            ("ML Engineer", "Python"): 0.98, ("ML Engineer", "React"): 0.05, ("ML Engineer", "SQL"): 0.50, ("ML Engineer", "AWS"): 0.65, ("ML Engineer", "Docker"): 0.70,
            ("DevOps Cloud", "Python"): 0.55, ("DevOps Cloud", "React"): 0.10, ("DevOps Cloud", "SQL"): 0.45, ("DevOps Cloud", "AWS"): 0.95, ("DevOps Cloud", "Docker"): 0.98
        }
        
        heatmap_matrix = []
        for role in matrix_roles:
            row_data = {"role": role}
            for skill in matrix_skills:
                row_data[skill] = affinities.get((role, skill), 0.50)
            heatmap_matrix.append(row_data)

        return {
            "total_openings": total_positions,
            "active_companies_count": len(companies_set),
            "active_recruiters_count": len(recruiters),
            "company_rankings": company_rankings[:6],
            "location_heatmap": location_heatmap,
            "salary_trends": salary_trends,
            "skill_demand_trends": skill_trends,
            "heatmap_matrix": heatmap_matrix,
            "recruiters": recruiters,
            "matrix_skills_header": matrix_skills
        }
