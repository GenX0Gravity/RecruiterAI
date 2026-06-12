import re
import json
import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from database import Candidate

class ResumeVerifier:
    """
    Core engine for resume authenticity audits, date consistency checking,
    skill inflation calculations, and warning flags logging.
    """

    def analyze_authenticity(self, cand_id: int, db: Session) -> dict:
        """
        Analyzes a candidate resume for various risk factors and generates safety scores.
        """
        candidate = db.query(Candidate).filter(Candidate.id == cand_id).first()
        if not candidate:
            return {
                "authenticity_score": 0,
                "risk_score": 100,
                "trust_score": 0,
                "flags": [{"type": "System Error", "severity": "High", "description": "Candidate record not found in database."}],
                "timeline_details": [],
                "skill_inflation_details": {},
                "duplicate_details": []
            }

        parsed = candidate.get_parsed_data()
        experience = parsed.get("Experience", [])
        skills = parsed.get("Skills", [])
        certs = parsed.get("Certifications", [])
        contact = parsed.get("Contact", {})

        flags = []
        deductions = 0
        current_year = datetime.datetime.now().year

        # ── 1. DUPLICATE RESUME CHECK ──
        duplicates = []
        all_candidates = db.query(Candidate).filter(Candidate.id != cand_id).all()
        for c in all_candidates:
            # check email match
            if candidate.email and c.email and candidate.email.lower() == c.email.lower():
                duplicates.append({"id": c.id, "name": c.name, "email": c.email, "type": "Exact Email Match"})
            # check close name match and similar skills count
            elif candidate.name.lower() == c.name.lower():
                c_parsed = c.get_parsed_data()
                if len(c_parsed.get("Skills", [])) == len(skills):
                    duplicates.append({"id": c.id, "name": c.name, "email": c.email or "N/A", "type": "Identical Name & Skill Count"})

        if duplicates:
            severity = "High"
            desc = f"Identified duplicate submission(s) in active catalog: {', '.join([d['name'] + ' (ID: ' + str(d['id']) + ')' for d in duplicates])}."
            flags.append({"type": "Duplicate Resume Submission", "severity": severity, "description": desc})
            deductions += 30

        # ── 2. PARSE CHRONOLOGICAL TIMELINE & CHECK DATES ──
        timeline = []
        total_exp_years = 0
        
        # Date regex parser
        year_re = re.compile(r'\b(?:19|20)\d{2}\b')

        for idx, exp in enumerate(experience):
            comp = exp.get("Company", "Generic Company")
            role = exp.get("Role", "Software Developer")
            dur = exp.get("Duration", "")
            
            # Find years
            years = [int(y) for y in year_re.findall(dur)]
            start_year = None
            end_year = None
            
            if len(years) >= 2:
                start_year = min(years)
                end_year = max(years)
            elif len(years) == 1:
                start_year = years[0]
                if any(w in dur.lower() for w in ["present", "current", "now"]):
                    end_year = current_year
                else:
                    end_year = start_year
            
            if start_year and end_year:
                timeline.append({
                    "company": comp,
                    "role": role,
                    "start": start_year,
                    "end": end_year,
                    "duration_text": dur
                })
                total_exp_years += (end_year - start_year)

        # Sort timeline chronologically (earliest first)
        timeline = sorted(timeline, key=lambda x: x["start"])

        # Check overlapping dates and gaps
        has_overlap = False
        has_inconsistent = False
        gaps_found = []

        for idx, item in enumerate(timeline):
            # Inconsistent: start > end
            if item["start"] > item["end"]:
                has_inconsistent = True
                flags.append({
                    "type": "Inconsistent Date Order",
                    "severity": "High",
                    "description": f"Experience item at '{item['company']}' lists start year ({item['start']}) after end year ({item['end']})."
                })
                deductions += 20
            
            if idx > 0:
                prev = timeline[idx - 1]
                # Overlap check
                if item["start"] < prev["end"]:
                    # Overlap is only major if it exceeds 1 year (to allow parallel short gigs / transitions)
                    overlap_years = prev["end"] - item["start"]
                    if overlap_years >= 1:
                        has_overlap = True
                        flags.append({
                            "type": "Overlapping Work Timelines",
                            "severity": "High",
                            "description": f"Overlapping timeline detected: Working at '{prev['company']}' (ends {prev['end']}) concurrently with '{item['company']}' (starts {item['start']})."
                        })
                        deductions += 25
                
                # Gap check
                gap_years = item["start"] - prev["end"]
                if gap_years > 1:
                    gaps_found.append({
                        "after": prev["company"],
                        "before": item["company"],
                        "years": gap_years
                    })
                    flags.append({
                        "type": "Suspicious Employment Gap",
                        "severity": "Medium",
                        "description": f"Unexplained employment gap of {gap_years} years between leaving '{prev['company']}' and joining '{item['company']}'."
                    })
                    deductions += 10

        # ── 3. SKILL INFLATION AUDIT ──
        skill_count = len(skills)
        exp_years_clamped = max(1, total_exp_years)
        skill_ratio = round(skill_count / exp_years_clamped, 1)

        is_inflated = False
        if skill_count > 15 and total_exp_years <= 1:
            is_inflated = True
            flags.append({
                "type": "High Skill Inflation Index",
                "severity": "High",
                "description": f"Candidate profile claims {skill_count} advanced competencies with less than 1 year of total work history."
            })
            deductions += 20
        elif skill_count > 25 and total_exp_years <= 3:
            is_inflated = True
            flags.append({
                "type": "Moderate Skill Inflation Index",
                "severity": "Medium",
                "description": f"Candidate lists {skill_count} frameworks/tools relative to {total_exp_years} years experience (Ratio: {skill_ratio} skills/yr)."
            })
            deductions += 10

        # ── 4. SUSPICIOUS/FAKE WORK HISTORIES ──
        for exp in experience:
            comp = exp.get("Company", "").lower()
            role = exp.get("Role", "").lower()
            resps = exp.get("Responsibilities", [])
            
            is_suspicious_comp = any(w in comp for w in ["stealth", "self-employed", "freelancer", "freelance", "independent consultant"])
            if is_suspicious_comp and len(resps) <= 1:
                flags.append({
                    "type": "Vague Chronological Reference",
                    "severity": "Medium",
                    "description": f"Employment record at '{exp.get('Company')}' is flagged as generic/self-declared with zero quantifiable achievements."
                })
                deductions += 15

        # ── 5. SCORE MATHEMATICS ──
        # Clamp scores
        authenticity_score = max(10, 100 - deductions)
        risk_score = 100 - authenticity_score
        
        # Trust score is calculated based on presence of verified items
        trust_base = 70
        if contact.get("LinkedIn"):
            trust_base += 10
        if candidate.email and "@" in candidate.email:
            trust_base += 10
        if len(certs) > 0:
            trust_base += 10
            
        # Deduct flags impact
        trust_score = max(10, min(100, trust_base - int(deductions * 0.5)))

        return {
            "authenticity_score": int(authenticity_score),
            "risk_score": int(risk_score),
            "trust_score": int(trust_score),
            "flags": flags,
            "timeline_details": timeline,
            "skill_inflation_details": {
                "skill_count": skill_count,
                "experience_years": total_exp_years,
                "ratio_skills_per_year": skill_ratio,
                "is_inflated": is_inflated
            },
            "duplicate_details": duplicates
        }
