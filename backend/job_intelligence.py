import json
import datetime
import random
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from database import JobVacancy

# Seed data templates to generate realistic job postings
TECH_COMPANIES = [
    {"name": "Google", "domain": "careers.google.com"},
    {"name": "Microsoft", "domain": "careers.microsoft.com"},
    {"name": "Meta", "domain": "metacareers.com"},
    {"name": "Stripe", "domain": "stripe.com/jobs"},
    {"name": "Netflix", "domain": "jobs.netflix.com"},
    {"name": "Vercel", "domain": "vercel.com/careers"},
    {"name": "Supabase", "domain": "supabase.com/careers"},
    {"name": "Linear", "domain": "linear.app/careers"},
    {"name": "Flipkart", "domain": "flipkartcareers.com"},
    {"name": "Razorpay", "domain": "razorpay.com/careers"},
    {"name": "Swiggy", "domain": "careers.swiggy.com"},
    {"name": "Zomato", "domain": "zomato.com/careers"},
    {"name": "Infosys", "domain": "infosys.com/careers"},
    {"name": "TCS", "domain": "tcs.com/careers"},
]

TECH_ROLES = [
    {
        "title": "Senior Python Engineer",
        "skills": ["Python", "FastAPI", "SQL", "Docker", "AWS"],
        "experience": 5,
        "description": "Join our Core Backend engineering team to scale AI-powered microservices. You will design robust APIs, optimize database performance, and collaborate with DevOps on AWS/Docker deployment."
    },
    {
        "title": "React Developer",
        "skills": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind"],
        "experience": 2,
        "description": "Looking for a Frontend Developer to build high-performance React applications. You will create responsive UI/UX, work with state management, and optimize client-side performance."
    },
    {
        "title": "Full Stack Engineer",
        "skills": ["React", "Node.js", "Python", "SQL", "TypeScript", "Git"],
        "experience": 3,
        "description": "Build end-to-end features for our customer portal. Work with React on the frontend and Node/Python on the backend. Strong database querying skills and Git flow are required."
    },
    {
        "title": "Machine Learning Engineer",
        "skills": ["Python", "PyTorch", "TensorFlow", "NLP", "Scikit-Learn"],
        "experience": 4,
        "description": "Develop and deploy machine learning models. You will work on NLP text processing, model training, evaluation, and production serving on GPU instances."
    },
    {
        "title": "DevOps Cloud Engineer",
        "skills": ["AWS", "GCP", "Kubernetes", "Docker", "Linux", "CI/CD"],
        "experience": 4,
        "description": "Manage our multi-cloud deployment pipelines. Responsible for infrastructure automation, CI/CD pipeline optimization, Docker container orchestration with Kubernetes, and system reliability."
    },
    {
        "title": "Data Scientist",
        "skills": ["Python", "SQL", "Pandas", "NumPy", "Scikit-Learn", "Data Science"],
        "experience": 3,
        "description": "Perform data analysis, build predictive models, and design experiments. You will collaborate with product and engineering teams to turn raw data into actionable recruiter insights."
    },
    {
        "title": "Software Engineering Intern",
        "skills": ["Python", "JavaScript", "Git", "SQL"],
        "experience": 0,
        "description": "Kickstart your career as a software engineer intern. You will work alongside senior engineers, write unit tests, fix bugs, and learn modern software design patterns."
    },
    {
        "title": "Product Manager (Tech)",
        "skills": ["Agile", "Scrum", "Product Roadmaps", "Data Analysis"],
        "experience": 5,
        "description": "Lead cross-functional teams to define and launch high-impact recruiter features. Define product requirements, manage backlogs in Scrum, and translate user feedback into specifications."
    }
]

LOCATIONS = [
    {"name": "San Francisco, CA", "country": "US"},
    {"name": "Remote", "country": "US/IN"},
    {"name": "New York, NY", "country": "US"},
    {"name": "Seattle, WA", "country": "US"},
    {"name": "Bangalore, India", "country": "IN"},
    {"name": "Mumbai, India", "country": "IN"},
    {"name": "Delhi, India", "country": "IN"},
    {"name": "London, UK", "country": "UK"},
    {"name": "Munich, Germany", "country": "DE"},
    {"name": "Berlin, Germany", "country": "DE"},
    {"name": "Tokyo, Japan", "country": "JP"}
]

SOURCES = [
    "LinkedIn",
    "Indeed",
    "Naukri",
    "Wellfound",
    "Internshala",
    "Glassdoor",
    "Company Career Pages"
]

class JobAggregator:
    """
    Handles job aggregation, caching, daily updates, and filtering.
    Dynamically generates and saves vacancies when needed to ensure search robustness.
    """

    def seed_initial_jobs(self, db: Session, count: int = 80):
        """Seed the database with a diverse set of initial jobs if empty."""
        existing = db.query(JobVacancy).count()
        if existing >= count:
            return  # already seeded

        print(f"Seeding database with {count} simulated job vacancies...")
        for _ in range(count):
            vacancy = self._generate_single_vacancy()
            db.add(vacancy)
        db.commit()

    def search_jobs(
        self,
        db: Session,
        q: str = None,
        skills: str = None,
        location: str = None,
        min_salary: int = 0,
        experience: int = None,
        source: str = None,
        page: int = 1,
        page_size: int = 10
    ):
        """
        Queries and filters job vacancies.
        If the cache yields few results for a search, dynamically generates new jobs.
        """
        # Ensure we have some base listings
        self.seed_initial_jobs(db)

        # Formulate query
        query = db.query(JobVacancy).filter(JobVacancy.is_active == True)

        if q:
            search_str = f"%{q}%"
            query = query.filter(or_(
                JobVacancy.title.ilike(search_str),
                JobVacancy.company.ilike(search_str),
                JobVacancy.description.ilike(search_str)
            ))

        if location:
            query = query.filter(JobVacancy.location.ilike(f"%{location}%"))

        if source and source != "All":
            query = query.filter(JobVacancy.source.ilike(source))

        if experience is not None:
            # Matches jobs requiring up to the specified experience
            query = query.filter(JobVacancy.experience_required <= experience)

        if min_salary > 0:
            # Filters salaries that meet or exceed min_salary (handling USD/INR differences)
            query = query.filter(JobVacancy.salary_max >= min_salary)

        results = query.all()

        # Filter by skills programmatically (since skills are stored as JSON strings)
        if skills:
            target_skills = [s.strip().lower() for s in skills.split(",") if s.strip()]
            if target_skills:
                filtered_results = []
                for job in results:
                    job_skills = [s.lower() for s in job.get_skills()]
                    # Check if at least one skill matches
                    if any(ts in job_skills for ts in target_skills):
                        filtered_results.append(job)
                results = filtered_results

        # DYNAMIC SYNTHESIS: If we got very few results (less than 10) and a query was provided,
        # dynamically aggregate (generate) realistic jobs matching the criteria to mock a live scrape!
        if len(results) < 8 and (q or skills or location):
            extra_jobs = self._generate_matching_vacancies(q, skills, location, min_salary, experience, count=12)
            for j in extra_jobs:
                db.add(j)
            db.commit()
            
            # Re-run the query to fetch the newly generated jobs
            return self.search_jobs(db, q, skills, location, min_salary, experience, source, page, page_size)

        # Perform manual pagination
        total = len(results)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_jobs = results[start:end]

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "jobs": paginated_jobs
        }

    def force_refresh(self, db: Session):
        """Force a fresh aggregation, clear old expired jobs (>30 days), and seed new ones."""
        # Remove old jobs
        thirty_days_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        db.query(JobVacancy).filter(JobVacancy.created_at < thirty_days_ago).delete()
        
        # Deactivate 10% of existing listings (simulating filled positions)
        jobs = db.query(JobVacancy).filter(JobVacancy.is_active == True).all()
        for j in random.sample(jobs, min(len(jobs), int(len(jobs)*0.1))):
            j.is_active = False
            j.updated_at = datetime.datetime.now().isoformat()

        # Seed 25 fresh vacancies
        for _ in range(25):
            vacancy = self._generate_single_vacancy()
            db.add(vacancy)
        db.commit()
        return {"status": "success", "message": "Jobs cache refreshed. Expired records pruned, new vacancies loaded."}

    def get_analytics(self, db: Session):
        """Compute recruitment metrics for the dashboard widgets."""
        self.seed_initial_jobs(db)
        
        # 1. Active Openings by platform
        sources_list = db.query(JobVacancy.source).filter(JobVacancy.is_active == True).all()
        source_counts = {}
        for s in sources_list:
            src = s[0]
            source_counts[src] = source_counts.get(src, 0) + 1
        
        active_openings = [{"source": k, "count": v} for k, v in source_counts.items()]
        total_openings = sum(source_counts.values())

        # 2. Trending Jobs (Top Roles)
        titles_list = db.query(JobVacancy.title).filter(JobVacancy.is_active == True).all()
        title_counts = {}
        for t in titles_list:
            title = t[0]
            # Normalize title slightly (e.g. Senior/Lead removal for trends)
            norm_title = title.replace("Senior ", "").replace("Lead ", "").strip()
            title_counts[norm_title] = title_counts.get(norm_title, 0) + 1
        
        trending_jobs = sorted(title_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        trending_jobs = [{"title": k, "count": v} for k, v in trending_jobs]

        # 3. In-demand skills
        skills_list = db.query(JobVacancy.skills_required).filter(JobVacancy.is_active == True).all()
        skill_counts = {}
        for s in skills_list:
            try:
                skills = json.loads(s[0]) if s[0] else []
                for skill in skills:
                    skill_counts[skill] = skill_counts.get(skill, 0) + 1
            except:
                pass
        
        in_demand_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        in_demand_skills = [{"skill": k, "count": v} for k, v in in_demand_skills]

        # 4. Hiring Companies
        companies_list = db.query(JobVacancy.company).filter(JobVacancy.is_active == True).all()
        company_counts = {}
        for c in companies_list:
            comp = c[0]
            company_counts[comp] = company_counts.get(comp, 0) + 1
            
        hiring_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        hiring_companies = [{"company": k, "count": v} for k, v in hiring_companies]

        return {
            "total_active": total_openings,
            "active_openings_by_source": active_openings,
            "trending_jobs": trending_jobs,
            "in_demand_skills": in_demand_skills,
            "hiring_companies": hiring_companies,
            "last_updated": datetime.datetime.now().isoformat()
        }

    # ── PRIVATE UTILS ───────────────────────────────────────────────────────────
    def _generate_single_vacancy(self) -> JobVacancy:
        """Helper to create a single random realistic JobVacancy object."""
        role = random.choice(TECH_ROLES)
        company = random.choice(TECH_COMPANIES)
        loc = random.choice(LOCATIONS)
        source = random.choice(SOURCES)

        # Decide currency and salary based on source / location
        if source in ["Naukri", "Internshala"] or "India" in loc["name"]:
            currency = "INR"
            # Experience based salaries (LPA)
            if role["experience"] == 0:
                salary_min = random.choice([300000, 400000, 500000])
                salary_max = salary_min + random.choice([100000, 200000])
            else:
                salary_min = role["experience"] * random.choice([200000, 250000])
                salary_max = salary_min + random.choice([300000, 600000, 1000000])
        else:
            currency = "USD"
            # US/Global salaries
            if role["experience"] == 0:
                salary_min = random.choice([50000, 60000, 75000])
                salary_max = salary_min + random.choice([15000, 25000])
            else:
                salary_min = role["experience"] * random.choice([20000, 25000]) + 30000
                salary_max = salary_min + random.choice([30000, 50000, 80000])

        random_id = random.randint(1000000, 9999999)
        apply_url = f"https://www.{company['domain']}/jobs/{random_id}?source={source.lower()}"
        if source == "LinkedIn":
            apply_url = f"https://www.linkedin.com/jobs/view/{random_id}"
        elif source == "Indeed":
            apply_url = f"https://www.indeed.com/viewjob?jk={random_id}"

        # Give a small randomized shift to experience requirements
        exp_req = max(0, role["experience"] + random.choice([-1, 0, 1]))

        # Calculate a offset date for creation
        days_offset = random.randint(0, 15)
        created_dt = (datetime.datetime.now() - datetime.timedelta(days=days_offset)).isoformat()

        return JobVacancy(
            title=role["title"],
            company=company["name"],
            location=loc["name"],
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=currency,
            experience_required=exp_req,
            skills_required=json.dumps(role["skills"]),
            source=source,
            apply_link=apply_url,
            description=role["description"],
            is_active=True,
            created_at=created_dt,
            updated_at=created_dt
        )

    def _generate_matching_vacancies(
        self,
        q: str = None,
        skills: str = None,
        location: str = None,
        min_salary: int = 0,
        experience: int = None,
        count: int = 10
    ) -> list:
        """Generates mock job openings that match search filters specifically."""
        generated = []
        for _ in range(count):
            # Pick a base role, or use the search query as the title
            base_role = random.choice(TECH_ROLES)
            title = q.title() if q else base_role["title"]
            
            # Formulate matching skills
            role_skills = base_role["skills"]
            if skills:
                search_skills = [s.strip().title() for s in skills.split(",") if s.strip()]
                # Blend query skills and base role skills
                role_skills = list(set(role_skills + search_skills))

            # Set location
            loc_val = location if location else random.choice(LOCATIONS)["name"]
            
            # Set source
            source = random.choice(SOURCES)
            
            # Set company
            company = random.choice(TECH_COMPANIES)
            
            # Set experience
            exp_req = experience if experience is not None else base_role["experience"]

            # Salary settings
            currency = "INR" if (source in ["Naukri", "Internshala"] or "India" in loc_val) else "USD"
            salary_min = max(min_salary, 60000 if currency == "USD" else 500000)
            salary_max = salary_min + (30000 if currency == "USD" else 300000)

            # Generate realistic description
            description = f"Excellent opportunity for a {title} at {company['name']} in {loc_val}. " \
                          f"We are looking for self-motivated candidates with experience in {', '.join(role_skills)}. " \
                          f"Join us to solve challenging tasks and grow your engineering capabilities."

            random_id = random.randint(1000000, 9999999)
            apply_url = f"https://www.{company['domain']}/jobs/{random_id}?source={source.lower()}"

            generated.append(JobVacancy(
                title=title,
                company=company["name"],
                location=loc_val,
                salary_min=salary_min,
                salary_max=salary_max,
                salary_currency=currency,
                experience_required=exp_req,
                skills_required=json.dumps(role_skills),
                source=source,
                apply_link=apply_url,
                description=description,
                is_active=True,
                created_at=datetime.datetime.now().isoformat(),
                updated_at=datetime.datetime.now().isoformat()
            ))
        return generated
