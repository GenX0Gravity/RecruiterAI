import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

class PDFReportGenerator:
    """
    Generates a professional, print-ready PDF candidate intelligence report.
    Uses ReportLab Platypus flowables to avoid layout overlaps.
    """

    def generate_report(self, candidate_name: str, analysis: dict) -> io.BytesIO:
        """
        Creates a PDF report in-memory and returns a BytesIO buffer.
        """
        buffer = io.BytesIO()
        
        # Margins: 0.5 inches (36 points) for maximum space efficiency
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Define corporate-themed color palette
        c_primary = colors.HexColor("#312E81")    # Deep Indigo
        c_secondary = colors.HexColor("#0D9488")  # Teal Accent
        c_text_dark = colors.HexColor("#1F2937")  # Charcoal
        c_bg_light = colors.HexColor("#F9FAFB")   # Cool White
        c_border = colors.HexColor("#E5E7EB")     # Light Grey

        # Custom paragraph styles
        style_title = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=c_primary,
            spaceAfter=6
        )
        
        style_subtitle = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=c_secondary,
            spaceAfter=14
        )

        style_sec_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=c_primary,
            spaceBefore=10,
            spaceAfter=6
        )

        style_body = ParagraphStyle(
            'BodyDark',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            textColor=c_text_dark,
            leading=13
        )

        style_body_bold = ParagraphStyle(
            'BodyDarkBold',
            parent=style_body,
            fontName='Helvetica-Bold'
        )

        style_bullet = ParagraphStyle(
            'BulletText',
            parent=style_body,
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=4
        )

        story = []

        # ── 1. HEADER BANNER ──
        story.append(Paragraph("CANDIDATE INTELLIGENCE & RESUME ANALYSIS", style_title))
        today_str = datetime.date.today().strftime("%B %d, %Y")
        story.append(Paragraph(f"Candidate Evaluation Report  |  Candidate: <b>{candidate_name}</b>  |  Date: <b>{today_str}</b>", style_subtitle))
        
        # ── 2. EXECUTIVE SCORES GRID ──
        overall_score = int(
            analysis.get("ATSScore", 0) * 0.25 + 
            analysis.get("RecruiterScore", 0) * 0.25 + 
            analysis.get("TechnicalScore", 0) * 0.20 + 
            analysis.get("LeadershipScore", 0) * 0.15 + 
            analysis.get("CommunicationScore", 0) * 0.15
        )
        
        # Custom progress bars helper
        def make_bar(val):
            w_fill = max(1, int(120 * (val / 100)))
            w_empty = max(1, 120 - w_fill)
            bar_table = Table([['', '']], colWidths=[w_fill, w_empty], rowHeights=[6])
            bar_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,0), c_secondary),
                ('BACKGROUND', (1,0), (1,0), c_border),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ]))
            return bar_table

        scores_data = [
            [
                Paragraph("<b>ATS Score:</b>", style_body), Paragraph(f"{analysis.get('ATSScore', 0)}/100", style_body_bold), make_bar(analysis.get('ATSScore', 0)),
                Paragraph("<b>Leadership Score:</b>", style_body), Paragraph(f"{analysis.get('LeadershipScore', 0)}/100", style_body_bold), make_bar(analysis.get('LeadershipScore', 0))
            ],
            [
                Paragraph("<b>Recruiter Score:</b>", style_body), Paragraph(f"{analysis.get('RecruiterScore', 0)}/100", style_body_bold), make_bar(analysis.get('RecruiterScore', 0)),
                Paragraph("<b>Communication Score:</b>", style_body), Paragraph(f"{analysis.get('CommunicationScore', 0)}/100", style_body_bold), make_bar(analysis.get('CommunicationScore', 0))
            ],
            [
                Paragraph("<b>Technical Score:</b>", style_body), Paragraph(f"{analysis.get('TechnicalScore', 0)}/100", style_body_bold), make_bar(analysis.get('TechnicalScore', 0)),
                Paragraph("<b>OVERALL COMPATIBILITY:</b>", style_body_bold), Paragraph(f"{overall_score}/100", style_body_bold), make_bar(overall_score)
            ]
        ]
        
        scores_table = Table(scores_data, colWidths=[100, 45, 130, 115, 45, 105])
        scores_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BOX', (0,0), (-1,-1), 1, c_border),
            ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        
        story.append(scores_table)
        story.append(Spacer(1, 14))

        # ── 3. RESUME STRUCTURE & ATS AUDIT ──
        story.append(Paragraph("Structure & ATS Compatibility Audit", style_sec_heading))
        
        struct = analysis.get("Structure", {})
        compat = analysis.get("ATSCompatibility", {})
        
        struct_table_data = [
            [
                Paragraph("<b>Section Presence</b>", style_body_bold), 
                Paragraph("<b>Status</b>", style_body_bold),
                Paragraph("<b>ATS Compatibility Checks</b>", style_body_bold),
                Paragraph("<b>Audit Findings</b>", style_body_bold)
            ],
            [
                Paragraph("Experience Section", style_body), 
                Paragraph("Found" if struct.get("has_experience") else "Missing", style_body),
                Paragraph("Standard Headers", style_body),
                Paragraph("Standard" if not compat.get("non_standard_headers") else "Non-standard", style_body)
            ],
            [
                Paragraph("Education Section", style_body), 
                Paragraph("Found" if struct.get("has_education") else "Missing", style_body),
                Paragraph("LinkedIn URL Header", style_body),
                Paragraph("Present" if not compat.get("missing_linkedin") else "Missing link", style_body)
            ],
            [
                Paragraph("Skills Section", style_body), 
                Paragraph("Found" if struct.get("has_skills") else "Missing", style_body),
                Paragraph("Email Completeness", style_body),
                Paragraph("Valid" if not compat.get("missing_email") else "No email found", style_body)
            ],
            [
                Paragraph("Projects Section", style_body), 
                Paragraph("Found" if struct.get("has_projects") else "Missing", style_body),
                Paragraph("Formatting & Columns Layout", style_body),
                Paragraph("Standard layout" if not compat.get("complex_layout") else "Complex/tables", style_body)
            ]
        ]
        
        struct_table = Table(struct_table_data, colWidths=[130, 80, 160, 170])
        struct_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_primary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('BOX', (0,0), (-1,-1), 1, c_border),
            ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        
        # Override headers text to be white in table style
        for i in range(4):
            struct_table_data[0][i].style.textColor = colors.white

        story.append(struct_table)
        story.append(Spacer(1, 14))

        # ── 4. KEYWORD DENSITY & TECHNICAL STRENGTH ──
        story.append(Paragraph("Keyword Density & Technical Skill Metrics", style_sec_heading))
        
        density = analysis.get("KeywordDensity", {})
        density_texts = []
        for item in density.get("density", []):
            density_texts.append(f"{item['keyword']} ({item['density_pct']}%)")
            
        coverage = analysis.get("SkillCoverage", {})
        strength = analysis.get("TechnicalStrength", {})
        
        density_table_data = [
            [
                Paragraph("<b>Total Words Encoded:</b>", style_body),
                Paragraph(str(density.get("total_words", 0)), style_body_bold),
                Paragraph("<b>Technical Tools Checked:</b>", style_body),
                Paragraph(f"{strength.get('tech_skills_count', 0)} unique tools", style_body_bold)
            ],
            [
                Paragraph("<b>Primary Keywords Density:</b>", style_body),
                Paragraph(", ".join(density_texts[:3]) if density_texts else "None", style_body_bold),
                Paragraph("<b>Skill Category Coverage:</b>", style_body),
                Paragraph(f"{coverage.get('categories_count', 0)} categories", style_body_bold)
            ]
        ]
        
        density_table = Table(density_table_data, colWidths=[140, 130, 140, 130])
        density_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BOX', (0,0), (-1,-1), 1, c_border),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))
        
        story.append(density_table)
        story.append(Spacer(1, 14))

        # ── 5. STRENGTHS & MISSING KEYWORDS (SIDE-BY-SIDE) ──
        strengths_list = [Paragraph(f"• {s}", style_bullet) for s in analysis.get("Strengths", [])]
        weaknesses_list = [Paragraph(f"• {w}", style_bullet) for w in analysis.get("Weaknesses", [])]
        
        side_data = [
            [Paragraph("<b>Key Strengths</b>", style_body_bold), Paragraph("<b>Gaps & Weaknesses</b>", style_body_bold)],
            [strengths_list, weaknesses_list]
        ]
        
        side_table = Table(side_data, colWidths=[270, 270])
        side_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor("#D1FAE5")), # Light green
            ('BACKGROUND', (1,0), (1,0), colors.HexColor("#FEE2E2")), # Light red
            ('BOX', (0,0), (-1,-1), 1, c_border),
            ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(side_table)
        story.append(Spacer(1, 14))

        # ── 6. IMPROVEMENT SUGGESTIONS & ROADMAP ──
        story.append(Paragraph("Actionable Suggestions & Improvement Roadmap", style_sec_heading))
        
        suggestions = analysis.get("Suggestions", [])
        if suggestions:
            for sug in suggestions:
                story.append(Paragraph(f"• <b>Recommendation:</b> {sug}", style_bullet))
        else:
            story.append(Paragraph("• No immediate changes required; formatting fits standard recruiter standards.", style_bullet))
            
        story.append(Spacer(1, 10))
        
        # Missing Keywords
        missing_kws = analysis.get("MissingKeywords", [])
        if missing_kws:
            story.append(Paragraph(f"• <b>Missing Keywords (expected for this domain):</b> {', '.join(missing_kws)}", style_bullet))
            story.append(Paragraph("<i>Include these missing terms naturally in your Experience bullets and Skills lists to pass automated keyword screens.</i>", style_bullet))

        # Build PDF Document
        doc.build(story)
        buffer.seek(0)
        return buffer
