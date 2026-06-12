import re
import json
from typing import List, Dict
from sqlalchemy.orm import Session
from database import Candidate

class HiringCopilotEngine:
    """
    Conversational Recruiter Search & Talent Assistant.
    Parses natural language recruiter queries, queries the database, and returns
    conversational text responses with structured candidate match summaries.
    """

    def query_copilot(self, query_text: str, db: Session) -> dict:
        """
        Processes a natural language query over candidate records.
        """
        query_lower = query_text.lower().strip()
        candidates = db.query(Candidate).all()
        
        # Parse targets
        matched_candidates = []
        filter_reason = ""
        intent_type = "general"

        # 1. SCORE THRESHOLD INTENT
        # Matches: "above 80%", "greater than 75", "JD above 80"
        score_match = re.search(r'(?:above|greater than|over|>=|>)\s*(\d+)\s*%?', query_lower)
        if not score_match:
            # Try matching: "80%+", "80 plus", etc.
            score_match = re.search(r'(\d+)\s*%\s*(?:\+|-|plus|above)?', query_lower)

        # 2. CERTIFICATION INTENT
        is_cert_query = any(w in query_lower for w in ["certification", "certified", "certifications", "certs", "cert"])
        target_cert = None
        if is_cert_query:
            intent_type = "certification"
            # Extract cert subject
            for tech in ["aws", "amazon", "oracle", "docker", "kubernetes", "scrum", "pmp", "azure"]:
                if tech in query_lower:
                    target_cert = tech
                    break

        # 3. LEADERSHIP INTENT
        is_leadership_query = any(w in query_lower for w in ["leadership", "leader", "manager", "management", "lead", "director", "vp", "architect"])
        if is_leadership_query:
            intent_type = "leadership"

        # 4. SKILLS INTENT
        # Scan for common technology terms in query
        detected_skills = []
        for skill_kw in ["react", "python", "javascript", "sql", "aws", "docker", "kubernetes", "fastapi", "node", "typescript", "golang", "machine learning", "html", "css"]:
            # Word bound match to avoid substring collision (e.g. "go" in "good")
            if re.search(rf'\b{skill_kw}\b', query_lower):
                detected_skills.append(skill_kw)
        
        if detected_skills and not is_cert_query:
            intent_type = "skills"

        # Filter loop
        for c in candidates:
            parsed = c.get_parsed_data()
            cand_skills = [s.lower() for s in parsed.get("Skills", [])]
            
            # Check matches based on parsed intent
            is_match = False
            reason = ""
            
            if score_match:
                # Score threshold filter
                threshold = int(score_match.group(1))
                if c.overall_score >= threshold or c.technical_score >= threshold:
                    is_match = True
                    reason = f"Composite score of {int(c.overall_score)}% matches your requirement of >={threshold}%."
                    
            elif target_cert:
                # Certification filter
                certs = parsed.get("Certifications", [])
                for cert in certs:
                    cert_name = cert.get("Name", "").lower() if isinstance(cert, dict) else str(cert).lower()
                    cert_issuer = cert.get("Issuer", "").lower() if isinstance(cert, dict) else ""
                    if target_cert in cert_name or target_cert in cert_issuer:
                        is_match = True
                        reason = f"Possesses certification: '{cert.get('Name') if isinstance(cert, dict) else cert}'."
                        break
                        
            elif is_leadership_query:
                # Leadership filter
                # Search job titles in experience
                exp_list = parsed.get("Experience", [])
                has_lead_title = False
                for exp in exp_list:
                    role_title = exp.get("Role", "").lower()
                    if any(w in role_title for w in ["lead", "manager", "director", "vp", "architect", "head", "principal"]):
                        has_lead_title = True
                        reason = f"Held leadership role: '{exp.get('Role')}' at {exp.get('Company')}."
                        break
                
                if has_lead_title:
                    is_match = True
                elif any(w in [s.lower() for s in parsed.get("Skills", [])] for w in ["leadership", "management", "agile"]):
                    is_match = True
                    reason = "Lists leadership or project management skills in profile competency lists."
                    
            elif detected_skills:
                # Skills filter
                matches = [ds for ds in detected_skills if ds in cand_skills]
                if matches:
                    is_match = True
                    reason = f"Matches required skills: {', '.join([m.title() for m in matches])}."

            else:
                # General query keyword match
                # Check candidate name or overall high rating
                if query_lower in c.name.lower():
                    is_match = True
                    reason = f"Matches keyword search in candidate name."
                elif c.overall_score >= 70:
                    is_match = True
                    reason = f"Top-rated profile (score: {int(c.overall_score)}%) matching general talent search."

            if is_match:
                # Extract contact
                contact = parsed.get("Contact", {})
                emails = contact.get("Emails", [c.email or "N/A"])
                phones = contact.get("Phones", [c.phone or "N/A"])
                location = contact.get("Location", "N/A")
                
                matched_candidates.append({
                    "id": c.id,
                    "name": c.name,
                    "email": emails[0] if emails else "N/A",
                    "phone": phones[0] if phones else "N/A",
                    "location": location,
                    "overall_score": int(c.overall_score),
                    "technical_score": int(c.technical_score),
                    "skills": parsed.get("Skills", [])[:6],
                    "matched_reason": reason
                })

        # Sort matching candidates: highest score first
        matched_candidates = sorted(matched_candidates, key=lambda x: x["overall_score"], reverse=True)

        # Generate conversational summary text
        count = len(matched_candidates)
        if count == 0:
            answer = f"I searched the candidate directory, but I couldn't find any profiles matching your search for '{query_text}'. Try adjusting your skills keywords or certifications requirements."
        else:
            if score_match:
                answer = f"I found {count} candidate(s) matching your JD suitability target above {threshold}%. Here are the ranked profiles:"
            elif target_cert:
                answer = f"I identified {count} candidate(s) holding certifications matching '{target_cert.upper()}'. Here are the details:"
            elif is_leadership_query:
                answer = f"I found {count} candidate(s) with confirmed leadership experience or project management roles. Here are the profiles:"
            elif detected_skills:
                skills_str = ", ".join([s.title() for s in detected_skills])
                answer = f"Here are the top {count} developer(s) matching your required skill profile ({skills_str}):"
            else:
                answer = f"Here are the top matches from your talent search (found {count} candidates):"

        return {
            "query": query_text,
            "intent_type": intent_type,
            "answer": answer,
            "candidates": matched_candidates
        }
