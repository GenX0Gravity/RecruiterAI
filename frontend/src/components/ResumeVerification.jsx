import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, AlertCircle,
  Calendar, Award, Copy, CheckCircle, Clock, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { useToast } from './Toast';

export default function ResumeVerification({ backendUrl }) {
  const { addToast } = useToast();

  // Candidates selector
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  // Results State
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('timeline'); // 'timeline' | 'inflation' | 'duplicates'

  // Fetch candidates catalog
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
      addToast('Failed to load candidate catalog.', 'error');
    } finally {
      setCandidatesLoading(false);
    }
  }, [backendUrl, addToast]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Execute verification
  const handleVerify = async () => {
    if (!selectedCandidateId) {
      addToast('Please select a candidate.', 'warning');
      return;
    }
    setLoading(true);
    setVerificationData(null);
    try {
      const res = await fetch(`${backendUrl}/candidates/${selectedCandidateId}/verification`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerificationData(data);
      addToast('Resume audit finished', 'success');
    } catch {
      addToast('Error performing resume verification.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper colors
  const getScoreColor = (score, isRisk = false) => {
    if (isRisk) {
      if (score >= 60) return '#ef4444'; // Red
      if (score >= 30) return '#f59e0b'; // Orange
      return '#10b981'; // Green
    } else {
      if (score >= 80) return '#10b981'; // Green
      if (score >= 50) return '#f59e0b'; // Orange
      return '#ef4444'; // Red
    }
  };

  const getGaugePath = (pct) => {
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    const strokeDashoffset = circ - (pct / 100) * circ;
    return { circ, strokeDashoffset };
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px' }}>
      
      {/* Header Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert style={{ color: 'var(--accent)' }} size={26} /> Resume Verification & Risk Audit
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          Analyze candidate backgrounds for date discrepancies, duplicate profiles, skill inflation, and suspicious work chronology.
        </p>
      </div>

      {/* Candidate Selector Bar */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 280px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, color: 'var(--text-muted)' }}>
              Select Candidate
            </label>
            <select
              className="form-control"
              style={{ width: '100%', height: 42 }}
              value={selectedCandidateId}
              onChange={(e) => {
                setSelectedCandidateId(e.target.value);
                setVerificationData(null);
              }}
              disabled={candidatesLoading || loading}
            >
              {candidatesLoading ? (
                <option>Loading candidates...</option>
              ) : candidatesList.length === 0 ? (
                <option>No candidates parsed in database</option>
              ) : (
                candidatesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.filename})</option>
                ))
              )}
            </select>
          </div>

          <button
            className="btn btn-primary"
            style={{ height: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px' }}
            onClick={handleVerify}
            disabled={loading || !selectedCandidateId}
          >
            {loading ? (
              <RefreshCw className="spin" size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
            {loading ? 'Performing Audit...' : 'Verify Resume'}
          </button>
        </div>
      </div>

      {/* Audit Report Panels */}
      {verificationData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Score Gauges Dials Row */}
          <div className="grid grid-3" style={{ gap: 20 }}>
            {/* Authenticity Score */}
            <div className="glass-panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={getScoreColor(verificationData.authenticity_score)}
                    strokeWidth="8"
                    strokeDasharray={getGaugePath(verificationData.authenticity_score).circ}
                    strokeDashoffset={getGaugePath(verificationData.authenticity_score).strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{verificationData.authenticity_score}</span>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px 0' }}>Authenticity Score</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Computed based on deduplication and chronological sanity consistency.
                </p>
              </div>
            </div>

            {/* Risk Index */}
            <div className="glass-panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={getScoreColor(verificationData.risk_score, true)}
                    strokeWidth="8"
                    strokeDasharray={getGaugePath(verificationData.risk_score).circ}
                    strokeDashoffset={getGaugePath(verificationData.risk_score).strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{verificationData.risk_score}%</span>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Risk</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px 0' }}>Overall Risk Index</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Calculated threat assessment score based on flagged anomalies.
                </p>
              </div>
            </div>

            {/* Trust Index */}
            <div className="glass-panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={getScoreColor(verificationData.trust_score)}
                    strokeWidth="8"
                    strokeDasharray={getGaugePath(verificationData.trust_score).circ}
                    strokeDashoffset={getGaugePath(verificationData.trust_score).strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{verificationData.trust_score}</span>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px 0' }}>Trust Score</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Reflects reference validation parameters and identity links presence.
                </p>
              </div>
            </div>
          </div>

          {/* Warning Flags Logs */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              Security Warning Logs ({verificationData.flags.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {verificationData.flags.map((flag, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    background: flag.severity === 'High' ? 'rgba(239, 68, 68, 0.05)' : flag.severity === 'Medium' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${flag.severity === 'High' ? '#ef4444' : flag.severity === 'Medium' ? '#f59e0b' : 'var(--text-muted)'}`,
                    borderRadius: '0 8px 8px 0'
                  }}
                >
                  <AlertTriangle
                    size={20}
                    style={{
                      color: flag.severity === 'High' ? '#ef4444' : flag.severity === 'Medium' ? '#f59e0b' : 'var(--text-muted)',
                      flexShrink: 0,
                      marginTop: 2
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>{flag.type}</strong>
                      <span
                        className="badge"
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          background: flag.severity === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: flag.severity === 'High' ? '#f87171' : '#fbbf24',
                          border: `1px solid ${flag.severity === 'High' ? '#ef4444' : '#f59e0b'}`
                        }}
                      >
                        {flag.severity} RISK
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                      {flag.description}
                    </p>
                  </div>
                </div>
              ))}
              
              {verificationData.flags.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--success)', marginBottom: 8 }} />
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: 'var(--text-main)' }}>Zero Anomalies Flagged</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Candidate's resume passed all automated verification checks.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Audit Detailed Tabs */}
          <div className="glass-panel" style={{ padding: 24 }}>
            
            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 10, marginBottom: 20 }}>
              <button
                className={`btn btn-sm ${activeSubTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ margin: 0 }}
                onClick={() => setActiveSubTab('timeline')}
              >
                <Calendar size={14} /> Timeline & Date Audits
              </button>
              <button
                className={`btn btn-sm ${activeSubTab === 'inflation' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ margin: 0 }}
                onClick={() => setActiveSubTab('inflation')}
              >
                <Award size={14} /> Skill Inflation Ratio
              </button>
              <button
                className={`btn btn-sm ${activeSubTab === 'duplicates' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ margin: 0 }}
                onClick={() => setActiveSubTab('duplicates')}
              >
                <Copy size={14} /> Duplicate Checker
              </button>
            </div>

            {/* Sub Tab Contents */}
            <div>
              {/* TIMELINE TAB */}
              {activeSubTab === 'timeline' && (
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 650, margin: '0 0 12px 0' }}>Chronological Experience Timeline</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {verificationData.timeline_details.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 8
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>{item.role}</strong>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> at {item.company}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge badge-secondary" style={{ fontSize: 11 }}>
                            {item.start} - {item.end}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            ({item.end - item.start} yrs)
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {verificationData.timeline_details.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No valid chronological timeline parsed.</span>
                    )}
                  </div>
                </div>
              )}

              {/* SKILL INFLATION TAB */}
              {activeSubTab === 'inflation' && (
                <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 650, margin: '0 0 14px 0' }}>Competency Density Audit</h4>
                  
                  <div className="grid grid-4" style={{ gap: 14 }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                        {verificationData.skill_inflation_details.skill_count}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Listed Skills</div>
                    </div>
                    
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                        {verificationData.skill_inflation_details.experience_years}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Years Experience</div>
                    </div>

                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                        {verificationData.skill_inflation_details.ratio_skills_per_year}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Skills / Year Ratio</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: verificationData.skill_inflation_details.is_inflated ? '#ef4444' : 'var(--success)', marginTop: 6 }}>
                        {verificationData.skill_inflation_details.is_inflated ? 'INFLATED' : 'STANDARD'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Density Evaluation</div>
                    </div>
                  </div>

                  <p style={{ margin: '16px 0 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
                    *Note: Competency Density audits analyze the total number of claimed frameworks relative to documented job history durations to identify inflation risks.
                  </p>
                </div>
              )}

              {/* DUPLICATE TAB */}
              {activeSubTab === 'duplicates' && (
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 650, margin: '0 0 12px 0' }}>Database Duplicate Checks</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {verificationData.duplicate_details.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          background: 'rgba(239, 68, 68, 0.05)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: '#f87171' }}>{item.name}</strong>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> (Email: {item.email})</span>
                        </div>
                        <span className="badge" style={{ fontSize: 10, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#f87171' }}>
                          {item.type}
                        </span>
                      </div>
                    ))}
                    
                    {verificationData.duplicate_details.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8 }}>
                        <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                        <span style={{ fontSize: 13, color: 'var(--success)' }}>
                          No duplicate name/email records identified in database. Unique profile.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
