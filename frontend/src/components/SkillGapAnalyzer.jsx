import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal, RefreshCw, Sparkles, CheckCircle2, XCircle, Clock,
  Calendar, BookOpen, Award, Check, ChevronRight, Info, AlertTriangle,
  GraduationCap, TrendingUp, ArrowRight, BarChart2
} from 'lucide-react';
import { useToast } from './Toast';

export default function SkillGapAnalyzer({ backendUrl }) {
  const { addToast } = useToast();

  // Dropdown options states
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  
  const [jobsList, setJobsList] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  const [useCustomJd, setUseCustomJd] = useState(false);
  const [customJdText, setCustomJdText] = useState('');

  // Analysis Result States
  const [loading, setLoading] = useState(false);
  const [gapData, setGapData] = useState(null);

  // Fetch Candidates for Selection
  const fetchCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const res = await fetch(`${backendUrl}/candidates?page=1&page_size=100`);
      const data = await res.json();
      setCandidatesList(data.candidates || []);
      if (data.candidates && data.candidates.length > 0) {
        setSelectedCandidateId(data.candidates[0].id.toString());
      }
    } catch {
      console.error('Failed to load candidates for skill gap dropdown.');
    } finally {
      setCandidatesLoading(false);
    }
  }, [backendUrl]);

  // Fetch Active Jobs for Selection
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/jobs?page_size=100`);
      const data = await res.json();
      setJobsList(data.jobs || []);
      if (data.jobs && data.jobs.length > 0) {
        setSelectedJobId(data.jobs[0].id.toString());
      }
    } catch {
      console.error('Failed to load active jobs for skill gap dropdown.');
    } finally {
      setJobsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, [fetchCandidates, fetchJobs]);

  const handleRunAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCandidateId) {
      addToast('Please select a candidate first.', 'error');
      return;
    }

    setLoading(true);
    setGapData(null);

    try {
      let queryStr = '';
      if (useCustomJd) {
        if (customJdText.trim()) {
          queryStr += `custom_jd=${encodeURIComponent(customJdText)}`;
        }
      } else if (selectedJobId) {
        queryStr += `job_id=${selectedJobId}`;
      }

      const res = await fetch(`${backendUrl}/candidates/${selectedCandidateId}/skill-gap?${queryStr}`);
      if (!res.ok) throw new Error('API failed to return gap analysis data.');
      const data = await res.json();
      
      setGapData(data);
      addToast('Skill gap analysis complete!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to analyze skill gaps.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCandidateObj = candidatesList.find(c => c.id.toString() === selectedCandidateId);
  const selectedJobObj = jobsList.find(j => j.id.toString() === selectedJobId);

  // Dynamic status text based on weeks to ready
  const getReadinessRating = (weeks) => {
    if (weeks === 0) return { label: 'Job-Ready', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)' };
    if (weeks <= 4) return { label: 'Highly Aligned', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.1)' };
    if (weeks <= 10) return { label: 'Standard Upskilling Needed', color: 'var(--accent-yellow)', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'Major Skill Gap', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.1)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={28} style={{ color: 'var(--accent-purple)' }} /> Skill Gap Analytics
        </h1>
        <p className="page-subtitle">Map candidate skills against active job requirements to generate dynamic learning roadmap pathways</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side: Setup Parameters */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
            <SlidersHorizontal size={14} /> Gap Parameters
          </h3>

          <form onSubmit={handleRunAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Candidate selection */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SELECT CANDIDATE</label>
              {candidatesLoading ? (
                <div className="skeleton" style={{ height: 38 }} />
              ) : (
                <select
                  className="input-field"
                  style={{ fontSize: 12, height: 38 }}
                  value={selectedCandidateId}
                  onChange={e => setSelectedCandidateId(e.target.value)}
                >
                  {candidatesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.overall_score}% ATS)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target Job selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>TARGET JOB DESCRIPTION</label>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setUseCustomJd(prev => !prev)}
                >
                  {useCustomJd ? 'Select Active Job' : 'Paste Custom JD'}
                </button>
              </div>

              {useCustomJd ? (
                <textarea
                  className="input-field"
                  style={{ fontSize: 12, minHeight: 95, resize: 'vertical' }}
                  placeholder="Paste roles, tech stack, and requirements..."
                  value={customJdText}
                  onChange={e => setCustomJdText(e.target.value)}
                />
              ) : jobsLoading ? (
                <div className="skeleton" style={{ height: 38 }} />
              ) : (
                <select
                  className="input-field"
                  style={{ fontSize: 12, height: 38 }}
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                >
                  {jobsList.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.company})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button type="submit" className="btn btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Processing Math...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Run Gap Analysis
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Skill Gap Dashboard Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {!gapData && !loading && (
            <div className="glass-panel" style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <BarChart2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-purple)' }} />
              <h3>Identify Core Skill Gaps</h3>
              <p style={{ marginTop: 6, fontSize: 14, maxWidth: 450, margin: '6px auto 0' }}>
                Run the mapping analysis to compare a candidate's resume keywords against requirements, yielding detailed timelines and recommended study courses.
              </p>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-panel" style={{ height: 140, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="glass-panel" style={{ height: 180, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
                <div className="glass-panel" style={{ height: 180, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          )}

          {gapData && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Row 1: Match Score Gauge & Timeframe Summary Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>
                {/* Visual score gauge */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Match Strength</h4>
                  
                  {/* Huge visual ring/score representation */}
                  <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                    {/* SVG Progress Ring */}
                    <svg style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--glass-border)" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50"
                        fill="transparent"
                        stroke={gapData.match_percentage >= 70 ? 'var(--accent-green)' : 'var(--accent-purple)'}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - gapData.match_percentage / 100)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 28, fontWeight: 800 }}>{gapData.match_percentage}%</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MATCH</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Requires upskilling to cover <strong>{gapData.gap_percentage}%</strong> of additional requirements.
                  </p>
                </div>

                {/* Readiness summary */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Upskilling Profile</h4>
                      <span
                        className="badge"
                        style={{
                          background: getReadinessRating(gapData.estimated_weeks_to_ready).bg,
                          color: getReadinessRating(gapData.estimated_weeks_to_ready).color,
                          borderColor: 'transparent'
                        }}
                      >
                        {getReadinessRating(gapData.estimated_weeks_to_ready).label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                      <span style={{ fontSize: 44, fontWeight: 850, color: 'var(--accent-purple)' }}>
                        {gapData.estimated_weeks_to_ready}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>Weeks</span>
                    </div>
                    
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                      Estimated prep time at a standard commitment of <strong>{gapData.weekly_commitment}</strong>. Focused study will make the candidate ready to interview for this vacancy.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={13} style={{ color: 'var(--accent-green)' }} />
                      <span>{gapData.matched_skills.length} Matched</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <XCircle size={13} style={{ color: 'var(--accent-red)' }} />
                      <span>{gapData.missing_skills.length} Gaps</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Matched vs. Missing Skill Tags comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="glass-panel" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} /> Matched Core Skills
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {gapData.matched_skills.length > 0 ? (
                      gapData.matched_skills.map((skill, i) => (
                        <span key={i} className="badge badge-green" style={{ fontSize: 11 }}>{skill}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No skills matched</span>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <XCircle size={14} style={{ color: 'var(--accent-red)' }} /> Missing / Gaps Identified
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {gapData.missing_skills.length > 0 ? (
                      gapData.missing_skills.map((skill, i) => (
                        <span key={i} className="badge badge-red" style={{ fontSize: 11 }}>{skill}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>No gaps detected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Vertical timeline Roadmap */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Calendar size={16} style={{ color: 'var(--accent-purple)' }} /> Chronological Upskilling Roadmap
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 10 }}>
                  {gapData.learning_roadmap.map((phase, idx) => {
                    const isLast = idx === gapData.learning_roadmap.length - 1;
                    return (
                      <div key={idx} style={{ display: 'flex', gap: 20, position: 'relative' }}>
                        
                        {/* Dot & vertical line indicator */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            border: '3px solid var(--bg-primary)',
                            zIndex: 2,
                            boxShadow: 'var(--shadow-glow)'
                          }} />
                          {!isLast && (
                            <div style={{
                              width: 2,
                              flex: 1,
                              background: 'var(--glass-border)',
                              margin: '4px 0',
                              zIndex: 1
                            }} />
                          )}
                        </div>

                        {/* Phase content */}
                        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 28 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <h5 style={{ fontSize: 14, fontWeight: 800 }}>{phase.phase}</h5>
                            <span className="badge badge-purple" style={{ fontSize: 10 }}>{phase.duration}</span>
                          </div>
                          
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{phase.description}</p>
                          
                          {/* Topics */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                            {phase.topics.map((t, tIdx) => (
                              <span key={tIdx} className="badge badge-gray" style={{ fontSize: 9, padding: '2px 6px' }}>{t}</span>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Recommended Courses & Certifications Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Courses */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <BookOpen size={15} style={{ color: 'var(--accent-blue)' }} /> Recommended Learning Courses
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {gapData.recommended_courses.map((course, idx) => (
                      <div key={idx} className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{course.skill}</span>
                          <span className="badge badge-blue" style={{ fontSize: 9, padding: '1px 5px' }}>{course.platform}</span>
                        </div>
                        <h5 style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }} title={course.title}>{course.title}</h5>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                          <Clock size={11} /> {course.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Award size={15} style={{ color: 'var(--accent-yellow)' }} /> Target Industry Certifications
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {gapData.recommended_certifications.map((cert, idx) => (
                      <div key={idx} className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{cert.skill} Certification</span>
                        <h5 style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{cert.certification}</h5>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--accent-purple)', fontWeight: 600, marginTop: 4 }}>
                          <GraduationCap size={12} /> High Recruiter Weight
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
