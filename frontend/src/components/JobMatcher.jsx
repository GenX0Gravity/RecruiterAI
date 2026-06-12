import React, { useState, useEffect } from 'react';
import { FileSearch, Trophy, Zap, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { useToast } from './Toast';

export default function JobMatcher({ backendUrl, initialTitle = '', initialDesc = '' }) {
  const { addToast } = useToast();
  const [jobTitle, setJobTitle]       = useState(initialTitle);
  const [jobDesc, setJobDesc]         = useState(initialDesc);
  const [rankings, setRankings]       = useState([]);
  const [jdAnalysis, setJdAnalysis]   = useState(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    setJobTitle(initialTitle);
    setJobDesc(initialDesc);
  }, [initialTitle, initialDesc]);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!jobDesc.trim()) return;
    setLoading(true);
    setRankings([]);
    setJdAnalysis(null);

    try {
      // Fixed: POST JSON body (not query params)
      const res = await fetch(`${backendUrl}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDesc, job_title: jobTitle }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data.error) { addToast(data.error, 'warning'); return; }
      setRankings(data.rankings || []);
      setJdAnalysis({ title: data.job_title, total: data.total_candidates });
      if ((data.rankings || []).length === 0) addToast('No candidates to rank. Upload resumes first.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to match candidates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 className="page-title">Job Description Matcher</h1>
        <p className="page-subtitle">AI-powered candidate ranking using TF-IDF semantic analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* JD Input */}
        <div className="glass-panel" style={{ padding: 28 }}>
          <h3 className="card-title"><FileSearch size={16} /> Enter Job Requirements</h3>
          <form onSubmit={handleMatch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>JOB TITLE</label>
              <input
                className="input-field"
                placeholder="e.g. Senior Python Developer"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>JOB DESCRIPTION</label>
              <textarea
                className="input-field"
                style={{ minHeight: 240, resize: 'vertical' }}
                placeholder="Paste the full job description here. Include required skills, experience level, responsibilities…"
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Quick fill templates */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Quick fill:</span>
              {[
                { label: 'Python Dev', desc: 'We are looking for a Senior Python Developer with 3+ years experience in FastAPI, Django, PostgreSQL, Docker, and AWS cloud infrastructure.' },
                { label: 'React Engineer', desc: 'Frontend React Engineer needed with 2+ years experience in React.js, TypeScript, Redux, REST APIs, and modern CSS frameworks.' },
                { label: 'ML Engineer', desc: 'Machine Learning Engineer with expertise in Python, TensorFlow, PyTorch, scikit-learn, NLP, and cloud deployment on AWS or GCP.' },
              ].map(t => (
                <button key={t.label} type="button" className="badge badge-blue"
                  style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 11 }}
                  onClick={() => { setJobTitle(t.label); setJobDesc(t.desc); }}>
                  {t.label}
                </button>
              ))}
            </div>

            <button type="submit" className="btn btn-lg" disabled={loading || !jobDesc.trim()}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Analyzing…</> : <><Zap size={16} /> Find Best Matches</>}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="glass-panel" style={{ padding: 28, minHeight: 400 }}>
          <h3 className="card-title"><Trophy size={16} /> Compatibility Rankings
            {jdAnalysis && <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 11 }}>{jdAnalysis.total} candidates</span>}
          </h3>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16, color: 'var(--text-secondary)' }}>
              <div className="spinner" />
              <p style={{ fontSize: 14 }}>Running TF-IDF semantic analysis…</p>
            </div>
          )}

          {!loading && rankings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <p>Enter a job description and click <strong style={{ color: 'var(--text-secondary)' }}>Find Best Matches</strong> to rank candidates.</p>
            </div>
          )}

          {!loading && rankings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rankings.map((r, idx) => {
                const pct   = r.match_percentage || Math.round((r.match_score || 0) * 100);
                const color = pct >= 70 ? 'var(--accent-green)' : pct >= 45 ? 'var(--accent-blue)' : 'var(--accent-red)';
                return (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 16, border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, color: 'var(--accent-purple)', fontSize: 18, minWidth: 28 }}>#{idx + 1}</span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{r.candidate}</span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color, fontSize: 16 }}>{pct}%</span>
                    </div>

                    <div className="progress-bar-container" style={{ marginBottom: 10 }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #8b5cf6, ${color})` }} />
                    </div>

                    {/* Matching / Missing Skills */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                      {(r.matching_skills || []).slice(0, 4).map((s, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent-green)' }}>
                          <CheckCircle size={11} /> {s}
                        </span>
                      ))}
                      {(r.missing_skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent-red)' }}>
                          <XCircle size={11} /> {s}
                        </span>
                      ))}
                    </div>

                    {/* Why match */}
                    {(r.why_match || []).length > 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                        <Lightbulb size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--accent-yellow)' }} />
                        {r.why_match[0]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
