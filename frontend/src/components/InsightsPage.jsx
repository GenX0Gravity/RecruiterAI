import React, { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  ArrowLeft, Mail, Phone, MapPin, Link2, GitBranch, Globe,
  Briefcase, GraduationCap, Award, Code2, Send, Download,
  CheckCircle, XCircle, Star, Zap, TrendingUp, SlidersHorizontal,
} from 'lucide-react';
import { SkeletonProfileCard } from './Skeleton';
import { useToast } from './Toast';

const STATUS_OPTIONS = ['Pending', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

const STATUS_STYLE = {
  Shortlisted: { background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)' },
  Rejected:    { background: 'rgba(239,68,68,0.15)',  color: 'var(--accent-red)',   border: '1px solid rgba(239,68,68,0.3)' },
  Pending:     { background: 'rgba(255,255,255,0.06)',color: 'var(--text-secondary)',border: '1px solid var(--glass-border)' },
  Interview:   { background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',  border: '1px solid rgba(59,130,246,0.3)' },
  Offer:       { background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)',border: '1px solid rgba(139,92,246,0.3)' },
};

const REC_COLOR = {
  'Highly Recommended': 'var(--accent-green)',
  'Recommended':        'var(--accent-blue)',
  'Consider':           'var(--accent-yellow)',
  'Not Recommended':    'var(--accent-red)',
};

export default function InsightsPage({ candidateId, onBack, backendUrl }) {
  const { addToast } = useToast();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [newNote, setNewNote]     = useState('');
  const [sending, setSending]     = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    fetch(`${backendUrl}/candidates/${candidateId}`)
      .then(r => r.json())
      .then(d => { setCandidate(d); setLoading(false); })
      .catch(() => { setLoading(false); addToast('Failed to load candidate.', 'error'); });
  }, [candidateId, backendUrl]);

  const updateStatus = async (status) => {
    setStatusUpdating(true);
    try {
      await fetch(`${backendUrl}/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setCandidate(prev => ({ ...prev, status }));
      addToast(`Status updated to "${status}".`, 'success');
    } catch { addToast('Failed to update status.', 'error'); }
    setStatusUpdating(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || sending) return;
    setSending(true);
    try {
      const res  = await fetch(`${backendUrl}/candidates/${candidateId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      const note = await res.json();
      setCandidate(prev => ({ ...prev, notes: [...(prev.notes || []), note] }));
      setNewNote('');
      addToast('Note saved.', 'success');
    } catch { addToast('Failed to save note.', 'error'); }
    setSending(false);
  };

  const exportCSV = () => {
    window.open(`${backendUrl}/export/${candidateId}`, '_blank');
    addToast('Downloading profile CSV…', 'info');
  };

  const downloadPDF = () => {
    window.open(`${backendUrl}/candidates/${candidateId}/analysis-pdf`, '_blank');
    addToast('Downloading Deep Analysis PDF report…', 'info');
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonProfileCard />
    </div>
  );

  if (!candidate) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>😶</p>
      <p>Candidate not found or not selected.</p>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>← Back</button>
    </div>
  );

  const data     = candidate.parsed_data || {};
  const intel    = data.Intelligence || {};
  const contact  = data.Contact || {};
  const skills   = data.Skills || [];
  const catSkills= data.CategorizedSkills || {};
  const deep     = data.DeepAnalysis || {};

  // Radar data from scores (plot deep analysis categories)
  const radarData = [
    { subject: 'ATS Score',      value: deep.ATSScore ?? (candidate.overall_score || 0) },
    { subject: 'Recruiter',      value: deep.RecruiterScore ?? (candidate.overall_score || 0) },
    { subject: 'Technical',      value: deep.TechnicalScore ?? (candidate.technical_score || 0) },
    { subject: 'Leadership',     value: deep.LeadershipScore ?? 0 },
    { subject: 'Communication',  value: deep.CommunicationScore ?? 0 },
  ];

  const statusStyle = STATUS_STYLE[candidate.status] || STATUS_STYLE.Pending;
  const recColor    = REC_COLOR[intel.Recommendation] || 'var(--text-secondary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadPDF}>
            <Download size={14} /> Download PDF Analysis
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-success btn-sm" onClick={() => updateStatus('Shortlisted')} disabled={statusUpdating}>
            <CheckCircle size={14} /> Shortlist
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => updateStatus('Rejected')} disabled={statusUpdating}>
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile Header */}
          <div className="glass-panel" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{candidate.name}</h1>
                {/* Contact info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                  {contact.Emails?.[0] && <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Mail size={13}/> {contact.Emails[0]}</span>}
                  {contact.Phones?.[0] && <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Phone size={13}/> {contact.Phones[0]}</span>}
                  {contact.Location  && <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={13}/> {contact.Location}</span>}
                  {contact.LinkedIn?.[0] && <a href={contact.LinkedIn[0]} target="_blank" style={{ color: '#60a5fa', display: 'flex', gap: 6, alignItems: 'center' }}><Link2 size={13}/> LinkedIn</a>}
                  {contact.GitHub?.[0]   && <a href={contact.GitHub[0]}   target="_blank" style={{ color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}><GitBranch size={13}/> GitHub</a>}
                  {contact.Portfolio?.[0]&& <a href={contact.Portfolio[0]}target="_blank" style={{ color: 'var(--accent-cyan)', display: 'flex', gap: 6, alignItems: 'center' }}><Globe size={13}/> Portfolio</a>}
                </div>

                {/* Status + Recommendation badges */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    value={candidate.status}
                    onChange={e => updateStatus(e.target.value)}
                    disabled={statusUpdating}
                    style={{ ...statusStyle, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', outline: 'none', background: statusStyle.background }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {intel.Recommendation && (
                    <span className="badge" style={{ color: recColor, background: `${recColor}18`, borderColor: `${recColor}35`, fontSize: 12 }}>
                      <Star size={11} style={{ marginRight: 4 }} />
                      {intel.Recommendation}
                    </span>
                  )}
                </div>
              </div>

              {/* Score Ring */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <ScoreRing score={candidate.overall_score} />
              </div>
            </div>
          </div>

          {/* Sub-scores bar (Render Deep Resume analysis dimensions) */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 className="card-title"><Zap size={16} /> Deep Score Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'ATS Score',          value: deep.ATSScore ?? candidate.overall_score, color: '#8b5cf6' },
                { label: 'Recruiter Score',    value: deep.RecruiterScore ?? candidate.overall_score, color: '#3b82f6' },
                { label: 'Technical Score',    value: deep.TechnicalScore ?? candidate.technical_score, color: '#10b981' },
                { label: 'Leadership Score',   value: deep.LeadershipScore ?? 0, color: '#ec4899' },
                { label: 'Communication Score',value: deep.CommunicationScore ?? 0, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{Math.round(value || 0)}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${value || 0}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 className="card-title"><TrendingUp size={16} /> AI Candidate Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div className="section-title" style={{ color: 'var(--accent-green)', borderBottom: `1px solid rgba(16,185,129,0.2)`, paddingBottom: 6, marginBottom: 10 }}>Strengths</div>
                {(deep.Strengths || intel.Strengths || []).length > 0 ? (
                  <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {(deep.Strengths || intel.Strengths).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No strengths detected.</p>}
              </div>
              <div>
                <div className="section-title" style={{ color: 'var(--accent-red)', borderBottom: `1px solid rgba(239,68,68,0.2)`, paddingBottom: 6, marginBottom: 10 }}>Gaps / Weaknesses</div>
                {(deep.Weaknesses || intel.Weaknesses || []).length > 0 ? (
                  <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {(deep.Weaknesses || intel.Weaknesses).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No weaknesses detected.</p>}
              </div>
            </div>
            {(deep.Suggestions || intel.Suggestions || []).length > 0 && (
              <div style={{ marginTop: 16, padding: 14, background: 'rgba(139,92,246,0.06)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8 }}>IMPROVEMENT SUGGESTIONS</div>
                <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
                  {(deep.Suggestions || intel.Suggestions).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Deep Resume Diagnostics Section */}
          {deep && Object.keys(deep).length > 0 && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="card-title"><SlidersHorizontal size={16} /> Deep Resume Diagnostics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left side: Structure & ATS Audit */}
                <div>
                  <div className="section-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 6, marginBottom: 12 }}>Structure & ATS Audit</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <AuditItem label="Experience Section" passed={deep.Structure?.has_experience} />
                    <AuditItem label="Education Section" passed={deep.Structure?.has_education} />
                    <AuditItem label="Skills Section" passed={deep.Structure?.has_skills} />
                    <AuditItem label="Projects Section" passed={deep.Structure?.has_projects} />
                    <AuditItem label="Summary Section" passed={deep.Structure?.has_summary} />
                    <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
                    <AuditItem label="Email Contact Address" passed={!deep.ATSCompatibility?.missing_email} />
                    <AuditItem label="LinkedIn URL Header" passed={!deep.ATSCompatibility?.missing_linkedin} />
                    <AuditItem label="Standard ATS Headers" passed={!deep.ATSCompatibility?.non_standard_headers} />
                    <AuditItem label="Clean Layout (No Tables/Graphics)" passed={!deep.ATSCompatibility?.complex_layout} />
                  </div>
                </div>

                {/* Right side: Growth & Keyword Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div className="section-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 6, marginBottom: 10 }}>Career Growth & Leadership</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <div>Average Tenure: <strong style={{ color: 'var(--text-primary)' }}>{deep.CareerGrowth?.avg_tenure_months ? `${Math.round(deep.CareerGrowth.avg_tenure_months / 12 * 10) / 10} yrs` : 'N/A'}</strong></div>
                      <div>Job Hopping Risk: <strong style={{ color: deep.CareerGrowth?.has_hopping ? 'var(--accent-red)' : 'var(--accent-green)' }}>{deep.CareerGrowth?.has_hopping ? 'Detected' : 'No Risk'}</strong></div>
                      <div>Title Progression: <strong style={{ color: 'var(--text-primary)' }}>{deep.CareerGrowth?.progression_score}/100</strong></div>
                      <div>Leadership Verbs: <strong style={{ color: 'var(--text-primary)' }}>{deep.LeadershipPotential?.leadership_verbs_count} found</strong></div>
                    </div>
                  </div>

                  {/* Keyword Density */}
                  <div>
                    <div className="section-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 6, marginBottom: 10 }}>Top Keyword Densities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(deep.KeywordDensity?.density || []).map((item, i) => (
                        <span key={i} className="badge badge-gray" style={{ fontSize: 11, padding: '3px 8px' }}>
                          {item.keyword}: <strong>{item.density_pct}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  {deep.MissingKeywords && deep.MissingKeywords.length > 0 && (
                    <div>
                      <div className="section-title" style={{ color: 'var(--accent-red)', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: 6, marginBottom: 10 }}>Missing Keywords (expected)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {deep.MissingKeywords.map((kw, i) => (
                          <span key={i} className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.2)' }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Experience Timeline */}
          {(data.Experience || []).length > 0 && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="card-title"><Briefcase size={16} /> Experience</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {data.Experience.map((exp, i) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--glass-border)', paddingLeft: 16, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -6, top: 5, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }} />
                    <h4 style={{ fontSize: 15, fontWeight: 700 }}>{exp.Role || 'Unknown Role'}</h4>
                    <p style={{ color: 'var(--accent-blue)', fontSize: 13, marginBottom: 8 }}>
                      {exp.Company || ''}{exp.Duration ? ` · ${exp.Duration}` : ''}
                    </p>
                    {(exp.Responsibilities || []).length > 0 && (
                      <ul style={{ paddingLeft: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        {exp.Responsibilities.slice(0, 4).map((r, j) => <li key={j}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education & Projects grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Education */}
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="card-title"><GraduationCap size={16} /> Education</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(data.Education || []).length > 0
                  ? data.Education.map((edu, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 14 }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{edu.Degree}{edu.Major ? ` in ${edu.Major}` : ''}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{edu.University}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        {edu.GraduationYear && <span>Class of {edu.GraduationYear}</span>}
                        {edu.GPA && <span>· GPA: {edu.GPA}</span>}
                      </div>
                    </div>
                  ))
                  : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No education data found.</p>
                }
              </div>
            </div>

            {/* Projects */}
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="card-title"><Code2 size={16} /> Projects</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(data.Projects || []).length > 0
                  ? data.Projects.map((proj, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{proj.Name}</p>
                        {proj.GitHub && <a href={proj.GitHub} target="_blank" style={{ color: 'var(--text-muted)' }}><GitBranch size={14} /></a>}
                      </div>
                      {proj.Description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>{proj.Description.slice(0, 120)}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {(proj.Technologies || []).map((t, j) => <span key={j} className="badge badge-skill">{t}</span>)}
                      </div>
                    </div>
                  ))
                  : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No projects listed.</p>
                }
              </div>
            </div>
          </div>

          {/* Certifications */}
          {(data.Certifications || []).length > 0 && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="card-title"><Award size={16} /> Certifications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.Certifications.map((cert, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(139,92,246,0.06)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.12)' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cert.Name}</span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                      {cert.Issuer && <span>{cert.Issuer}</span>}
                      {cert.Date && <span>{cert.Date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Skills Radar */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 className="card-title">Skills Radar</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="var(--glass-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categorized Skills */}
          {Object.keys(catSkills).length > 0 && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="card-title">Skills by Category</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(catSkills).map(([cat, skls]) => (
                  <div key={cat}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)', marginBottom: 6 }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {skls.map((s, i) => <span key={i} className="badge badge-skill">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <h3 className="card-title">Recruiter Notes</h3>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {(candidate.notes || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No notes yet. Add your first note below.</p>
              ) : (
                [...(candidate.notes || [])].reverse().map((n, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: 13, lineHeight: 1.6 }}>{n.content}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                placeholder="Add a note…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-icon" onClick={addNote} disabled={sending || !newNote.trim()}>
                <Send size={15} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Score Ring SVG ────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r   = 40;
  const circ= 2 * Math.PI * r;
  const fill= ((score || 0) / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 100, height: 100 }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
      </div>
    </div>
  );
}

function AuditItem({ label, passed }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: passed ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {passed ? 'Passed' : 'Action Required'}
      </span>
    </div>
  );
}
