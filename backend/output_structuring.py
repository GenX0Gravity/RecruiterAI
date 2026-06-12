import json
import csv
import os

class DataExporter:
    """
    Handles structuring and exporting of parsed resume data + AI Intelligence.
    Exports to JSON (full metadata), CSV (lightweight dashboard), and Excel (rich reporting).
    """
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def _ensure_schema(self, data: dict, ai_report: dict = None) -> dict:
        """
        Enforces the standard schema structure, including AI scoring fields.
        """
        normalized_input = {k.lower(): v for k, v in data.items()}
        ai = ai_report or {}
        
        structured_data = {
            "Name": normalized_input.get("name", []),
            "Contact": normalized_input.get("contact", {}),
            "Skills": normalized_input.get("skills", []),
            "CategorizedSkills": normalized_input.get("categorizedskills", {}),
            "Education": normalized_input.get("education", []),
            "Experience": normalized_input.get("experience", []),
            "Certifications": normalized_input.get("certifications", []),
            "Projects": normalized_input.get("projects", []),
            
            # AI Intelligence fields
            "Score": ai.get("OverallScore", 0),
            "Recommendation": ai.get("Recommendation", "Unknown"),
            "Strengths": ai.get("Strengths", []),
            "Weaknesses": ai.get("Weaknesses", []),
        }
        return structured_data

    def export_to_json(self, data: dict, ai_report: dict = None, filename: str = "resume_data.json") -> str:
        """Exports full parsed resume data to a structured JSON file."""
        structured_data = self._ensure_schema(data, ai_report)
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(structured_data, f, indent=4)
            
        return filepath

    def export_to_csv(self, data: dict, ai_report: dict = None, filename: str = "recruiter_dashboard.csv") -> str:
        """
        Exports a lightweight CSV summary.
        """
        structured_data = self._ensure_schema(data, ai_report)
        filepath = os.path.join(self.output_dir, filename)
        file_exists = os.path.isfile(filepath)

        # Convert structured lists into strings
        exp_list = []
        for e in structured_data["Experience"]:
            if isinstance(e, dict):
                exp_list.append(f"{e.get('Role', '')} at {e.get('Company', '')}")
            else:
                exp_list.append(str(e))
                
        edu_list = []
        for e in structured_data["Education"]:
            if isinstance(e, dict):
                edu_list.append(f"{e.get('Degree', '')} ({e.get('GraduationYear', '')})")
            else:
                edu_list.append(str(e))

        row = {
            "Name": ", ".join(structured_data["Name"]) if isinstance(structured_data["Name"], list) else structured_data["Name"],
            "Score": structured_data["Score"],
            "Recommendation": structured_data["Recommendation"],
            "Emails": ", ".join(structured_data["Contact"].get("Emails", [])),
            "Phones": ", ".join(structured_data["Contact"].get("Phones", [])),
            "LinkedIn": ", ".join(structured_data["Contact"].get("LinkedIn", [])),
            "Top Skills": ", ".join(structured_data["Skills"][:10]),
            "Experience": " | ".join(exp_list),
            "Education": " | ".join(edu_list),
            "Strengths": " | ".join(structured_data["Strengths"]),
        }
        
        with open(filepath, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=row.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)
            
        return filepath

    def export_to_excel(self, candidates_data: list, filename: str = "recruiter_report.xlsx") -> str:
        """
        Exports a batch of candidates to an Excel report with rich formatting.
        Requires openpyxl.
        """
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill
        except ImportError:
            print("[Warning] openpyxl not installed. Falling back to CSV.")
            return ""

        filepath = os.path.join(self.output_dir, filename)
        wb = Workbook()
        ws = wb.active
        ws.title = "Candidate Intelligence"

        headers = ["Rank", "Name", "Score", "Recommendation", "Email", "LinkedIn", "Top Skills", "Experience", "Strengths"]
        ws.append(headers)

        # Header styling
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill

        # Sort candidates by score descending
        candidates_data.sort(key=lambda x: x.get("Score", 0), reverse=True)

        for idx, cand in enumerate(candidates_data, 1):
            contact = cand.get("Contact", {})
            name = cand.get("Name", [])
            name_str = name[0] if name else "Unknown"
            
            exp_list = [e.get('Role', '') if isinstance(e, dict) else str(e) for e in cand.get("Experience", [])]

            row = [
                idx,
                name_str,
                cand.get("Score", 0),
                cand.get("Recommendation", ""),
                ", ".join(contact.get("Emails", [])),
                ", ".join(contact.get("LinkedIn", [])),
                ", ".join(cand.get("Skills", [])[:8]),
                " | ".join(exp_list),
                " | ".join(cand.get("Strengths", [])),
            ]
            ws.append(row)

        wb.save(filepath)
        return filepath
