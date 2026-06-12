import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Sparkles, SlidersHorizontal, ChevronDown, ChevronRight, 
  GraduationCap, Award, Check, AlertCircle, X, Briefcase, Info, RefreshCw
} from 'lucide-react';
import { useToast } from './Toast';

const CATEGORY_TABS = [
  { id: 'Highly Recommended', label: 'Highly Recommended', color: 'var(--accent-green)', badge: 'badge-green' },
  { id: 'Recommended', label: 'Recommended', color: 'var(--accent-blue)', badge: 'badge-blue' },
  { id: 'Consider', label: 'Consider', color: 'var(--accent-yellow)', badge: 'badge-yellow' },
  { id: 'Reject', label: 'Reject', color: 'var(--accent-red)', badge: 'badge-red' },
];

export default function ShortlistingEngine({ backendUrl, initialDesc = '' }) {
  const { addToast } = useToast();

  // Criteria Inputs State
  const [jobDesc, setJobDesc] = useState(initialDesc);
  const [minExp, setMinExp] = useState(3);
  const [mandatorySkillsInput, setMandatorySkillsInput] = useState('');
  const [minEdu, setMinEdu] = useState('Bachelors');
  const [requiredCertsInput, setRequiredCertsInput] = useState('');
  const [projectKwsInput, setProjectKwsInput] = useState('');

  // Execution States
  const [loading, setLoading] = useState(false);
  const [shortlistResults, setShortlistResults] = useState(null);
  const [activeTab, setActiveTab] = useState('Highly Recommended');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [overridingId, setOverridingId] = useState(null);

  useEffect(() => {
    if (initialDesc) setJobDesc(initialDesc);
  }, [initialDesc]);

  // Quick fill templates
  const TEMPLATES = [
    {
      label: 'Sr Python Dev',
      desc: 'We are looking for a Senior Python Developer to join our team. Must have experience building scalable REST APIs, deploying Docker containers on AWS, and designing databases.',
      exp: 5,
      skills: 'Python, Docker, AWS, SQL',
      edu: 'Bachelors',
      certs: 'AWS Certified',
      projects: 'scalability, api'
    },
    {
      label: 'React Engineer',
      desc: 'Frontend developer focused on building responsive React user interfaces, optimizing client performance, and collaborating with UX designers.',
      exp: 2,
      skills: 'React, JavaScript, TypeScript, CSS',
      edu: 'Bachelors',
      certs: '',
      projects: 'frontend, UI'
    },
    {
      label: 'AI Research Scientist',
      desc: 'Research and develop state-of-the-art Deep Learning models. Work on natural language processing, model tuning, and transformers deployment.',
      exp: 4,
      skills: 'Python, PyTorch, TensorFlow, NLP',
      edu: 'Masters',
      certs: '',
      projects: 'deep learning, models'
    }
  ];

  const handleApplyTemplate = (t) => {
    setJobDesc(t.desc);
    setMinExp(t.exp);
    setMandatorySkillsInput(t.skills);
    setMinEdu(t.edu);
    setRequiredCertsInput(t.certs);
    setProjectKwsInput(t.projects);
    addToast(`Applied ${t.label} template.`, 'success');
  };

  // Run Shortlist Engine API
  const handleGenerateShortlist = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setShortlistResults(null);
    setExpandedCardId(null);

    // Split tag inputs
    const mandatory_skills = mandatorySkillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const required_certifications = requiredCertsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const project_keywords = projectKwsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const payload = {
      job_description: jobDesc,
      min_experience: Number(minExp),
      mandatory_skills,
      min_education: minEdu,
      required_certifications,
      project_keywords
    };

    try {
      const res = await fetch(`${backendUrl}/candidates/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Shortlisting request failed');
      const data = await res.json();
      setShortlistResults(data);
      
      // Auto switch active tab to first non-empty list, default to Highly Recommended
      const firstNonEmpty = Object.keys(data).find(k => data[k].length > 0);
      if (firstNonEmpty) {
        setActiveTab(firstNonEmpty);
      } else {
        setActiveTab('Highly Recommended');
      }

      addToast('Intelligent candidate shortlist generated!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to shortlist candidates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Override Candidate Classification
  const handleOverride = async (candId, newClassification) => {
    setOverridingId(candId);
    try {
      const res = await fetch(`${backendUrl}/candidates/${candId}/override-shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification: newClassification })
      });

      if (!res.ok) throw new Error('Override request failed');
      
      // Move candidate locally to update UI instantly without full page re-generation!
      setShortlistResults(prev => {
        if (!prev) return prev;
        
        let candidateToMove = null;
        let sourceCategory = '';

        // Find candidate and remove from old category list
        const updatedResults = { ...prev };
        for (const cat in updatedResults) {
          const index = updatedResults[cat].findIndex(c => c.id === candId);
          if (index !== -1) {
            candidateToMove = { ...updatedResults[cat][index] };
            sourceCategory = cat;
            updatedResults[cat] = updatedResults[cat].filter(c => c.id !== candId);
            break;
          }
        }

        // Push to new category list
        if (candidateToMove) {
          candidateToMove.classification = newClassification;
          candidateToMove.is_overridden = true;
          
          // Re-generate reasoning on the fly locally to show override note
          candidateToMove.reasoning = [
            `AI categorized this candidate as '${candidateToMove.original_classification}' (Score: ${candidateToMove.overall_score}), but was manually overridden by recruiter to '${newClassification}'.`,
            ...candidateToMove.reasoning.filter(r => !r.includes("overridden by recruiter"))
          ];

          updatedResults[newClassification].push(candidateToMove);
          // Re-sort descending
          updatedResults[newClassification].sort((a, b) => b.overall_score - a.overall_score);
        }

        return updatedResults;
      });

      addToast(`Candidate manual rating updated to ${newClassification}.`, 'success');
    } catch {
      addToast('Failed to apply manual shortlist override.', 'error');
    } finally {
      setOverridingId(null);
    }
  };

  const currentList = shortlistResults ? shortlistResults[activeTab] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Intelligent Candidate Shortlisting</h1>
        <p className="page-subtitle">Classify and filter applicant pools using custom hiring criteria heuristics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side: Hiring Criteria Sidebar */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={14} /> Criteria
            </h3>
            {/* Quick Templates Dropdown preview */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quick Fill</span>
          </div>

          {/* Quick templates pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 18 }}>
            {TEMPLATES.map(t => (
              <button 
                key={t.label} 
                className="badge badge-gray" 
                style={{ cursor: 'pointer', padding: '3px 8px', fontSize: 10, border: '1px solid var(--glass-border)' }}
                onClick={() => handleApplyTemplate(t)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleGenerateShortlist} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Job Description */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>JOB DESCRIPTION</label>
              <textarea
                className="input-field"
                style={{ fontSize: 12, minHeight: 120, resize: 'vertical' }}
                placeholder="Paste Job Description keywords..."
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
              />
            </div>

            {/* Min Experience */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                MIN EXPERIENCE: <strong style={{ color: 'var(--accent-purple)' }}>{minExp} years</strong>
              </label>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                className="progress-bar-container"
                style={{ width: '100%', cursor: 'pointer', height: 6, accentColor: 'var(--accent-purple)' }}
                value={minExp}
                onChange={e => setMinExp(Number(e.target.value))}
              />
            </div>

            {/* Mandatory Skills */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MANDATORY SKILLS (COMMA SEP)</label>
              <input
                className="input-field"
                style={{ fontSize: 12 }}
                placeholder="e.g. Python, SQL, AWS"
                value={mandatorySkillsInput}
                onChange={e => setMandatorySkillsInput(e.target.value)}
              />
            </div>

            {/* Minimum Education */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MINIMUM EDUCATION</label>
              <select
                className="input-field"
                style={{ fontSize: 12, height: 38 }}
                value={minEdu}
                onChange={e => setMinEdu(e.target.value)}
              >
                <option value="None">Any Education Level</option>
                <option value="Bachelors">Bachelors Degree</option>
                <option value="Masters">Masters Degree</option>
                <option value="MBA">MBA Degree</option>
                <option value="PhD">PhD Degree</option>
              </select>
            </div>

            {/* Required Certifications */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>REQUIRED CERTIFICATIONS</label>
              <input
                className="input-field"
                style={{ fontSize: 12 }}
                placeholder="e.g. AWS Certified, PMP"
                value={requiredCertsInput}
                onChange={e => setRequiredCertsInput(e.target.value)}
              />
            </div>

            {/* Project Keywords */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>PROJECT KEYWORDS</label>
              <input
                className="input-field"
                style={{ fontSize: 12 }}
                placeholder="e.g. Microservices, Scalability"
                value={projectKwsInput}
                onChange={e => setProjectKwsInput(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Classifying...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Shortlist Candidates
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Results Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* If no shortlist computed yet */}
          {!shortlistResults && !loading && (
            <div className="glass-panel" style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <UserCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-purple)' }} />
              <h3>Generate Candidate Shortlist</h3>
              <p style={{ marginTop: 6, fontSize: 14, maxWidth: 450, margin: '6px auto 0' }}>
                Specify your mandatory skills, experience level, and certifications, then run the shortlisting engine to classify your talent pool.
              </p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel" style={{ height: 110, opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          )}

          {/* Results Summary Tabs & Listings */}
          {shortlistResults && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary Tabs Header */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: 1, gap: 8 }}>
                {CATEGORY_TABS.map(tab => {
                  const count = shortlistResults[tab.id]?.length ?? 0;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '10px 18px',
                        border: 'none',
                        borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent',
                        background: 'transparent',
                        fontSize: 14,
                        fontWeight: 700,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.label}
                      <span className={`badge ${tab.badge}`} style={{ fontSize: 10, padding: '2px 6px' }}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Candidates List under active Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {currentList.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Info size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p>No candidates qualified for this shortlist tier.</p>
                  </div>
                ) : (
                  currentList.map(cand => {
                    const isExpanded = expandedCardId === cand.id;
                    const scoreColor = cand.overall_score >= 80 ? 'var(--accent-green)'
                      : cand.overall_score >= 60 ? 'var(--accent-blue)'
                      : cand.overall_score >= 40 ? 'var(--accent-yellow)'
                      : 'var(--accent-red)';
                    return (
                      <div 
                        key={cand.id} 
                        className="glass-panel" 
                        style={{ 
                          padding: 20, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 12,
                          borderLeft: `4px solid ${CATEGORY_TABS.find(t => t.id === activeTab)?.color || 'var(--glass-border)'}`
                        }}
                      >
                        {/* Header Details */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h4 style={{ fontSize: 15, fontWeight: 700 }}>{cand.name}</h4>
                              {cand.is_overridden && (
                                <span className="badge badge-purple" style={{ fontSize: 9, padding: '1px 5px' }}>
                                  HR Choice
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {cand.email || 'No Email'} · {cand.experience_years} yrs exp · {cand.highest_degree} degree
                            </p>
                          </div>
                          
                          {/* Score and Manual Action override */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{cand.overall_score}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>% match</span>
                            </div>

                            {/* Manual Override Dropdown */}
                            <select
                              className="input-field"
                              style={{ 
                                fontSize: 12, 
                                height: 32, 
                                width: 150, 
                                padding: '0 8px',
                                border: '1px solid var(--glass-border)',
                                outline: 'none',
                                cursor: 'pointer',
                                background: 'var(--bg-tertiary)'
                              }}
                              disabled={overridingId === cand.id}
                              value={cand.classification}
                              onChange={(e) => handleOverride(cand.id, e.target.value)}
                            >
                              <option value="Highly Recommended">Highly Recommended</option>
                              <option value="Recommended">Recommended</option>
                              <option value="Consider">Consider</option>
                              <option value="Reject">Reject</option>
                            </select>
                          </div>
                        </div>

                        {/* Skills matching badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginRight: 4 }}>SKILLS MATCH:</span>
                          {cand.matched_skills.map((s, i) => (
                            <span key={i} className="badge badge-green" style={{ fontSize: 10 }}>{s}</span>
                          ))}
                          {cand.missing_skills.map((s, i) => (
                            <span key={i} className="badge badge-red" style={{ fontSize: 10 }}>{s}</span>
                          ))}
                          {cand.matched_skills.length === 0 && cand.missing_skills.length === 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No mandatory skills checks</span>
                          )}
                        </div>

                        <div className="divider" style={{ margin: '4px 0 0 0' }} />

                        {/* Collapsible reasoning trigger */}
                        <div>
                          <button
                            onClick={() => setExpandedCardId(isExpanded ? null : cand.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-purple)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              padding: 0
                            }}
                          >
                            {isExpanded ? (
                              <>Hide Decisions & Details <ChevronDown size={14} /></>
                            ) : (
                              <>View Match Decision Reasoning <ChevronRight size={14} /></>
                            )}
                          </button>

                          {/* Collapsible reasoning list */}
                          {isExpanded && (
                            <div style={{ 
                              marginTop: 10, 
                              padding: 12, 
                              background: 'rgba(255,255,255,0.02)', 
                              border: '1px solid var(--glass-border)',
                              borderRadius: 8,
                              animation: 'fadeIn 0.2s cubic-bezier(0.4,0,0.2,1) forwards'
                            }}>
                              <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                {cand.reasoning.map((item, idx) => (
                                  <li key={idx} style={{ 
                                    marginBottom: 4,
                                    color: item.includes("overridden by recruiter") ? 'var(--accent-purple)' : 'inherit',
                                    fontWeight: item.includes("overridden by recruiter") ? 600 : 'normal'
                                  }}>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
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
