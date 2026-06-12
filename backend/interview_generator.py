import re
from typing import List, Dict, Optional

# Core pre-defined questions bank
SKILLS_DB = {
    "python": {
        "Beginner": [
            {
                "question": "What is the difference between lists and tuples in Python, and when would you use each?",
                "model_answer": "Lists are mutable, meaning they can be modified after creation. Tuples are immutable. Lists use square brackets [] and tuples use parentheses (). Use lists for dynamic collections of homogenous items, and tuples for fixed records or to use as dictionary keys.",
                "criteria": ["Mentions mutability vs immutability", "Identifies correct syntax", "Mentions tuples as dictionary keys"]
            },
            {
                "question": "What are Python decorators and how do they work?",
                "model_answer": "Decorators are functions that take another function as an argument, extend its behavior without explicitly modifying it, and return a new function. They are commonly used for logging, access control, and caching, represented by the @decorator syntax.",
                "criteria": ["Explains decorators as wrappers", "Mentions taking a function and returning a function", "Gives real-world use cases (logging, auth)"]
            }
        ],
        "Intermediate": [
            {
                "question": "Explain Python's GIL (Global Interpreter Lock) and how it affects multi-threaded applications.",
                "model_answer": "The GIL is a mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes at once in CPython. This makes single-threaded performance fast but limits CPU-bound multi-threading. For parallel CPU-bound tasks, developers should use multiprocessing or running tasks in C-extensions.",
                "criteria": ["Defines GIL as a mutex in CPython", "Explains impact on CPU-bound vs IO-bound multi-threading", "Suggests multiprocessing as a bypass"]
            },
            {
                "question": "What is the difference between __new__ and __init__ in Python classes?",
                "model_answer": "__new__ is the constructor method responsible for creating a new instance of a class, returning the instance. __init__ is the initializer method that takes the created instance and initializes its attributes. __new__ runs first, then __init__.",
                "criteria": ["Identifies __new__ as the creator", "Identifies __init__ as the initializer", "States execution order correctly"]
            }
        ],
        "Advanced": [
            {
                "question": "How do Python generators work, and what is the difference between yield and return in terms of memory efficiency?",
                "model_answer": "Generators are iterators created using functions with a 'yield' statement. Unlike 'return', which outputs a value and terminates the function, 'yield' pauses execution, saves the function's state, and returns a value to the caller. This allows generating items on-the-fly (lazy evaluation), utilizing O(1) memory instead of loading large lists into memory.",
                "criteria": ["Explains lazy evaluation / on-the-fly generation", "Differentiates yield vs return state preservation", "Mentions O(1) memory footprint"]
            },
            {
                "question": "Explain Metaclasses in Python and when they are appropriate to use.",
                "model_answer": "Metaclasses are 'classes of classes' that define how classes behave and are constructed. Just as a class defines the behavior of instances, a metaclass defines the behavior of classes. They are appropriate for API enforcement, registering plugins on class creation, or modifying attributes dynamically at class definition time (e.g. in ORMs).",
                "criteria": ["Defines metaclasses as classes of classes", "Explains __metaclass__ or type inheritance", "Mentions validation/ORM use cases"]
            }
        ]
    },
    "react": {
        "Beginner": [
            {
                "question": "What are React hooks, and what rules must be followed when using them?",
                "model_answer": "Hooks are functions that let you hook into React state and lifecycle features from function components. The two golden rules are: 1. Only call hooks at the top level (not inside loops or conditions). 2. Only call hooks from React function components or custom hooks.",
                "criteria": ["Explains hooks link state/lifecycle in function components", "Mentions not calling hooks conditionally", "Mentions only calling hooks from React components/custom hooks"]
            },
            {
                "question": "Explain the difference between Props and State in React.",
                "model_answer": "Props (short for properties) are read-only inputs passed down from parent components to child components to configure them. State is a local, mutable data structure maintained inside a component that determines how it renders and can be updated by the component itself.",
                "criteria": ["Props are read-only/external", "State is mutable/local to the component", "Explains updates trigger re-renders"]
            }
        ],
        "Intermediate": [
            {
                "question": "How does the virtual DOM work in React, and how does diffing optimize rendering?",
                "model_answer": "React creates an in-memory lightweight copy of the real DOM (Virtual DOM). When state changes, a new Virtual DOM tree is built. React then compares (diffs) this new tree with the previous one, computes the minimum set of changes required, and batched-updates only those modified nodes in the real DOM, avoiding expensive layout reflows.",
                "criteria": ["Explains virtual DOM as in-memory copy", "Describes comparison / diffing process", "Mentions batch updates to the real DOM"]
            },
            {
                "question": "What is the purpose of React.memo and useMemo, and how do they differ?",
                "model_answer": "React.memo is a higher-order component that memoizes the entire component to prevent unnecessary re-renders if props haven't changed. useMemo is a hook that memoizes the result of an expensive calculation inside a component, re-running only when specific dependencies change.",
                "criteria": ["React.memo is for entire components", "useMemo is for expensive value calculations inside components", "Mentions dependency arrays for useMemo"]
            }
        ],
        "Advanced": [
            {
                "question": "Explain React's Concurrent Mode and the fiber architecture rendering pipeline.",
                "model_answer": "Concurrent Mode allows React to interrupt rendering work to handle high-priority user interactions (like typing). The Fiber architecture splits rendering into incremental work units (fibers). It uses a two-phase commit: the render phase (reconciliation, asynchronous, interruptible) and the commit phase (DOM updates, synchronous, non-interruptible), making complex UIs feel fluid.",
                "criteria": ["Mentions fiber rendering work units", "Explains interruptible render phase vs commit phase", "States benefits for high-priority user events (typing/responsiveness)"]
            },
            {
                "question": "How do you optimize state updates and context values to prevent unnecessary re-renders across deeply nested trees?",
                "model_answer": "Optimize React Context by splitting context provider states (separating state values from update handlers), memoizing context values using useMemo, or utilizing state managers (like Redux, Zustand, or Recoil) which support fine-grained selector-based subscription models.",
                "criteria": ["Suggests splitting context state and dispatchers", "Mentions useMemo on context value objects", "Proposes selector-based state management (Zustand, Redux) as an alternative"]
            }
        ]
    },
    "sql": {
        "Beginner": [
            {
                "question": "What is the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN?",
                "model_answer": "INNER JOIN returns records that have matching values in both tables. LEFT JOIN returns all records from the left table, and matched records from the right (unmatched rows get NULL). RIGHT JOIN is the opposite, returning all rows from the right table and matched rows from the left.",
                "criteria": ["Explains INNER JOIN matches both tables", "Explains LEFT JOIN outputs all left rows + NULLs for right unmatched", "Explains RIGHT JOIN is inverse of LEFT JOIN"]
            },
            {
                "question": "What is the purpose of the GROUP BY clause and how does it differ from ORDER BY?",
                "model_answer": "GROUP BY partitions data rows into groups based on matching values in specified columns, typically used with aggregate functions (COUNT, SUM, AVG) to summarize metrics. ORDER BY simply sorts the final result set in ascending or descending order.",
                "criteria": ["GROUP BY aggregates data by column groups", "ORDER BY sorts the output", "Mentions use of aggregate functions with GROUP BY"]
            }
        ],
        "Intermediate": [
            {
                "question": "What are SQL indexes, how do they speed up queries, and what is the trade-off?",
                "model_answer": "Indexes are data structures (like B-trees) that store references to rows, allowing fast search lookups without scanning the entire table. The trade-off is that indexes require additional disk storage and slow down write operations (INSERT, UPDATE, DELETE) because the index must be updated along with the data.",
                "criteria": ["Explains index as lookup structure (B-tree/hash)", "Explains write overhead (INSERT/UPDATE slowdown)", "Mentions storage trade-off"]
            },
            {
                "question": "What are Window Functions in SQL, and how do they differ from GROUP BY aggregates?",
                "model_answer": "Window functions perform calculations across a set of table rows that are related to the current row, using the OVER() clause. Unlike GROUP BY, which collapses multiple rows into a single summary row, window functions compute values while preserving the identity of individual rows in the output.",
                "criteria": ["Uses OVER() clause syntax", "Explains it does not collapse rows", "Mentions use cases (running totals, ranking rows)"]
            }
        ],
        "Advanced": [
            {
                "question": "Explain database normalization tiers (1NF, 2NF, 3NF) and the trade-off against denormalization in read-heavy applications.",
                "model_answer": "Normalization organizes data to reduce redundancy: 1NF eliminates duplicate columns/groups; 2NF removes partial key dependencies; 3NF removes transitive dependencies (no non-key determines another non-key). For read-heavy applications, denormalization is preferred because it reduces complex joins, improving query read speeds at the cost of duplicate data and write complexity.",
                "criteria": ["Defines 1NF, 2NF, and 3NF conditions", "Explains denormalization optimizes read speeds", "Mentions write redundancy/overhead of denormalized tables"]
            },
            {
                "question": "How do you diagnose and optimize a slow query running in production?",
                "model_answer": "First, analyze the query plan using EXPLAIN/EXPLAIN ANALYZE to identify sequential scans, index misses, or bad joins. Optimization steps: add appropriate composite indexes, rewrite nested subqueries as JOINs/CTEs, prune unused columns (avoid SELECT *), partition large tables, or implement materialized views.",
                "criteria": ["Mentions EXPLAIN ANALYZE", "Identifies full table scans / sequential scans", "Suggests indexing, CTEs, or materialized views as optimization strategies"]
            }
        ]
    },
    "machine learning": {
        "Beginner": [
            {
                "question": "What is the difference between supervised and unsupervised learning?",
                "model_answer": "Supervised learning trains a model on labeled training data (inputs mapped to known output targets). Unsupervised learning trains on unlabeled data, finding underlying patterns, clusters, or structures within the data without predefined outcomes.",
                "criteria": ["Supervised uses labeled data/targets", "Unsupervised uses unlabeled data", "Gives examples (Classification/Regression vs Clustering/PCA)"]
            }
        ],
        "Intermediate": [
            {
                "question": "Explain the bias-variance trade-off in machine learning.",
                "model_answer": "Bias is error introduced by simplifying assumptions (leads to underfitting, poor training performance). Variance is error from sensitivity to fluctuations in training data (leads to overfitting, poor validation performance). The trade-off is finding the sweet spot that minimizes total error.",
                "criteria": ["Defines bias as underfitting", "Defines variance as overfitting", "Explains trade-off minimizing total generalization error"]
            }
        ],
        "Advanced": [
            {
                "question": "How do transformers and self-attention layers work, and how do they handle sequence dependencies differently than RNNs?",
                "model_answer": "Transformers use self-attention to calculate pairwise relations between all tokens in a sequence simultaneously, allowing parallel computation. RNNs process tokens sequentially, creating bottlenecks and vanishing gradients. Self-attention uses Query, Key, and Value vectors to weigh token interactions regardless of distance.",
                "criteria": ["Mentions parallel processing vs sequential processing of RNNs", "Defines self-attention via Query, Key, Value mappings", "Explains mitigation of vanishing gradients over long sequences"]
            }
        ]
    }
}

# General question banks for behavioral, HR, and situational categories
BEHAVIORAL_DB = {
    "Beginner": [
        {
            "question": "Tell me about a time you worked on a team project and encountered a disagreement. How did you resolve it?",
            "model_answer": "Example answer should use the STAR method (Situation, Task, Action, Result). Focus on active listening, collaborative compromise, and putting team objectives first to deliver the project successfully.",
            "criteria": ["Uses STAR structure", "Emphasizes constructive communication", "Outcome is positive for the project/team"]
        },
        {
            "question": "Describe a situation where you had a tight deadline and multiple competing tasks. How did you prioritize?",
            "model_answer": "Recruiters look for analytical prioritization (e.g. Eisenhower Matrix, urgency vs impact) and proactive communication with stakeholders to align on expected delivery dates.",
            "criteria": ["Mentions prioritization frameworks/methods", "Proactive communication", "Deliverables were met successfully"]
        }
    ],
    "Intermediate": [
        {
            "question": "Describe a scenario where you made a mistake on a project. How did you handle it, and what did you learn?",
            "model_answer": "Focus on immediate transparency, taking ownership, collaborating on a quick fix, and implementing tests/safeguards to prevent the same mistake from recurring.",
            "criteria": ["Takes full ownership without shifting blame", "Focuses on the immediate resolution action", "Mentions process improvements implemented afterward"]
        },
        {
            "question": "Tell me about a time you had to adapt quickly to a major change in project requirements or technology stack.",
            "model_answer": "Explain the step-by-step approach to self-learning, leveraging documentation and peer support, and managing stakeholder expectations during transition speeds.",
            "criteria": ["Shows positive adaptability mindset", "Systematic learning approach documented", "Successful project alignment achieved"]
        }
    ],
    "Advanced": [
        {
            "question": "Tell me about a time you had to lead a complex project with multiple stakeholders who had conflicting requirements. How did you align them?",
            "model_answer": "Describe negotiating trade-offs using data, setting clear architectural boundaries, establishing a steering roadmap, and maintaining transparency through structured status dashboards.",
            "criteria": ["Mentions consensus-building/negotiation methods", "Relies on data/metrics for decision making", "Successful delivery with stakeholder alignment"]
        },
        {
            "question": "Describe a time you mentored a junior engineer or championed a technical initiative that met resistance from the team.",
            "model_answer": "Focus on empathy, holding coaching pairing sessions, building a proof of concept (PoC) to demonstrate value, and establishing shared standards to ease technical adoption.",
            "criteria": ["Employs coaching-oriented approach", "Uses demo/data to ease tech resistance", "Reflects organizational impact"]
        }
    ]
}

HR_DB = {
    "Beginner": [
        {
            "question": "Why are you interested in this role and our company?",
            "model_answer": "Candidate should tie their background and interest to the company's core product, engineering scale, or mission. Avoid generic answers.",
            "criteria": ["Mentions specific details about the company", "Connects role to personal career interests"]
        },
        {
            "question": "Where do you see yourself professionally in the next 2-3 years?",
            "model_answer": "Looking for growth alignment (e.g. becoming a senior engineer, specializing in backend/AI, or leading systems), showing ambition combined with realistic timelines.",
            "criteria": ["Reflects target role skills growth", "Shows stability and motivation"]
        }
    ],
    "Intermediate": [
        {
            "question": "What are your salary expectations for this position?",
            "model_answer": "Should reference standard market research bands or express flexibility based on total compensation parameters (benefits, equity, bonuses).",
            "criteria": ["Gives clear range or state criteria-based expectations", "Maintains professional negotiation posture"]
        },
        {
            "question": "How do you handle workplace stress or burnout?",
            "model_answer": "Mentions prioritization, time management, setting professional boundaries, communicating workload constraints to managers, and active hobbies/work-life balance.",
            "criteria": ["Proactive warning triggers identified", "Communicates boundaries and workload priorities to managers"]
        }
    ],
    "Advanced": [
        {
            "question": "How do you assess if a company culture is a good fit for you, and what kind of leadership style do you thrive under?",
            "model_answer": "Focus on autonomy, constructive code feedback, engineering transparency, and metrics-driven leadership. Shows mature self-knowledge.",
            "criteria": ["Defines cultural preferences clearly", "Articulates concrete leadership style targets (autonomy vs guidance)"]
        }
    ]
}

SITUATIONAL_DB = {
    "Beginner": [
        {
            "question": "You pull code from main, and it fails to compile or run locally. What steps do you take to troubleshoot?",
            "model_answer": "Check git logs for recent changes, verify local environment dependencies/configs match, search local build logs for exact error stack, and ask in team channels if a blocker exists before spending hours debugging.",
            "criteria": ["Logical debugging order (Logs -> Env -> Logs)", "Mentions checking git history", "Employs team communication before excessive time waste"]
        }
    ],
    "Intermediate": [
        {
            "question": "A user reports a critical bug in production, but you cannot reproduce it in your local dev environment. How do you resolve this?",
            "model_answer": "First, analyze production logs (Datadog/Sentry) for stack traces and exact parameters. Compare production database constraints and environment variable differences with local configs. Mock identical payload states or fetch sandbox data to replicate the exact environment.",
            "criteria": ["Mentions examining production logs/error trackers", "Investigates differences in environments/configs", "Uses sandboxes/payload mocks"]
        }
    ],
    "Advanced": [
        {
            "question": "Our system experiences a sudden spike in traffic, causing high database CPU utilization and api timeouts. How do you mitigate this immediately and long-term?",
            "model_answer": "Immediate: Scale up DB read replicas, activate caching layer (Redis) for heavy read endpoints, add rate limiting/throttling to API gateway, or temporarily disable non-critical cron operations. Long-term: Optimize slow query indexes, partition databases, migrate to asynchronous queues (Celery/RabbitMQ) for write ops.",
            "criteria": ["Lists immediate mitigation options (Read replicas, caching, rate limiting)", "Lists long-term resolutions (Query tuning, database partitioning, queues)", "Addresses both read bottlenecks and write bottlenecks"]
        }
    ]
}

CODING_DB = {
    "python": [
        {
            "question": "Write a Python function to find the first non-repeating character in a string and return its index. If all characters repeat, return -1. Optimize for O(N) runtime.",
            "model_answer": "def first_uniq_char(s: str) -> int:\n    char_count = {}\n    for char in s:\n        char_count[char] = char_count.get(char, 0) + 1\n    for idx, char in enumerate(s):\n        if char_count[char] == 1:\n            return idx\n    return -1",
            "criteria": ["O(N) runtime solution using hash map / dict", "Handles edge cases (empty string, all repeating)", "Uses single or two-pass iteration"]
        }
    ],
    "javascript": [
        {
            "question": "Write a JavaScript function that performs a deep clone of a nested object, handling nested arrays and objects. Avoid using JSON.parse(JSON.stringify(obj)) to preserve functions or dates.",
            "model_answer": "function deepClone(obj, hash = new WeakMap()) {\n  if (obj === null || typeof obj !== 'object') return obj;\n  if (obj instanceof Date) return new Date(obj);\n  if (obj instanceof RegExp) return new RegExp(obj);\n  if (hash.has(obj)) return hash.get(obj);\n  \n  const clone = Array.isArray(obj) ? [] : {};\n  hash.set(obj, clone);\n  \n  for (const key in obj) {\n    if (obj.hasOwnProperty(key)) {\n      clone[key] = deepClone(obj[key], hash);\n    }\n  }\n  return clone;\n}",
            "criteria": ["Handles recursion correctly", "Checks for primitives/null", "Handles arrays vs objects", "Uses WeakMap/tracker to avoid circular references"]
        }
    ],
    "sql": [
        {
            "question": "Given a 'salaries' table with columns (employee_id, department_id, salary), write a SQL query to find the employees who earn the highest salary in each department.",
            "model_answer": "SELECT department_id, employee_id, salary\nFROM (\n  SELECT department_id, employee_id, salary,\n         RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank\n  FROM salaries\n) t\nWHERE t.rank = 1;",
            "criteria": ["Uses window function (RANK/DENSE_RANK) or correlated subquery", "Partitions correctly by department_id", "Handles salary ties if they exist"]
        }
    ]
}

class InterviewGenerator:
    """
    Core AI Interview Prep Engine.
    Dynamically generates and structures interview guides customized
    for a candidate profile and target job description requirements.
    """

    def generate_guide(self, candidate_data: dict, jd_text: str = "", difficulty: str = "Intermediate") -> dict:
        """
        Compiles standard, skill-specific, and situational interview questions.
        
        Args:
          candidate_data: Candidate parsed_data containing Skills and Experience
          jd_text: Target job description
          difficulty: Beginner | Intermediate | Advanced
        """
        # 1. Normalize variables
        cand_skills = [s.lower().strip() for s in candidate_data.get("Skills", [])]
        jd_skills = self._extract_skills_from_text(jd_text)
        
        # Determine intersection of skills
        matched_skills = list(set(cand_skills) & set(jd_skills))
        # Fallback to candidate skills if no intersection matches
        target_skills = matched_skills if matched_skills else cand_skills[:4]
        
        # 2. Generate Technical Questions
        tech_questions = []
        for skill in target_skills:
            if skill in SKILLS_DB:
                # Select a question for that skill matching difficulty
                level_qs = SKILLS_DB[skill].get(difficulty, SKILLS_DB[skill]["Beginner"])
                if level_qs:
                    tech_questions.append(level_qs[0])
            else:
                # Generate dynamic fallback question based on template
                tech_questions.append(self._generate_fallback_tech_question(skill, difficulty))
                
        # Limit tech questions
        tech_questions = tech_questions[:4]
        if not tech_questions:
            # Add general backend tech question
            tech_questions.append(self._generate_fallback_tech_question("Software Engineering", difficulty))

        # 3. Generate Coding Questions
        coding_questions = []
        # Find coding language in target skills
        found_lang = False
        for skill in target_skills:
            if skill in CODING_DB:
                coding_questions.append(CODING_DB[skill][0])
                found_lang = True
                break
        if not found_lang:
            # general coding question
            coding_questions.append(CODING_DB["python"][0])

        # 4. Generate Behavioral Questions
        behav_qs = BEHAVIORAL_DB.get(difficulty, BEHAVIORAL_DB["Intermediate"])
        behavioral_questions = behav_qs[:2]

        # 5. Generate HR Questions
        hr_qs = HR_DB.get(difficulty, HR_DB["Intermediate"])
        hr_questions = hr_qs[:2]

        # 6. Generate Situational Questions
        sit_qs = SITUATIONAL_DB.get(difficulty, SITUATIONAL_DB["Intermediate"])
        situational_questions = sit_qs[:2]

        return {
            "difficulty": difficulty,
            "matched_skills": target_skills[:5],
            "questions": {
                "Technical": tech_questions,
                "Coding": coding_questions,
                "Behavioral": behavioral_questions,
                "Situational": situational_questions,
                "HR": hr_questions
            }
        }

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Simple keyword matching to extract standard skills from a JD."""
        if not text:
            return []
        text_lower = text.lower()
        extracted = []
        for skill in SKILLS_DB.keys():
            if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                extracted.append(skill)
        return extracted

    def _generate_fallback_tech_question(self, skill: str, difficulty: str) -> dict:
        """Generates dynamic template questions for skills missing from standard DB."""
        skill_name = skill.title()
        if difficulty == "Beginner":
            return {
                "question": f"Explain the core features of {skill_name} and describe its typical usage pattern in web applications.",
                "model_answer": f"A comprehensive definition of {skill_name}, outlining standard data structures/interfaces, setup commands, and showing a simple mock configuration or syntax layout.",
                "criteria": [f"Defines {skill_name} core components", "Explains installation or import syntax", "Delineates standard beginner use cases"]
            }
        elif difficulty == "Intermediate":
            return {
                "question": f"What are the best practices for handling asynchronous actions, errors, or caching when using {skill_name}?",
                "model_answer": f"Best practices for {skill_name} resource management: implementing try-except blocks/exception handling, caching intermediate data structures, and optimizing runtime execution context.",
                "criteria": ["Mentions error/exception safety", "Details caching or optimization triggers", "Provides structured architectural tips"]
            }
        else: # Advanced
            return {
                "question": f"How would you architect a distributed, highly scalable, and secure microservices pipeline using {skill_name}?",
                "model_answer": f"Advanced system design architecture leveraging {skill_name}: scaling read/write loads, partitioning schemas, locking concurrency, implementing security auth tokens, and resolving clustering/networking failures.",
                "criteria": ["Mentions microservices/security structures", "Mentions concurrency locks / parallel scaling", "Addresses fault tolerance / recovery mechanics"]
            }
