from sqlalchemy import create_engine, Column, Integer, String, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import json
import os
import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./recruiter_ats.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    filename = Column(String)
    
    # Scores
    overall_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    project_score = Column(Float, default=0.0)
    recommendation = Column(String)
    
    # Store the entire parsed dictionary as a JSON string
    parsed_data = Column(Text)
    
    # Productivity fields
    status = Column(String, default="Pending") # Pending, Shortlisted, Rejected
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    
    # Relationships
    notes = relationship("Note", back_populates="candidate", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="candidate", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="candidate", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="candidate", cascade="all, delete-orphan")

    def get_parsed_data(self):
        try:
            return json.loads(self.parsed_data) if self.parsed_data else {}
        except:
            return {}


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    content = Column(Text)
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    
    candidate = relationship("Candidate", back_populates="notes")


class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    name = Column(String)
    
    candidate = relationship("Candidate", back_populates="tags")


class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    title = Column(String)
    scheduled_at = Column(String)
    notes = Column(Text, nullable=True)
    
    candidate = relationship("Candidate", back_populates="interviews")


class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    subject = Column(String)
    body = Column(Text)
    sent_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    sender = Column(String)
    
    candidate = relationship("Candidate", back_populates="email_logs")


class JobVacancy(Base):
    __tablename__ = "job_vacancies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    location = Column(String, index=True)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String, default="USD")
    experience_required = Column(Integer, default=0) # in years
    skills_required = Column(Text) # JSON serialized list of skills
    source = Column(String, index=True) # LinkedIn, Indeed, Naukri, Wellfound, Internshala, Glassdoor, Company Career Pages
    apply_link = Column(String)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.now().isoformat())

    def get_skills(self):
        try:
            return json.loads(self.skills_required) if self.skills_required else []
        except:
            return []


# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
