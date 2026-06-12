import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, RefreshCw, Download, FileText, CheckCircle2,
  ArrowRight, ShieldAlert, Award, FileCode, CheckCircle, HelpCircle,
  Briefcase, User, MapPin, Mail, Phone, ExternalLink, Columns
} from 'lucide-react';
import { useToast } from './Toast';

export default function ResumeEnhancer({ backendUrl }) {
  const { addToast } = useToast();

  // Candidates Dropdown
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  // Results State
  const [loading, setLoading] = useState(false);
  const [enhancedData, setEnhancedData] = useState(null);
  const [activeLayout, setActiveLayout] = useState('ats'); // 'ats' | 'recruiter' | 'executive'
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'pdf' | 'docx'

  // Fetch candidate list for selection
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
      addToast('Failed to load candidate directory.', 'error');
    } finally {
      setCandidatesLoading(false);
    }
  }, [backendUrl, addToast]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Trigger Enhancement
  const handleEnhance = async () => {
    if (!selectedCandidateId) {
      addToast('Please select a candidate first.', 'warning');
      return;
    }

    setLoading(true);
    setEnhancedData(null);
    try {
      const res = await fetch(`${backendUrl}/candidates/${selectedCandidateId}/enhance`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('API response error');
      const data = await res.json();
      setEnhancedData(data);
      addToast('Resume enhanced successfully!', 'success');
    } catch {
      addToast('Error generating resume enhancements.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Download Trigger
  const handleDownload = async (fileType) => {
    if (!selectedCandidateId) return;

    setDownloadingFormat(fileType);
    try {
      const downloadUrl = `${backendUrl}/candidates/${selectedCandidateId}/enhance/download?format=${activeLayout}&type=${fileType}`;
      
      // Fetch as blob
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const cand = candidatesList.find(c => c.id.toString() === selectedCandidateId);
      const safeName = cand ? cand.name.replace(/\s+/g, '_') : 'Candidate';
      
      a.download = `${safeName}_${activeLayout.toUpperCase()}_Resume.${fileType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      addToast(`Downloaded ${activeLayout.toUpperCase()} resume in ${fileType.toUpperCase()}`, 'success');
    } catch {
      addToast('Failed to download resume file.', 'error');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const getCandidateName = () => {
    const cand = candidatesList.find(c => c.id.toString() === selectedCandidateId);
    return cand ? cand.name : 'Candidate Name';
  };

  const getCandidateContact = () => {
    const cand = candidatesList.find(c => c.id.toString() === selectedCandidateId);
    return cand ? { email: cand.email, phone: cand.phone } : { email: 'john@example.com', phone: '+1-555-0100' };
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Resume Enhancement System
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
            Instantly rewrite weak descriptions, optimize keywords, and download premium resumes formatted for ATS scanners and human recruiters.
          </p>
        </div>
      </div>

      {/* Control Selector Panel */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 280px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', tracking: '0.05em', marginBottom: 6, color: 'var(--text-muted)' }}>
              Select Candidate
            </label>
            <select
              className="form-control"
              style={{ width: '100%', height: 42 }}
              value={selectedCandidateId}
              onChange={(e) => {
                setSelectedCandidateId(e.target.value);
                setEnhancedData(null);
              }}
              disabled={candidatesLoading || loading}
            >
              {candidatesLoading ? (
                <option>Loading candidate catalog...</option>
              ) : candidatesList.length === 0 ? (
                <option>No parsed candidates available</option>
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
            onClick={handleEnhance}
            disabled={loading || !selectedCandidateId}
          >
            {loading ? (
              <RefreshCw className="spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            {loading ? 'Enhancing Profile...' : 'Enhance Resume'}
          </button>
        </div>
      </div>

      {/* Main Comparative Dashboard */}
      {enhancedData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Level Summary Comparer */}
          <div className="grid grid-2" style={{ gap: 20 }}>
            {/* Summary Card */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="badge badge-secondary" style={{ textTransform: 'uppercase' }}>Original Profile Summary</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Understated impact</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                "{enhancedData.original_summary || 'A professional seeking a position in software engineering.'}"
              </p>
            </div>

            <div className="glass-panel" style={{ padding: 20, border: '1px solid rgba(13, 148, 136, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="badge badge-success" style={{ textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={12} /> Enhanced summary
                </span>
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Active & authoritative</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-main)' }}>
                {enhancedData.enhanced_summary}
              </p>
            </div>
          </div>

          {/* Experience Bullet Rewriting Grid */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              Action-Oriented Experience Rewrite Audit
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {enhancedData.enhanced_experience.map((exp, expIdx) => (
                <div key={expIdx} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>{exp.Role}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> at {exp.Company}</span>
                    </div>
                    <span className="badge badge-secondary" style={{ fontSize: 11 }}>{exp.Duration || 'Timeline'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {exp.Responsibilities.map((resp, respIdx) => {
                      const originalBullet = (enhancedData.original_experience[expIdx]?.Responsibilities?.[respIdx]) || "Responsible for handling generic developer duties.";
                      return (
                        <div key={respIdx} className="grid grid-2" style={{ gap: 16, borderTop: respIdx > 0 ? '1px solid var(--border-color)' : 'none', paddingTop: respIdx > 0 ? 10 : 0 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Original:</span>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{originalBullet}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <ArrowRight size={16} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{resp}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements & Keywords Section */}
          <div className="grid grid-2" style={{ gap: 20 }}>
            {/* Key Achievements */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={18} style={{ color: 'var(--accent)' }} /> High-Impact Achievements
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
                Quantifiable business achievements added to highlight performance metrics:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enhancedData.achievements.map((ach, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{ach}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Density Optimizer */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCode size={18} style={{ color: 'var(--success)' }} /> ATS Skill Keywords Optimizer
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
                Skills parsed and optimized for the <strong>{enhancedData.domain}</strong> catalog:
              </p>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Matched Domain Skills ({enhancedData.matched_keywords.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {enhancedData.matched_keywords.map((kw, idx) => (
                    <span key={idx} className="badge badge-success" style={{ fontSize: 11 }}>
                      {kw}
                    </span>
                  ))}
                  {enhancedData.matched_keywords.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No matched primary domain skills found.</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Suggested ATS Injectable Keywords ({enhancedData.missing_keywords.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {enhancedData.missing_keywords.map((kw, idx) => (
                    <span key={idx} className="badge badge-secondary" style={{ fontSize: 11, border: '1px dashed rgba(245, 158, 11, 0.4)', background: 'none', color: 'var(--accent)' }}>
                      ✚ {kw}
                    </span>
                  ))}
                  {enhancedData.missing_keywords.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--success)' }}>Excellent! Candidate has 100% domain keyword density coverage.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Layout Formats & Downloads */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 14, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>
                  Select Optimized Resume Layout Format
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  Toggle styles to preview the structure and trigger dynamic exports.
                </p>
              </div>

              {/* Layout Switch Tabs */}
              <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <button
                  className={`btn btn-sm ${activeLayout === 'ats' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 6, margin: 0 }}
                  onClick={() => setActiveLayout('ats')}
                >
                  ATS Optimized
                </button>
                <button
                  className={`btn btn-sm ${activeLayout === 'recruiter' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 6, margin: 0 }}
                  onClick={() => setActiveLayout('recruiter')}
                >
                  Recruiter Optimized
                </button>
                <button
                  className={`btn btn-sm ${activeLayout === 'executive' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 6, margin: 0 }}
                  onClick={() => setActiveLayout('executive')}
                >
                  Executive Resume
                </button>
              </div>
            </div>

            {/* Layout Structural Visual Preview */}
            <div className="grid grid-3" style={{ gap: 20, marginBottom: 24 }}>
              {/* Layout properties summary */}
              <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: 16, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', fontSize: 14, marginBottom: 6, color: 'var(--text-main)' }}>
                    {activeLayout === 'ats' ? 'ATS Scanner Friendly' : activeLayout === 'recruiter' ? 'Human Recruiter Accent' : 'Executive Leadership Elegance'}
                  </strong>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {activeLayout === 'ats'
                      ? 'Features a single-column, strictly-linear document tree with standardized header nodes. Maximizes parsing scores across Workday, Taleo, and Greenhouse databases.'
                      : activeLayout === 'recruiter'
                      ? 'Organizes contact details and target keywords into an elegant, colored left sidebar. Emphasizes chronological achievements with readable progress checkmarks.'
                      : 'Centered premium header layout employing deep-navy typography. Highlights key achievements as milestone items and styles competencies in an structured matrix.'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => handleDownload('pdf')}
                    disabled={downloadingFormat !== null}
                  >
                    {downloadingFormat === 'pdf' ? (
                      <RefreshCw className="spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                    {downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download PDF Document'}
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => handleDownload('docx')}
                    disabled={downloadingFormat !== null}
                  >
                    {downloadingFormat === 'docx' ? (
                      <RefreshCw className="spin" size={16} />
                    ) : (
                      <FileText size={16} />
                    )}
                    {downloadingFormat === 'docx' ? 'Generating Word...' : 'Download Word (DOCX)'}
                  </button>
                </div>
              </div>

              {/* Dynamic CSS Preview Panel simulating the layouts */}
              <div style={{ gridColumn: 'span 2', minHeight: 320, background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: 24, overflowY: 'auto', maxHeight: 400, color: '#f3f4f6', fontFamily: 'monospace', fontSize: 11 }}>
                {activeLayout === 'ats' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px solid #4b5563', paddingBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>{getCandidateName().toUpperCase()}</div>
                      <div>{getCandidateContact().email} | {getCandidateContact().phone} | SF Bay Area</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: 2 }}>PROFESSIONAL SUMMARY</div>
                      <div style={{ opacity: 0.85 }}>{enhancedData.enhanced_summary}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: 2 }}>CORE COMPETENCIES & KEYWORDS</div>
                      <div style={{ opacity: 0.85 }}>{enhancedData.matched_keywords.join(', ')}, {enhancedData.missing_keywords.slice(0, 4).join(', ')}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: 4 }}>PROFESSIONAL EXPERIENCE</div>
                      {enhancedData.enhanced_experience.map((exp, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{exp.Role} - {exp.Company}</span>
                            <span>{exp.Duration}</span>
                          </div>
                          {exp.Responsibilities.slice(0, 2).map((resp, rIdx) => (
                            <div key={rIdx} style={{ paddingLeft: 8, opacity: 0.8 }}>• {resp}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeLayout === 'recruiter' && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    {/* Mock Sidebar */}
                    <div style={{ width: '30%', borderRight: '1px solid #4b5563', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0d9488', fontSize: 10 }}>CONTACT</div>
                        <div style={{ fontSize: 9, wordBreak: 'break-all' }}>{getCandidateContact().email}</div>
                        <div style={{ fontSize: 9 }}>{getCandidateContact().phone}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0d9488', fontSize: 10 }}>EXPERT SKILLS</div>
                        {enhancedData.matched_keywords.slice(0, 5).map((k, i) => (
                          <div key={i} style={{ fontSize: 9 }}>✔ {k}</div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0d9488', fontSize: 10 }}>ATS COMPLIANT</div>
                        {enhancedData.missing_keywords.slice(0, 3).map((k, i) => (
                          <div key={i} style={{ fontSize: 9 }}>✚ {k}</div>
                        ))}
                      </div>
                    </div>

                    {/* Mock Main Content */}
                    <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#0d9488' }}>{getCandidateName().toUpperCase()}</div>
                        <div style={{ fontSize: 9, opacity: 0.7 }}>Target Domain: {enhancedData.domain}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0d9488', marginBottom: 2 }}>SUMMARY</div>
                        <div style={{ opacity: 0.85 }}>{enhancedData.enhanced_summary}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0d9488', marginBottom: 2 }}>WORK CHRONOLOGY</div>
                        {enhancedData.enhanced_experience.map((exp, idx) => (
                          <div key={idx} style={{ marginBottom: 6 }}>
                            <div style={{ fontWeight: 'bold' }}>{exp.Role} @ {exp.Company}</div>
                            <div style={{ fontSize: 9, opacity: 0.6 }}>{exp.Duration}</div>
                            {exp.Responsibilities.slice(0, 1).map((resp, rIdx) => (
                              <div key={rIdx} style={{ opacity: 0.8 }}>• {resp}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeLayout === 'executive' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 'bold', color: '#3b82f6', letterSpacing: 1 }}>{getCandidateName().toUpperCase()}</div>
                      <div style={{ fontSize: 9, fontStyle: 'italic', opacity: 0.8 }}>{enhancedData.domain} | {getCandidateContact().email} | {getCandidateContact().phone}</div>
                      <div style={{ width: '50%', height: 1, background: '#3b82f6', margin: '6px auto 0 auto' }}></div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#3b82f6', textAlign: 'center', marginBottom: 4 }}>EXECUTIVE LEADERSHIP PROFILE</div>
                      <div style={{ textAlign: 'justify', opacity: 0.85 }}>{enhancedData.enhanced_summary}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#3b82f6', textAlign: 'center', marginBottom: 4 }}>DISTINGUISHED IMPACT MILESTONES</div>
                      {enhancedData.achievements.slice(0, 2).map((ach, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 6, opacity: 0.85, marginBottom: 2 }}>
                          <span>🏆</span>
                          <span>{ach}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#3b82f6', textAlign: 'center', marginBottom: 4 }}>AREAS OF EXPERTISE</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, textAlign: 'center' }}>
                        {enhancedData.matched_keywords.slice(0, 6).map((kw, i) => (
                          <div key={i} style={{ background: '#1f2937', padding: '2px 4px', borderRadius: 2 }}>{kw}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
