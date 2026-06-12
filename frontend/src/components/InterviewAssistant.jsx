import { useState, useEffect, useCallback } from 'react';
import {
  Brain, User, Briefcase, SlidersHorizontal, RefreshCw, Sparkles,
  ChevronDown, ChevronUp, ChevronRight, Info, CheckCircle,
  FileText, Printer, Award
} from 'lucide-react';
import { useToast } from './Toast';

export default function InterviewAssistant({ backendUrl }) {
  const { addToast } = useToast();

  // Selection Inputs State
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  
  const [jobsList, setJobsList] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [customJdText, setCustomJdText] = useState('');
  const [useCustomJd, setUseCustomJd] = useState(false);
  
  const [difficulty, setDifficulty] = useState('Intermediate');

  // Generator Output States
  const [loading, setLoading] = useState(false);
  const [guideData, setGuideData] = useState(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState('Technical');
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState(null);

  // Fetch Candidates for Dropdown
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
      console.error('Failed to load candidates for interview dropdown.');
    } finally {
      setCandidatesLoading(false);
    }
  }, [backendUrl]);

  // Fetch Active Jobs for Dropdown
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
      console.error('Failed to load active jobs for interview dropdown.');
    } finally {
      setJobsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, [fetchCandidates, fetchJobs]);

  // Handle Guide Generation
  const handleGenerateGuide = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCandidateId) {
      addToast('Please select a candidate first.', 'error');
      return;
    }

    setLoading(true);
    setGuideData(null);
    setExpandedQuestionIdx(null);

    try {
      let queryStr = `difficulty=${difficulty}`;
      if (useCustomJd) {
        if (customJdText.trim()) {
          queryStr += `&custom_jd=${encodeURIComponent(customJdText)}`;
        }
      } else if (selectedJobId) {
        queryStr += `&job_id=${selectedJobId}`;
      }

      const res = await fetch(`${backendUrl}/candidates/${selectedCandidateId}/interview?${queryStr}`);
      if (!res.ok) throw new Error('API failed to generate interview guide');
      const data = await res.json();
      
      setGuideData(data);
      // Set default active category tab to the first non-empty category
      const categories = Object.keys(data.questions || {});
      const firstNonEmpty = categories.find(cat => data.questions[cat].length > 0);
      if (firstNonEmpty) {
        setActiveCategoryTab(firstNonEmpty);
      }
      addToast('AI Interview Prep Guide generated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to generate prep questions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestionsList = guideData?.questions?.[activeCategoryTab] || [];
  const selectedCandidateObj = candidatesList.find(c => c.id.toString() === selectedCandidateId);
  const selectedJobObj = jobsList.find(j => j.id.toString() === selectedJobId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dynamic styles for printing */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .sidebar, .mobile-topbar, .toast-container, .btn, .glass-panel:first-of-type, h1, p.page-subtitle, .divider, .print-hide {
            display: none !important;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
          .glass-panel {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            padding: 0 !important;
          }
          .print-full-width {
            width: 100% !important;
            grid-template-columns: 1fr !important;
          }
          .print-guide-sheet {
            display: block !important;
            page-break-after: always;
          }
          .badge {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
          .collapsible-content {
            display: block !important;
            max-height: none !important;
            opacity: 1 !important;
            padding: 12px 0 !important;
            border-bottom: 1px dashed #ccc !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }} className="print-hide">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={28} style={{ color: 'var(--accent-purple)' }} /> AI Interview Assistant
          </h1>
          <p className="page-subtitle">Generate custom technical, coding, behavioral, situational, and HR interview guides</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }} className="print-full-width">
        {/* Left Side: Setup & Criteria Settings */}
        <div className="glass-panel print-hide" style={{ padding: 24 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
            <SlidersHorizontal size={14} /> Interview Parameters
          </h3>

          <form onSubmit={handleGenerateGuide} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Candidate Selector */}
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

            {/* Job Opening Option */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>TARGET JOB REQUIREMENTS</label>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setUseCustomJd(prev => !prev)}
                >
                  {useCustomJd ? 'Use Vacancy List' : 'Paste Custom JD'}
                </button>
              </div>

              {useCustomJd ? (
                <textarea
                  className="input-field"
                  style={{ fontSize: 12, minHeight: 90, resize: 'vertical' }}
                  placeholder="Paste job details, tech stack, responsibilities..."
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

            {/* Difficulty Segmented Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DIFFICULTY LEVEL</label>
              <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.15)', padding: 4, borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
                {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      background: difficulty === lvl ? 'var(--gradient-primary)' : 'transparent',
                      color: difficulty === lvl ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setDifficulty(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Customizing Guide...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate Guide
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Interview Prep Guide Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!guideData && !loading && (
            <div className="glass-panel" style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-purple)' }} />
              <h3>Generate Custom Interview Guide</h3>
              <p style={{ marginTop: 6, fontSize: 14, maxWidth: 450, margin: '6px auto 0' }}>
                Select a candidate and matching job opening to compile standard and situational technical screening rubrics.
              </p>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel" style={{ height: 96, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          )}

          {guideData && !loading && (
            <div className="glass-panel print-guide-sheet" style={{ padding: 24 }}>
              {/* Sheet Title for recruiters */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--glass-border)', paddingBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>Interview Prep & Evaluation Guide</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={13} style={{ color: 'var(--accent-purple)' }} /> Candidate: <strong>{selectedCandidateObj?.name || 'Candidate'}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Briefcase size={13} style={{ color: 'var(--accent-blue)' }} /> Job: <strong>{useCustomJd ? 'Custom Requirements' : (selectedJobObj?.title || 'Job Opening')}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={13} style={{ color: 'var(--accent-yellow)' }} /> Difficulty: <strong className="text-gradient">{guideData.difficulty}</strong>
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm print-hide"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.print()}
                >
                  <Printer size={13} /> Print/Save PDF
                </button>
              </div>

              {/* Matched Skills row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 24 }} className="print-hide">
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Target tech competencies:</span>
                {guideData.matched_skills.map((skill, idx) => (
                  <span key={idx} className="badge badge-purple" style={{ fontSize: 10 }}>{skill}</span>
                ))}
              </div>

              {/* Question Category Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: 1, gap: 6, marginBottom: 20 }} className="print-hide">
                {Object.keys(guideData.questions).map((cat) => {
                  const qCount = guideData.questions[cat]?.length || 0;
                  const isActive = activeCategoryTab === cat;
                  
                  // Color codes for category badges
                  const badgeClasses = {
                    Technical: 'badge-purple',
                    Coding: 'badge-blue',
                    Behavioral: 'badge-green',
                    Situational: 'badge-yellow',
                    HR: 'badge-gray'
                  };

                  return (
                    <button
                      key={cat}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: isActive ? '3px solid var(--accent-purple)' : '3px solid transparent',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 700,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setActiveCategoryTab(cat);
                        setExpandedQuestionIdx(null);
                      }}
                    >
                      {cat}
                      <span className={`badge ${badgeClasses[cat] || 'badge-gray'}`} style={{ fontSize: 9, padding: '1px 5px' }}>{qCount}</span>
                    </button>
                  );
                })}
              </div>

              {/* Questions List Render */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {currentQuestionsList.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Info size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p>No questions generated under this category.</p>
                  </div>
                ) : (
                  currentQuestionsList.map((qItem, idx) => {
                    const isExpanded = expandedQuestionIdx === idx;
                    
                    return (
                      <div
                        key={idx}
                        className="glass-card"
                        style={{
                          padding: 18,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          borderLeft: '4px solid var(--accent-purple)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Question Header & Toggle */}
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
                          onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                          className="print-hide"
                        >
                          <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-purple)', fontSize: 14 }}>Q{idx + 1}.</span>
                            <h4 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{qItem.question}</h4>
                          </div>

                          <div style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>

                        {/* Print Only Header (always fully expanded) */}
                        <div style={{ display: 'none', flexDirection: 'column', gap: 8 }} className="print-guide-sheet">
                          <div style={{ display: 'flex', gap: 8 }}>
                            <strong style={{ fontSize: 13 }}>Q{idx + 1}. {qItem.question}</strong>
                          </div>
                        </div>

                        {/* Collapsible Model Answer & Criteria (Expanded locally or always open in printing) */}
                        {(isExpanded || window.matchMedia('print').matches) && (
                          <div
                            className="collapsible-content"
                            style={{
                              paddingTop: 8,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 14,
                              animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                            }}
                          >
                            {/* Model Expected Answer */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={11} style={{ color: 'var(--accent-green)' }} /> Model Answer Key:
                              </span>
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.01)', padding: 12, border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)' }}>
                                {qItem.model_answer}
                              </p>
                            </div>

                            {/* Evaluation criteria checklists */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={11} style={{ color: 'var(--accent-purple)' }} /> Evaluation Criteria Checklist:
                              </span>
                              <ul style={{ paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {qItem.criteria.map((crit, cIdx) => (
                                  <li key={cIdx} style={{ listStyleType: 'square' }}>
                                    {crit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
