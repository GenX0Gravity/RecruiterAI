import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, RefreshCw, Sparkles, ChevronRight, CheckCircle2, ListChecks,
  TrendingUp, Calendar, ShieldCheck, HelpCircle, Users, ArrowRight,
  Target, Zap, Compass, Star, Settings
} from 'lucide-react';
import { useToast } from './Toast';

export default function CareerGrowthPredictor({ backendUrl }) {
  const { addToast } = useToast();

  // Selection Inputs State
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  // Results State
  const [loading, setLoading] = useState(false);
  const [growthData, setGrowthData] = useState(null);
  const [activeRoadmapTab, setActiveRoadmapTab] = useState('1_year');

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
      console.error('Failed to load candidates for career growth.');
    } finally {
      setCandidatesLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Run Predictor API
  const handlePredictGrowth = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCandidateId) {
      addToast('Please select a candidate first.', 'error');
      return;
    }

    setLoading(true);
    setGrowthData(null);

    try {
      const res = await fetch(`${backendUrl}/candidates/${selectedCandidateId}/career-growth`);
      if (!res.ok) throw new Error('API failed to calculate career growth predictions.');
      const data = await res.json();
      
      setGrowthData(data);
      addToast('Career growth predictions generated!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to predict career growth.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCandidateObj = candidatesList.find(c => c.id.toString() === selectedCandidateId);

  // Helper colors for readiness rating
  const getReadinessColors = (pct) => {
    if (pct >= 80) return { text: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)' };
    if (pct >= 60) return { text: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.1)' };
    return { text: 'var(--accent-yellow)', bg: 'rgba(245,158,11,0.1)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={28} style={{ color: 'var(--accent-purple)' }} /> Career Growth Predictor
        </h1>
        <p className="page-subtitle">Analyze skills, history experience, and projects to predict promotion timelines and dynamic career trajectories</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side: Setup Parameters */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
            <Settings size={14} /> Predictor Parameters
          </h3>

          <form onSubmit={handlePredictGrowth} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

            <button type="submit" className="btn btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Modeling Curve...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Predict Growth
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Prediction Dashboard Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {!growthData && !loading && (
            <div className="glass-panel" style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Compass size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-purple)' }} />
              <h3>Predict Candidate Career Trajectories</h3>
              <p style={{ marginTop: 6, fontSize: 14, maxWidth: 450, margin: '6px auto 0' }}>
                Run the prediction engine to calculate promotion readiness percentages, dynamic USD/INR compensation forecasts, and dual-track leadership roadmaps.
              </p>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-panel" style={{ height: 140, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-panel" style={{ height: 160, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            </div>
          )}

          {growthData && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Row 1: Promotion Readiness Gauge & Suitable Roles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>
                {/* Readiness Circular gauge */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Promotion Readiness</h4>

                  <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
                    <svg style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--glass-border)" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50"
                        fill="transparent"
                        stroke={getReadinessColors(growthData.promotion_readiness_pct).text}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - growthData.promotion_readiness_pct / 100)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 28, fontWeight: 800 }}>{growthData.promotion_readiness_pct}%</span>
                      <span style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>READY</span>
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: getReadinessColors(growthData.promotion_readiness_pct).bg,
                      color: getReadinessColors(growthData.promotion_readiness_pct).text,
                      borderColor: 'transparent',
                      fontSize: 10,
                      marginTop: 10
                    }}
                  >
                    {growthData.readiness_status}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    <Calendar size={12} /> Timeline: <strong>{growthData.timeline_to_promotion}</strong>
                  </div>
                </div>

                {/* Target Suitable Roles */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Target Growth Roles</h4>
                  
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                    Based on technical competencies and career longevity, the candidate is qualified to scale into:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {growthData.suitable_roles.map((role, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
                        }}>
                          {idx + 1}
                        </span>
                        <span>{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: 1-3-5 Year Milestone summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {/* 1 Year */}
                <div className="glass-panel" style={{ padding: 20, borderLeft: '4px solid var(--accent-blue)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>1 YEAR TARGET</span>
                    <TrendingUp size={14} style={{ color: 'var(--accent-blue)' }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{growthData.suitable_roles[0]}</h5>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Focus: Core API scalability & unit tests.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>EST COMP:</span>
                    <strong style={{ color: 'var(--accent-green)', fontSize: 13 }}>{growthData.salary_projections["1_year"]}</strong>
                  </div>
                </div>

                {/* 3 Years */}
                <div className="glass-panel" style={{ padding: 20, borderLeft: '4px solid var(--accent-purple)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>3 YEAR TARGET</span>
                    <Star size={14} style={{ color: 'var(--accent-purple)' }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{growthData.suitable_roles[1] || 'Lead Engineer'}</h5>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Focus: System design & team mentoring.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>EST COMP:</span>
                    <strong style={{ color: 'var(--accent-green)', fontSize: 13 }}>{growthData.salary_projections["3_year"]}</strong>
                  </div>
                </div>

                {/* 5 Years */}
                <div className="glass-panel" style={{ padding: 20, borderLeft: '4px solid var(--accent-pink)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>5 YEAR TARGET</span>
                    <Target size={14} style={{ color: 'var(--accent-pink)' }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{growthData.suitable_roles[2] || 'Software Architect'}</h5>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Focus: Technology roadmaps & budgets.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>EST COMP:</span>
                    <strong style={{ color: 'var(--accent-green)', fontSize: 13 }}>{growthData.salary_projections["5_year"]}</strong>
                  </div>
                </div>
              </div>

              {/* Row 3: Divergent Career Tracks flowchart map */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 18 }}>Divergent Career Tracks</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* IC Track */}
                  <div className="glass-card" style={{ padding: 18 }}>
                    <h5 style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <Zap size={14} /> Individual Contributor (IC) Track
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {growthData.ic_track.map((node, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', width: 45 }}>Step {i+1}:</div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{node}</div>
                          {i < growthData.ic_track.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Management Track */}
                  <div className="glass-card" style={{ padding: 18 }}>
                    <h5 style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <Users size={14} /> Engineering Management Track
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {growthData.management_track.map((node, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', width: 45 }}>Step {i+1}:</div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{node}</div>
                          {i < growthData.management_track.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Detailed roadmap timeline tabs */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 18 }}>Phased Learning Roadmaps</h4>

                {/* Sub Tab selection */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: 1, gap: 8, marginBottom: 20 }}>
                  {[
                    { id: '1_year', label: '1 Year Plan', color: 'var(--accent-blue)' },
                    { id: '3_year', label: '3 Year Plan', color: 'var(--accent-purple)' },
                    { id: '5_year', label: '5 Year Plan', color: 'var(--accent-pink)' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      style={{
                        padding: '8px 14px',
                        border: 'none',
                        borderBottom: activeRoadmapTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 700,
                        color: activeRoadmapTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setActiveRoadmapTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* roadmap view */}
                {growthData.roadmaps[activeRoadmapTab] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
                    {/* Goals List */}
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Core Growth Objectives:</span>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {growthData.roadmaps[activeRoadmapTab].goals.map((g, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <CheckCircle2 size={14} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: 1 }} />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Skill targets */}
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Target Core Competencies:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {growthData.roadmaps[activeRoadmapTab].skills.map((skill, i) => (
                          <span key={i} className="badge badge-purple" style={{ fontSize: 10 }}>{skill}</span>
                        ))}
                      </div>
                    </div>

                    {/* Final deliverable box */}
                    <div className="glass-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Key Target Deliverable:</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>{growthData.roadmaps[activeRoadmapTab].deliverable}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: Action Recommendations List Card */}
              <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <ListChecks size={15} style={{ color: 'var(--accent-purple)' }} /> Actionable Recommendations
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {growthData.recommendations.map((rec, i) => (
                    <div key={i} className="glass-card" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1
                      }}>
                        {i + 1}
                      </span>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
