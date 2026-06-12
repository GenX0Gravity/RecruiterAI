import io
import re
import json
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# Weak bullet patterns mapped to strong action-oriented, metrics-driven templates
WEAK_BULLETS_MAPPING = [
    {
        "patterns": [r"\bdatabase\b", r"\bsql\b", r"\bpostgres\b", r"\bmysql\b", r"\bqueries\b"],
        "replacements": [
            "Optimized relational query execution plans, refactoring indexes and subqueries to achieve a {metric_pct}% reduction in database load times.",
            "Designed high-fidelity database schemas supporting parallel data ingest, expanding ingestion capacity to {metric_scale} records/sec.",
            "Restructured data models and query transactions, eliminating concurrency locks and maximizing system throughput."
        ]
    },
    {
        "patterns": [r"\bfrontend\b", r"\bhtml\b", r"\bcss\b", r"\bui\b", r"\bux\b", r"\binterface\b"],
        "replacements": [
            "Redesigned the primary user interfaces using modern React components, resulting in a {metric_pct}% boost in client engagement and decreasing screen load latency by {metric_speed}.",
            "Developed fully responsive components utilizing CSS Grid and HSL variables, raising accessibility compliance scores to a perfect 100%.",
            "Optimized frontend browser caching pipelines, leading to a {metric_pct}% reduction in visual rendering lag."
        ]
    },
    {
        "patterns": [r"\baws\b", r"\bcloud\b", r"\bdeployed\b", r"\bdeploy\b", r"\bdocker\b", r"\bkubernetes\b"],
        "replacements": [
            "Engineered automated container orchestration pipelines utilizing Docker and Kubernetes, scaling cloud application capacity dynamically by {metric_pct}% under peak traffic.",
            "Architected AWS cloud topologies that reduced single points of failure, optimizing infrastructure expenditures and driving savings of {metric_pct}%.",
            "Configured secure multi-region CI/CD pipelines, accelerating delivery cycles by {metric_pct}% and driving configuration consistency."
        ]
    },
    {
        "patterns": [r"\bbugs\b", r"\bfixed\b", r"\bfixing\b", r"\bdebugging\b", r"\berrors\b"],
        "replacements": [
            "Spearheaded comprehensive diagnostic initiatives, identifying and resolving over {bug_count} critical anomalies and boosting platform uptime to {uptime}%.",
            "Developed robust integration and regression testing setups, minimizing hotfix deployment frequency by {metric_pct}%.",
            "Refactored error handling and telemetry alerts, reducing resolution times for production incidents by {metric_pct}%."
        ]
    },
    {
        "patterns": [r"\bcoded\b", r"\bwriting code\b", r"\bcode in\b", r"\bresponsible for coding\b"],
        "replacements": [
            "Architected and engineered robust, high-availability service endpoints in {tech}, accelerating request-response cycles by {metric_pct}% and raising database efficiency by {metric_speed}.",
            "Refactored legacy codebases into modern clean architecture models, driving performance improvements of {metric_pct}% and reducing bug recurrence rates by {metric_pct_half}%.",
            "Developed extensible, modular software solutions leveraging {tech}, supporting a {metric_scale}+ user base with zero downtime deployments."
        ]
    },
    {
        "patterns": [r"\bmanaged\b", r"\led\b", r"\blead\b", r"\bteam\b", r"\bsupervised\b"],
        "replacements": [
            "Led a high-performing agile engineering team of {team_size} developers, delivering core product milestones ahead of schedule and raising sprint output by {metric_pct}%.",
            "Mentored junior and mid-level developers on clean code patterns and system design practices, reducing onboarding ramp times by {metric_pct}%.",
            "Spearheaded engineering best practices, leading team transformation toward automated test suites and TDD methodologies."
        ]
    },
    {
        "patterns": [r"\bworked on\b", r"\bhelped with\b", r"\bassisted with\b", r"\bparticipated in\b"],
        "replacements": [
            "Spearheaded developmental iterations of critical product workflows using {tech}, expanding application feature capabilities and driving user retention up by {metric_pct}%.",
            "Collaborated closely within agile squads to deliver scalable features, completing 100% of milestones ahead of schedule and optimizing code coverage to {metric_speed}.",
            "Orchestrated cross-functional releases of complex modules, accelerating sprint velocity by {metric_pct}% and driving collaboration efficiency."
        ]
    }
]

DOMAIN_KEYWORDS = {
    "Full Stack Developer": {
        "skills": ["React", "Node.js", "Python", "SQL", "Docker", "FastAPI", "TypeScript", "REST APIs", "AWS", "GraphQL", "Redux", "CI/CD"],
        "keywords": ["Single Page Applications", "State Management", "Microservices", "RESTful Architecture", "Containerization", "Responsive Design", "Cross-Browser Compatibility", "Relational Databases"]
    },
    "Backend Engineer": {
        "skills": ["Python", "FastAPI", "Go", "SQL", "PostgreSQL", "Docker", "Kubernetes", "AWS", "gRPC", "Redis", "Celery", "Kafka"],
        "keywords": ["Distributed Systems", "Database Optimization", "Query Tuning", "Asynchronous Processing", "Message Brokers", "High-Availability", "Microservices Architecture", "API Design"]
    },
    "Frontend Developer": {
        "skills": ["React", "JavaScript", "TypeScript", "HTML5", "CSS3", "Redux", "TailwindCSS", "Next.js", "Webpack", "Vite", "Sass"],
        "keywords": ["Responsive Web Design", "DOM Manipulation", "CSS Modules", "Performance Optimization", "State Hydration", "Semantic HTML", "UI/UX Components", "Client-Side Routing"]
    },
    "DevOps Cloud Engineer": {
        "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "Linux", "Nginx", "Bash", "Prometheus", "Grafana"],
        "keywords": ["Infrastructure as Code", "Continuous Integration", "Continuous Deployment", "Site Reliability", "Configuration Management", "Log Aggregation", "Cloud Orchestration", "Serverless"]
    },
    "Data Scientist / ML Engineer": {
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy", "SQL", "Docker", "HuggingFace", "FastAPI"],
        "keywords": ["Statistical Modeling", "Supervised Learning", "Deep Neural Networks", "Feature Engineering", "Hyperparameter Tuning", "Model Deployment", "NLP", "Predictive Analytics"]
    }
}

class ResumeEnhancerEngine:
    """
    Algorithmic Resume Enhancement Engine.
    Performs optimization analysis and generates ATS, Recruiter, and Executive PDF/DOCX layouts.
    """

    def _determine_domain(self, skills: list) -> str:
        """Determines candidate profile domain based on skills matching."""
        if not skills:
            return "Full Stack Developer"
        
        best_domain = "Full Stack Developer"
        max_matches = -1
        
        for domain, info in DOMAIN_KEYWORDS.items():
            matches = sum(1 for s in skills if s.lower() in [ds.lower() for ds in info["skills"]])
            if matches > max_matches:
                max_matches = matches
                best_domain = domain
                
        return best_domain

    def enhance_resume(self, parsed_data: dict) -> dict:
        """
        Processes parsed candidate details and returns optimized resume copy.
        """
        # Determine candidate's dominant tech domain
        skills = parsed_data.get("Skills", [])
        domain = self._determine_domain(skills)
        domain_info = DOMAIN_KEYWORDS[domain]

        # 1. ATS Keywords Optimization
        matched_kws = [s for s in skills if s.lower() in [ds.lower() for ds in domain_info["skills"]]]
        missing_kws = [ds for ds in domain_info["skills"] if ds.lower() not in [s.lower() for s in skills]]
        all_suggested_keywords = matched_kws + missing_kws[:4]

        # 2. Summary Improvement
        exp_years = len(parsed_data.get("Experience", [])) * 2 + 1 # rough estimation
        name = (parsed_data.get("Name") or ["Professional Candidate"])[0]
        
        original_summary = "A Software professional seeking a growth-oriented role."
        improved_summary = (
            f"Results-oriented {domain} with {exp_years}+ years of experience spearheading software design, "
            f"development, and deployment lifecycle. Highly skilled in {', '.join(skills[:4])}. "
            f"Proven track record of designing high-availability systems, boosting runtime efficiency, "
            f"and driving cross-functional collaboration. Passionate about leveraging {all_suggested_keywords[0]} "
            f"and {all_suggested_keywords[1]} to optimize user experiences and business goals."
        )

        # 3. Rewrite Bullet Points
        original_experience = parsed_data.get("Experience", [])
        enhanced_experience = []

        # Heuristic replacement variables
        metric_pcts = [35, 42, 28, 50, 18, 30]
        metric_speeds = ["40%", "30%", "2.5x", "50% faster", "3x speedup"]
        metric_scales = ["100k", "500k+", "1M+", "50k"]
        bug_counts = [45, 80, 120, 60]
        
        for idx, exp in enumerate(original_experience):
            company = exp.get("Company", "Company Name")
            role = exp.get("Role", "Software Engineer")
            dur = exp.get("Duration", "")
            raw = exp.get("Raw", "")
            resps = exp.get("Responsibilities", [])
            
            enhanced_resps = []
            
            if not resps:
                # Fallback responses if missing
                tech_used = skills[idx % len(skills)] if skills else "relevant stacks"
                enhanced_resps = [
                    f"Architected core system features using {tech_used}, resulting in a {metric_pcts[idx % 6]}% upgrade in responsiveness.",
                    f"Spearheaded collaborative sprints, reducing development cycle latency by {metric_speeds[idx % 5]}."
                ]
            else:
                for r_idx, resp in enumerate(resps):
                    enhanced_bullet = ""
                    for mapping in WEAK_BULLETS_MAPPING:
                        for pattern in mapping["patterns"]:
                            if re.search(pattern, resp.lower()):
                                tech_used = skills[(idx + r_idx) % len(skills)] if skills else "clean architectures"
                                enhanced_bullet = mapping["replacements"][(idx + r_idx) % len(mapping["replacements"])].format(
                                    tech=tech_used,
                                    metric_pct=metric_pcts[(idx + r_idx) % len(metric_pcts)],
                                    metric_pct_half=metric_pcts[(idx + r_idx) % len(metric_pcts)] // 2,
                                    metric_speed=metric_speeds[(idx + r_idx) % len(metric_speeds)],
                                    metric_scale=metric_scales[(idx + r_idx) % len(metric_scales)],
                                    team_size=5 + (idx % 3),
                                    bug_count=bug_counts[(idx + r_idx) % len(bug_counts)],
                                    uptime="99.99"
                                )
                                break
                        if enhanced_bullet:
                            break
                    
                    if not enhanced_bullet:
                        # General rewrite enhancement
                        verb = ["Optimized", "Engineered", "Implemented", "Spearheaded", "Refactored"][r_idx % 5]
                        enhanced_bullet = f"{verb} system frameworks to support {resp.strip()}, achieving a {metric_pcts[r_idx % 6]}% enhancement in metrics."
                    
                    enhanced_resps.append(enhanced_bullet)

            enhanced_experience.append({
                "Company": company,
                "Role": role,
                "Duration": dur,
                "Responsibilities": enhanced_resps,
                "Raw": raw
            })

        # 4. Enhance Achievements
        achievements = [
            f"Designed and deployed modular microservice frameworks, boosting application load scalability by {metric_pcts[0]}% and cutting server compute overhead.",
            f"Automated release testing setups across CI/CD environments, reducing manual production integration times by {metric_pcts[1]}%.",
            f"Optimized database architectures and query indices, increasing search latency performance by {metric_speeds[0]} under heavy concurrency."
        ]

        return {
            "domain": domain,
            "original_summary": original_summary,
            "enhanced_summary": improved_summary,
            "original_experience": original_experience,
            "enhanced_experience": enhanced_experience,
            "achievements": achievements,
            "matched_keywords": matched_kws,
            "missing_keywords": missing_kws[:6]
        }

    # =========================================================================
    # PDF EXPORT GENERATOR (ReportLab)
    # =========================================================================

    def generate_pdf(self, candidate_name: str, contact: dict, enhanced_data: dict, format_type: str) -> io.BytesIO:
        """
        Generates in-memory PDFs for ATS, Recruiter, or Executive designs.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        story = []

        # Themes & Palettes
        if format_type == "recruiter":
            c_primary = colors.HexColor("#0D9488")    # Vibrant Teal
            c_secondary = colors.HexColor("#0F766E")  # Dark Teal
            c_dark = colors.HexColor("#111827")       # Rich Grey
            c_light = colors.HexColor("#F3F4F6")      # Warm light
        elif format_type == "executive":
            c_primary = colors.HexColor("#1E3A8A")    # Classic Navy
            c_secondary = colors.HexColor("#475569")  # Slate Accent
            c_dark = colors.HexColor("#0F172A")       # Obsidian
            c_light = colors.HexColor("#F8FAFC")      # Slate light
        else: # ats
            c_primary = colors.HexColor("#1F2937")    # Charcoal
            c_secondary = colors.HexColor("#4B5563")  # Muted Grey
            c_dark = colors.HexColor("#111827")       # Plain Dark
            c_light = colors.HexColor("#FFFFFF")      # Pure White

        # Styled Fonts
        style_title = ParagraphStyle('TTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=20, textColor=c_primary, spaceAfter=4)
        style_subtitle = ParagraphStyle('TSub', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=c_secondary, spaceAfter=8)
        style_h2 = ParagraphStyle('TH2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, textColor=c_primary, spaceBefore=12, spaceAfter=6)
        style_body = ParagraphStyle('TBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=c_dark, leading=12)
        style_body_bold = ParagraphStyle('TBodyBold', parent=style_body, fontName='Helvetica-Bold')
        style_bullet = ParagraphStyle('TBullet', parent=style_body, leftIndent=12, firstLineIndent=-8, spaceAfter=3)

        # Contact Info String
        emails = contact.get("Emails", ["N/A"])
        phones = contact.get("Phones", ["N/A"])
        location = contact.get("Location", "N/A")
        linkedin = contact.get("LinkedIn", [])
        
        contact_str = f"Email: {emails[0]}  |  Phone: {phones[0]}"
        if location and location != "N/A":
            contact_str += f"  |  Location: {location}"
        if linkedin:
            contact_str += f"  |  LinkedIn: {linkedin[0]}"

        # Define Layouts
        if format_type == "ats":
            # ATS layout: single column, clear structure, clean lines
            story.append(Paragraph(candidate_name.upper(), style_title))
            story.append(Paragraph(contact_str, style_body))
            story.append(Spacer(1, 10))
            story.append(Paragraph("<b>PROFESSIONAL SUMMARY</b>", style_h2))
            story.append(Paragraph(enhanced_data["enhanced_summary"], style_body))
            
            story.append(Paragraph("<b>CORE COMPETENCIES & KEYWORDS</b>", style_h2))
            all_skills = ", ".join(enhanced_data["matched_keywords"] + enhanced_data["missing_keywords"][:4])
            story.append(Paragraph(all_skills, style_body))
            
            story.append(Paragraph("<b>PROFESSIONAL EXPERIENCE</b>", style_h2))
            for exp in enhanced_data["enhanced_experience"]:
                exp_header = f"<b>{exp['Role']}</b> — {exp['Company']} | <i>{exp['Duration']}</i>"
                story.append(Paragraph(exp_header, style_body))
                for resp in exp["Responsibilities"]:
                    story.append(Paragraph(f"• {resp}", style_bullet))
                story.append(Spacer(1, 6))

            story.append(Paragraph("<b>KEY ACHIEVEMENTS</b>", style_h2))
            for ach in enhanced_data["achievements"]:
                story.append(Paragraph(f"• {ach}", style_bullet))

        elif format_type == "recruiter":
            # Recruiter Layout: Dual-column structured table layout (Left sidebar / Right main)
            sidebar_content = [
                Paragraph("<b>CONTACT</b>", style_subtitle),
                Paragraph(f"<b>Email:</b><br/>{emails[0]}", style_body),
                Paragraph(f"<b>Phone:</b><br/>{phones[0]}", style_body),
                Spacer(1, 8)
            ]
            if location and location != "N/A":
                sidebar_content.append(Paragraph(f"<b>Location:</b><br/>{location}", style_body))
            if linkedin:
                sidebar_content.append(Paragraph(f"<b>LinkedIn:</b><br/>{linkedin[0][:25]}...", style_body))
            
            sidebar_content.append(Spacer(1, 12))
            sidebar_content.append(Paragraph("<b>EXPERT SKILLS</b>", style_subtitle))
            for s in (enhanced_data["matched_keywords"][:8]):
                sidebar_content.append(Paragraph(f"✔ {s}", style_body))
                
            sidebar_content.append(Spacer(1, 12))
            sidebar_content.append(Paragraph("<b>ATS SUGGESTED</b>", style_subtitle))
            for s in (enhanced_data["missing_keywords"][:5]):
                sidebar_content.append(Paragraph(f"✚ {s}", style_body))

            main_content = [
                Paragraph(candidate_name.upper(), style_title),
                Paragraph(f"<b>Target Domain:</b> {enhanced_data['domain']}", style_subtitle),
                Spacer(1, 8),
                Paragraph("<b>PROFESSIONAL SUMMARY</b>", style_h2),
                Paragraph(enhanced_data["enhanced_summary"], style_body),
                Spacer(1, 10),
                Paragraph("<b>WORK EXPERIENCE</b>", style_h2),
            ]
            for exp in enhanced_data["enhanced_experience"]:
                exp_header = f"<b>{exp['Role']}</b><br/>{exp['Company']} | <i>{exp['Duration']}</i>"
                main_content.append(Paragraph(exp_header, style_body))
                for resp in exp["Responsibilities"]:
                    main_content.append(Paragraph(f"• {resp}", style_bullet))
                main_content.append(Spacer(1, 8))

            main_content.append(Paragraph("<b>KEY ACHIEVEMENTS</b>", style_h2))
            for ach in enhanced_data["achievements"]:
                main_content.append(Paragraph(f"• {ach}", style_bullet))

            # Table for side-by-side
            side_table = Table([[sidebar_content, main_content]], colWidths=[150, 390])
            side_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('RIGHTBORDER', (0,0), (0,0), 0.5, colors.HexColor("#E5E7EB")),
                ('RIGHTPADDING', (0,0), (0,0), 12),
                ('LEFTPADDING', (1,0), (1,0), 12),
            ]))
            story.append(side_table)

        elif format_type == "executive":
            # Executive Layout: Premium centered header, elegant spacing
            story.append(Paragraph(candidate_name.upper(), style_title))
            story.append(Paragraph(f"<i>{enhanced_data['domain']}  |  {contact_str}</i>", style_subtitle))
            story.append(Spacer(1, 10))
            
            story.append(Paragraph("<b>EXECUTIVE LEADERSHIP PROFILE</b>", style_h2))
            story.append(Paragraph(enhanced_data["enhanced_summary"], style_body))
            
            story.append(Paragraph("<b>DISTINGUISHED MILESTONES</b>", style_h2))
            for ach in enhanced_data["achievements"]:
                story.append(Paragraph(f"• <b>Impact Milestone:</b> {ach}", style_bullet))
                
            story.append(Paragraph("<b>CORE COMPETENCIES & EXPERTISE</b>", style_h2))
            skills_grid_data = []
            all_s = enhanced_data["matched_keywords"][:12]
            for idx in range(0, len(all_s), 3):
                row = [Paragraph(all_s[i], style_body) for i in range(idx, min(idx+3, len(all_s)))]
                while len(row) < 3:
                    row.append(Paragraph("", style_body))
                skills_grid_data.append(row)
            
            skills_table = Table(skills_grid_data, colWidths=[180, 180, 180])
            skills_table.setStyle(TableStyle([
                ('BOX', (0,0), (-1,-1), 0.5, c_light),
                ('BACKGROUND', (0,0), (-1,-1), c_light),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(skills_table)

            story.append(Paragraph("<b>CHRONOLOGICAL HISTORY</b>", style_h2))
            for exp in enhanced_data["enhanced_experience"]:
                exp_header = f"<b>{exp['Role']}</b> — {exp['Company']} | <i>{exp['Duration']}</i>"
                story.append(Paragraph(exp_header, style_body))
                for resp in exp["Responsibilities"]:
                    story.append(Paragraph(f"• {resp}", style_bullet))
                story.append(Spacer(1, 8))

        doc.build(story)
        buffer.seek(0)
        return buffer

    # =========================================================================
    # DOCX EXPORT GENERATOR (python-docx)
    # =========================================================================

    def generate_docx(self, candidate_name: str, contact: dict, enhanced_data: dict, format_type: str) -> io.BytesIO:
        """
        Generates in-memory Word DOCX resumes for ATS, Recruiter, or Executive designs.
        """
        doc = Document()
        
        # Configure margins: 0.5 inches (36 pt)
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

        # Style colors
        if format_type == "recruiter":
            r_color = RGBColor(13, 148, 136)   # Teal
            text_color = RGBColor(31, 41, 55)  # Dark Charcoal
        elif format_type == "executive":
            r_color = RGBColor(30, 58, 138)   # Navy
            text_color = RGBColor(15, 23, 42)  # Obsidian
        else: # ats
            r_color = RGBColor(17, 24, 39)    # Black/Charcoal
            text_color = RGBColor(31, 41, 55)

        # Setup base normal style font
        style_normal = doc.styles['Normal']
        style_normal.font.name = 'Arial'
        style_normal.font.size = Pt(9.5)
        style_normal.font.color.rgb = text_color

        emails = contact.get("Emails", ["N/A"])
        phones = contact.get("Phones", ["N/A"])
        location = contact.get("Location", "N/A")
        linkedin = contact.get("LinkedIn", [])
        
        contact_str = f"Email: {emails[0]}  |  Phone: {phones[0]}"
        if location and location != "N/A":
            contact_str += f"  |  Location: {location}"
        if linkedin:
            contact_str += f"  |  LinkedIn: {linkedin[0]}"

        if format_type == "ats":
            # Header
            p_name = doc.add_paragraph()
            r_name = p_name.add_run(candidate_name.upper())
            r_name.font.size = Pt(20)
            r_name.font.bold = True
            r_name.font.color.rgb = r_color
            
            p_contact = doc.add_paragraph(contact_str)
            p_contact.paragraph_format.space_after = Pt(12)

            # Summary
            p_sh1 = doc.add_paragraph()
            r_sh1 = p_sh1.add_run("PROFESSIONAL SUMMARY")
            r_sh1.font.size = Pt(12)
            r_sh1.font.bold = True
            r_sh1.font.color.rgb = r_color
            p_sh1.paragraph_format.space_before = Pt(10)
            p_sh1.paragraph_format.space_after = Pt(4)
            
            doc.add_paragraph(enhanced_data["enhanced_summary"])

            # Skills
            p_sh2 = doc.add_paragraph()
            r_sh2 = p_sh2.add_run("CORE COMPETENCIES & KEYWORDS")
            r_sh2.font.size = Pt(12)
            r_sh2.font.bold = True
            r_sh2.font.color.rgb = r_color
            p_sh2.paragraph_format.space_before = Pt(10)
            p_sh2.paragraph_format.space_after = Pt(4)
            
            all_skills = ", ".join(enhanced_data["matched_keywords"] + enhanced_data["missing_keywords"][:4])
            doc.add_paragraph(all_skills)

            # Experience
            p_sh3 = doc.add_paragraph()
            r_sh3 = p_sh3.add_run("PROFESSIONAL EXPERIENCE")
            r_sh3.font.size = Pt(12)
            r_sh3.font.bold = True
            r_sh3.font.color.rgb = r_color
            p_sh3.paragraph_format.space_before = Pt(10)
            p_sh3.paragraph_format.space_after = Pt(4)

            for exp in enhanced_data["enhanced_experience"]:
                p_exp = doc.add_paragraph()
                r_exp = p_exp.add_run(f"{exp['Role']} — {exp['Company']} ({exp['Duration']})")
                r_exp.bold = True
                p_exp.paragraph_format.space_after = Pt(2)
                
                for resp in exp["Responsibilities"]:
                    doc.add_paragraph(resp, style='List Bullet')

            # Achievements
            p_sh4 = doc.add_paragraph()
            r_sh4 = p_sh4.add_run("KEY ACHIEVEMENTS")
            r_sh4.font.size = Pt(12)
            r_sh4.font.bold = True
            r_sh4.font.color.rgb = r_color
            p_sh4.paragraph_format.space_before = Pt(10)
            p_sh4.paragraph_format.space_after = Pt(4)
            
            for ach in enhanced_data["achievements"]:
                doc.add_paragraph(ach, style='List Bullet')

        elif format_type == "recruiter":
            # Recruiter Layout: Use a 1-row table with 2 columns to align side-by-side
            table = doc.add_table(rows=1, cols=2)
            table.autofit = False
            
            # Left sidebar column (width: 2.0 inches)
            left_cell = table.cell(0, 0)
            left_cell.width = Inches(2.0)
            
            # Right main content column (width: 5.5 inches)
            right_cell = table.cell(0, 1)
            right_cell.width = Inches(5.5)

            # Left cell content
            p_side_title = left_cell.add_paragraph()
            r_side_title = p_side_title.add_run("CONTACT")
            r_side_title.font.bold = True
            r_side_title.font.color.rgb = r_color
            
            left_cell.add_paragraph(f"Email:\n{emails[0]}")
            left_cell.add_paragraph(f"Phone:\n{phones[0]}")
            if location and location != "N/A":
                left_cell.add_paragraph(f"Location:\n{location}")
            if linkedin:
                left_cell.add_paragraph(f"LinkedIn:\n{linkedin[0][:22]}...")

            p_side_skills = left_cell.add_paragraph()
            r_side_skills = p_side_skills.add_run("\nEXPERT SKILLS")
            r_side_skills.font.bold = True
            r_side_skills.font.color.rgb = r_color
            
            for s in enhanced_data["matched_keywords"][:8]:
                left_cell.add_paragraph(f"✔ {s}")

            p_side_ats = left_cell.add_paragraph()
            r_side_ats = p_side_ats.add_run("\nATS SUGGESTED")
            r_side_ats.font.bold = True
            r_side_ats.font.color.rgb = r_color
            
            for s in enhanced_data["missing_keywords"][:5]:
                left_cell.add_paragraph(f"✚ {s}")

            # Right cell content
            p_name = right_cell.add_paragraph()
            r_name = p_name.add_run(candidate_name.upper())
            r_name.font.size = Pt(22)
            r_name.font.bold = True
            r_name.font.color.rgb = r_color
            
            p_domain = right_cell.add_paragraph()
            r_domain = p_domain.add_run(f"Target Role: {enhanced_data['domain']}")
            r_domain.font.italic = True
            
            p_sum_h = right_cell.add_paragraph()
            r_sum_h = p_sum_h.add_run("\nPROFESSIONAL SUMMARY")
            r_sum_h.font.bold = True
            r_sum_h.font.size = Pt(11)
            r_sum_h.font.color.rgb = r_color
            
            right_cell.add_paragraph(enhanced_data["enhanced_summary"])

            p_exp_h = right_cell.add_paragraph()
            r_exp_h = p_exp_h.add_run("\nWORK EXPERIENCE")
            r_exp_h.font.bold = True
            r_exp_h.font.size = Pt(11)
            r_exp_h.font.color.rgb = r_color

            for exp in enhanced_data["enhanced_experience"]:
                p_exp_header = right_cell.add_paragraph()
                r_exp_header = p_exp_header.add_run(f"{exp['Role']} | {exp['Company']} | {exp['Duration']}")
                r_exp_header.bold = True
                
                for resp in exp["Responsibilities"]:
                    p_resp = right_cell.add_paragraph()
                    p_resp.style = 'List Bullet'
                    p_resp.add_run(resp)

            p_ach_h = right_cell.add_paragraph()
            r_ach_h = p_ach_h.add_run("\nKEY ACHIEVEMENTS")
            r_ach_h.font.bold = True
            r_ach_h.font.size = Pt(11)
            r_ach_h.font.color.rgb = r_color
            
            for ach in enhanced_data["achievements"]:
                p_ach = right_cell.add_paragraph()
                p_ach.style = 'List Bullet'
                p_ach.add_run(ach)

        elif format_type == "executive":
            # Executive Layout: Centered header, elegant layout
            p_name = doc.add_paragraph()
            p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_name = p_name.add_run(candidate_name.upper())
            r_name.font.size = Pt(22)
            r_name.font.bold = True
            r_name.font.color.rgb = r_color
            
            p_contact = doc.add_paragraph(contact_str)
            p_contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_contact.paragraph_format.space_after = Pt(16)

            p_h1 = doc.add_paragraph()
            r_h1 = p_h1.add_run("EXECUTIVE PROFILE")
            r_h1.font.bold = True
            r_h1.font.size = Pt(12)
            r_h1.font.color.rgb = r_color
            
            doc.add_paragraph(enhanced_data["enhanced_summary"])

            p_h2 = doc.add_paragraph()
            r_h2 = p_h2.add_run("\nDISTINGUISHED MILESTONES")
            r_h2.font.bold = True
            r_h2.font.size = Pt(12)
            r_h2.font.color.rgb = r_color
            
            for ach in enhanced_data["achievements"]:
                doc.add_paragraph(ach, style='List Bullet')

            p_h3 = doc.add_paragraph()
            r_h3 = p_h3.add_run("\nCORE SKILLS & AREAS OF EXPERTISE")
            r_h3.font.bold = True
            r_h3.font.size = Pt(12)
            r_h3.font.color.rgb = r_color
            
            # Simple grid table for skills
            all_s = enhanced_data["matched_keywords"][:12]
            skills_table = doc.add_table(rows=0, cols=3)
            for idx in range(0, len(all_s), 3):
                row_cells = skills_table.add_row().cells
                row_cells[0].text = all_s[idx] if idx < len(all_s) else ""
                row_cells[1].text = all_s[idx+1] if idx+1 < len(all_s) else ""
                row_cells[2].text = all_s[idx+2] if idx+2 < len(all_s) else ""

            p_h4 = doc.add_paragraph()
            r_h4 = p_h4.add_run("\nPROFESSIONAL HISTORY")
            r_h4.font.bold = True
            r_h4.font.size = Pt(12)
            r_h4.font.color.rgb = r_color

            for exp in enhanced_data["enhanced_experience"]:
                p_exp = doc.add_paragraph()
                r_exp = p_exp.add_run(f"{exp['Role']} | {exp['Company']} | {exp['Duration']}")
                r_exp.bold = True
                
                for resp in exp["Responsibilities"]:
                    doc.add_paragraph(resp, style='List Bullet')

        # Save to memory stream
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
