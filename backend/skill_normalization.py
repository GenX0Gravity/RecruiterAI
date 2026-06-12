"""
skill_normalization.py — Enhanced skill normalizer with category mapping.

Maps raw extracted skills to standardized ESCO-like terms AND classifies
them into technology categories. CPU-only, O(1) dictionary lookups.
"""

import json
import re

# ---------------------------------------------------------------------------
# Taxonomy: raw variant → canonical name
# ---------------------------------------------------------------------------
SKILL_ALIASES = {
    # Python ecosystem
    "python programming": "Python", "python3": "Python", "py": "Python",
    "ml": "Machine Learning", "machine learning": "Machine Learning",
    "deep learning": "Deep Learning", "dl": "Deep Learning",
    "ai": "Artificial Intelligence", "artificial intelligence": "Artificial Intelligence",
    "nlp": "Natural Language Processing", "natural language processing": "Natural Language Processing",
    "cv": "Computer Vision", "computer vision": "Computer Vision",
    "js": "JavaScript", "javascript": "JavaScript", "es6": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "reactjs": "React", "react.js": "React",
    "vuejs": "Vue.js", "vue": "Vue.js",
    "angular": "Angular", "angularjs": "Angular",
    "node": "Node.js", "nodejs": "Node.js", "node.js": "Node.js",
    "express": "Express.js", "expressjs": "Express.js",
    "nextjs": "Next.js", "next": "Next.js",
    "k8s": "Kubernetes", "kube": "Kubernetes",
    "aws": "Amazon Web Services", "amazon web services": "Amazon Web Services",
    "gcp": "Google Cloud Platform", "google cloud": "Google Cloud Platform",
    "azure": "Microsoft Azure",
    "devops": "DevOps",
    "ci/cd": "CI/CD", "cicd": "CI/CD",
    "git": "Git", "github": "GitHub", "gitlab": "GitLab",
    "docker": "Docker", "containerization": "Docker",
    "tf": "TensorFlow", "tensorflow": "TensorFlow",
    "pytorch": "PyTorch", "torch": "PyTorch",
    "sklearn": "scikit-learn", "scikit learn": "scikit-learn",
    "pandas": "Pandas", "numpy": "NumPy", "scipy": "SciPy",
    "sql": "SQL", "mysql": "MySQL", "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL", "mongo": "MongoDB", "mongodb": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch",
    "rest": "REST API", "restful": "REST API", "graphql": "GraphQL",
    "c++": "C++", "cpp": "C++", "c#": "C#", "csharp": "C#",
    "java": "Java", "spring": "Spring Boot", "springboot": "Spring Boot",
    "go": "Go (Golang)", "golang": "Go (Golang)",
    "rust": "Rust",
    "flask": "Flask", "django": "Django", "fastapi": "FastAPI",
    "linux": "Linux", "bash": "Bash/Shell", "shell": "Bash/Shell",
    "terraform": "Terraform", "ansible": "Ansible", "jenkins": "Jenkins",
    "agile": "Agile", "scrum": "Scrum", "jira": "Jira",
    "figma": "Figma", "photoshop": "Photoshop",
}

# ---------------------------------------------------------------------------
# Category Classification: canonical_name.lower() → category
# ---------------------------------------------------------------------------
SKILL_CATEGORIES = {
    "Programming Languages": {
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go (Golang)",
        "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB",
        "Dart", "Haskell", "Perl", "Lua", "Bash/Shell",
    },
    "Frameworks": {
        "React", "Vue.js", "Angular", "Next.js", "Node.js", "Express.js",
        "Django", "Flask", "FastAPI", "Spring Boot", "Laravel", "Rails",
        "ASP.NET", "Svelte", "Nuxt.js", "Nest.js",
    },
    "Databases": {
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
        "Cassandra", "DynamoDB", "SQLite", "Oracle", "MariaDB", "CouchDB",
        "Firestore", "Supabase",
    },
    "Cloud Platforms": {
        "Amazon Web Services", "Google Cloud Platform", "Microsoft Azure",
        "Kubernetes", "Docker", "Serverless", "Firebase", "Heroku", "Vercel",
        "DigitalOcean", "Cloudflare",
    },
    "DevOps Tools": {
        "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "Terraform",
        "Ansible", "Docker", "Kubernetes", "Linux", "Nginx",
        "Prometheus", "Grafana", "ArgoCD", "Helm",
    },
    "AI/ML Skills": {
        "Machine Learning", "Deep Learning", "Natural Language Processing",
        "Computer Vision", "Artificial Intelligence", "TensorFlow", "PyTorch",
        "scikit-learn", "Pandas", "NumPy", "SciPy", "Hugging Face",
        "LangChain", "OpenAI API", "Transformers", "BERT", "GPT",
        "Reinforcement Learning", "Data Science", "MLflow",
    },
    "Soft Skills": {
        "Leadership", "Communication", "Teamwork", "Problem Solving",
        "Critical Thinking", "Time Management", "Project Management",
        "Agile", "Scrum", "Mentoring", "Collaboration",
    },
}


class SkillNormalizer:
    """
    CPU-optimized skill normalizer with:
    1. Alias-based normalization (dict lookup)
    2. Category classification
    3. Enriched output: { flat: [...], categorized: {...} }
    """

    def __init__(self, taxonomy_file: str = None):
        self.aliases = dict(SKILL_ALIASES)
        if taxonomy_file:
            self._load_taxonomy(taxonomy_file)

        # Build reverse lookup: canonical.lower() → category
        self._category_map = {}
        for cat, skill_set in SKILL_CATEGORIES.items():
            for skill in skill_set:
                self._category_map[skill.lower()] = cat

    def _load_taxonomy(self, filepath: str):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                self.aliases.update(json.load(f))
        except Exception as e:
            print(f"[SkillNormalizer] Failed to load taxonomy: {e}")

    def normalize_skill(self, raw: str) -> str:
        clean = raw.strip().lower()
        return self.aliases.get(clean, raw.title())

    def normalize_skills_list(self, skills: list) -> list:
        seen = set()
        result = []
        for s in skills:
            norm = self.normalize_skill(s)
            if norm.lower() not in seen and len(norm) >= 2:
                seen.add(norm.lower())
                result.append(norm)
        return result

    def categorize_skills(self, normalized_skills: list) -> dict:
        """
        Returns {category: [skills]} for display and scoring.
        Skills not in any category go to "Other".
        """
        categorized = {cat: [] for cat in SKILL_CATEGORIES}
        categorized["Other"] = []

        for skill in normalized_skills:
            cat = self._category_map.get(skill.lower())
            if cat:
                categorized[cat].append(skill)
            else:
                # Fuzzy match: check if skill name contains a known category keyword
                assigned = False
                for cat_name, skill_set in SKILL_CATEGORIES.items():
                    for known in skill_set:
                        if known.lower() in skill.lower() or skill.lower() in known.lower():
                            categorized[cat_name].append(skill)
                            assigned = True
                            break
                    if assigned:
                        break
                if not assigned:
                    categorized["Other"].append(skill)

        # Remove empty categories
        return {k: v for k, v in categorized.items() if v}

    def enrich(self, raw_skills: list) -> dict:
        """
        Full pipeline: normalize → deduplicate → categorize.
        Returns: { "flat": [...], "categorized": {...} }
        """
        normalized = self.normalize_skills_list(raw_skills)
        categorized = self.categorize_skills(normalized)
        return {"flat": normalized, "categorized": categorized}
