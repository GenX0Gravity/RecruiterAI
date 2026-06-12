import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Search, MapPin, SlidersHorizontal, ChevronDown, ChevronUp,
  Info, X, ExternalLink, UserCheck, DollarSign, Briefcase, Calendar,
  User, Mail, Phone, ChevronRight, GraduationCap, Award, Sparkles, RefreshCw
} from 'lucide-react';
import { useToast } from './Toast';

export default function Leaderboard({ backendUrl, initialJob = null, onViewCandidate }) {
  const { addToast } = useToast();

  // Filters State
  const [skillsFilter, setSkillsFilter] = useState('');
  const [minExp, setMinExp] = useState(0);
  const [locationFilter, setLocationFilter] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [maxSalary, setMaxSalary] = useState(250000);
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [customJdText, setCustomJdText] = useState('');

  // Jobs List for Matcher
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('composite_score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Results State
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch Jobs List for Matcher Dropdown
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/jobs?page_size=100`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      console.error('Failed to load active jobs.');
    } finally {
      setJobsLoading(false);
    }
  }, [backendUrl]);

  // Fetch Candidates Rankings based on Filters
  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      let queryStr = `sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (skillsFilter.trim()) queryStr += `&skills=${encodeURIComponent(skillsFilter)}`;
      if (minExp > 0) queryStr += `&min_experience=${minExp}`;
      if (locationFilter.trim()) queryStr += `&location=${encodeURIComponent(locationFilter)}`;
      
      // Salary expectations query
      // Map salary limits based on currency selector
      let rawMaxSalary = maxSalary;
      if (currency === 'INR') {
        // e.g. slider range 4L - 40L, maxSalary is absolute in rupees (lakhs * 100000)
        rawMaxSalary = maxSalary;
      }
      queryStr += `&max_salary=${rawMaxSalary}`;
      
      if (availabilityFilter !== 'All') {
        queryStr += `&availability=${encodeURIComponent(availabilityFilter)}`;
      }

      // Add Job description / match filter
      if (selectedJobId && selectedJobId !== 'custom' && selectedJobId !== 'none') {
        queryStr += `&job_id=${selectedJobId}`;
      } else if (selectedJobId === 'custom' && customJdText.trim()) {
        queryStr += `&custom_jd=${encodeURIComponent(customJdText)}`;
      }

      const res = await fetch(`${backendUrl}/candidates/ranking?${queryStr}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setCandidates(data);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      addToast('Failed to fetch ranked candidates leaderboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, skillsFilter, minExp, locationFilter, currency, maxSalary, availabilityFilter, selectedJobId, customJdText, sortBy, sortOrder, addToast]);

  // Load jobs and handle initial pre-selection on mount/change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (initialJob && initialJob.title) {
      if (initialJob.id) {
        setSelectedJobId(initialJob.id.toString());
        setCustomJdText('');
      } else {
        setSelectedJobId('custom');
        setCustomJdText(initialJob.desc || '');
      }
      addToast(`Matching candidates against: ${initialJob.title}`, 'info');
    } else {
      setSelectedJobId('none');
    }
  }, [initialJob, addToast]);

  // Fetch rankings when parameters change
  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Sync salary slider default when currency changes
  useEffect(() => {
    if (currency === 'USD') {
      setMaxSalary(250000);
    } else {
      setMaxSalary(4000000); // 40 Lakhs INR
    }
  }, [currency]);

  // Handle header click sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setSkillsFilter('');
    setMinExp(0);
    setLocationFilter('');
    setCurrency('USD');
    setMaxSalary(250000);
    setAvailabilityFilter('All');
    setSelectedJobId('none');
    setCustomJdText('');
    setSortBy('composite_score');
    setSortOrder('desc');
    addToast('Filters reset to default.', 'success');
  };

  const openCandidateModal = (cand) => {
    setSelectedCandidate(cand);
    setModalOpen(true);
  };

  const closeCandidateModal = () => {
    setModalOpen(false);
    setSelectedCandidate(null);
  };

  // Render sort indicators
  const renderSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  // Top 3 Podium data
  const podiumCandidates = candidates.slice(0, 3);
  // Reorder for visual center-tall (#2 on left, #1 in center, #3 on right)
  const podiumOrdered = [];
  if (podiumCandidates.length >= 2) podiumOrdered.push(podiumCandidates[1]); // #2
  if (podiumCandidates.length >= 1) podiumOrdered.push(podiumCandidates[0]); // #1
  if (podiumCandidates.length >= 3) podiumOrdered.push(podiumCandidates[2]); // #3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={28} style={{ color: 'var(--accent-yellow)' }} /> Talent Leaderboard
          </h1>
          <p className="page-subtitle">Rank, score, and evaluate candidates based on multi-dimensional talent indexing</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRankings} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Rankings
        </button>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side: Dynamic Filters Bar */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={14} /> Rankings Criteria
            </h3>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 10 }} onClick={handleResetFilters}>
              Reset
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Active Job vacancy mapping */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MATCH WITH JOB OPENING</label>
              <select
                className="input-field"
                style={{ fontSize: 12, height: 38 }}
                value={selectedJobId}
                onChange={e => {
                  setSelectedJobId(e.target.value);
                  if (e.target.value !== 'custom') setCustomJdText('');
                }}
              >
                <option value="none">None (General Composite Ranking)</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title} ({job.company})</option>
                ))}
                <option value="custom">Paste Custom Job Description</option>
              </select>
            </div>

            {/* Custom JD Text Area if selected */}
            {selectedJobId === 'custom' && (
              <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>CUSTOM JOB DESCRIPTION</label>
                <textarea
                  className="input-field"
                  style={{ fontSize: 12, minHeight: 90, resize: 'vertical' }}
                  placeholder="Paste roles, tech stacks, requirements..."
                  value={customJdText}
                  onChange={e => setCustomJdText(e.target.value)}
                />
                <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={fetchRankings}>
                  Apply Custom JD
                </button>
              </div>
            )}

            <div className="divider" style={{ margin: '8px 0' }} />

            {/* Skills filter */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MANDATORY SKILLS</label>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 30, fontSize: 12 }}
                  placeholder="e.g. React, Python"
                  value={skillsFilter}
                  onChange={e => setSkillsFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Experience levels slider */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                MIN EXPERIENCE: <strong style={{ color: 'var(--accent-purple)' }}>{minExp} years</strong>
              </label>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                className="progress-bar-container"
                style={{ width: '100%', cursor: 'pointer', height: 6, accentColor: 'var(--accent-purple)' }}
                value={minExp}
                onChange={e => setMinExp(Number(e.target.value))}
              />
            </div>

            {/* Location */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>LOCATION SEARCH</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 30, fontSize: 12 }}
                  placeholder="e.g. Remote, India, US"
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Currency Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SALARY CURRENCY</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className={`btn btn-secondary btn-sm ${currency === 'USD' ? 'active' : ''}`}
                  style={{ flex: 1, border: currency === 'USD' ? '1px solid var(--accent-purple)' : '1px solid var(--glass-border)', background: currency === 'USD' ? 'rgba(139,92,246,0.1)' : 'transparent' }}
                  onClick={() => setCurrency('USD')}
                >
                  USD ($)
                </button>
                <button
                  className={`btn btn-secondary btn-sm ${currency === 'INR' ? 'active' : ''}`}
                  style={{ flex: 1, border: currency === 'INR' ? '1px solid var(--accent-purple)' : '1px solid var(--glass-border)', background: currency === 'INR' ? 'rgba(139,92,246,0.1)' : 'transparent' }}
                  onClick={() => setCurrency('INR')}
                >
                  INR (₹)
                </button>
              </div>
            </div>

            {/* Max Salary slider */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                MAX EXPECTED SALARY:{' '}
                <strong style={{ color: 'var(--accent-green)' }}>
                  {currency === 'USD'
                    ? `$${(maxSalary / 1000).toFixed(0)}k`
                    : `₹${(maxSalary / 100000).toFixed(1)}L`}
                </strong>
              </label>
              <input
                type="range"
                min={currency === 'USD' ? 40000 : 400000}
                max={currency === 'USD' ? 250000 : 4000000}
                step={currency === 'USD' ? 5000 : 50000}
                className="progress-bar-container"
                style={{ width: '100%', cursor: 'pointer', height: 6, accentColor: 'var(--accent-green)' }}
                value={maxSalary}
                onChange={e => setMaxSalary(Number(e.target.value))}
              />
            </div>

            {/* Availability */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>AVAILABILITY</label>
              <select
                className="input-field"
                style={{ fontSize: 12, height: 38 }}
                value={availabilityFilter}
                onChange={e => setAvailabilityFilter(e.target.value)}
              >
                <option value="All">All Availability</option>
                <option value="Immediate">Immediate</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Side: Podium + Leaderboard Listings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top 3 Podium Section */}
          {candidates.length > 0 && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'end', minHeight: 220 }}>
              {podiumOrdered.map((cand) => {
                // Find actual ranking rank (since we re-ordered the slice visually)
                const isFirst = cand.rank === 1;
                const isSecond = cand.rank === 2;
                const isThird = cand.rank === 3;

                // Design tokens for podium cards
                let cardStyle = {
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                };

                let podiumHeader = '';
                let borderGrad = 'var(--glass-border)';
                let podiumGlow = '';

                if (isFirst) {
                  cardStyle.minHeight = 250;
                  podiumHeader = 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,191,36,0.05) 100%)';
                  borderGrad = 'rgba(245,158,11,0.4)';
                  podiumGlow = '0 12px 32px rgba(245,158,11,0.15)';
                } else if (isSecond) {
                  cardStyle.minHeight = 220;
                  podiumHeader = 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.03) 100%)';
                  borderGrad = 'rgba(139,92,246,0.3)';
                  podiumGlow = '0 8px 24px rgba(139,92,246,0.1)';
                } else if (isThird) {
                  cardStyle.minHeight = 200;
                  podiumHeader = 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(236,72,153,0.03) 100%)';
                  borderGrad = 'rgba(236,72,153,0.25)';
                  podiumGlow = '0 6px 20px rgba(236,72,153,0.08)';
                }

                return (
                  <div
                    key={cand.id}
                    className="glass-panel"
                    style={{
                      ...cardStyle,
                      background: podiumHeader || 'var(--glass-bg)',
                      borderColor: borderGrad,
                      boxShadow: podiumGlow,
                      transform: isFirst ? 'scale(1.03)' : 'none',
                      zIndex: isFirst ? 2 : 1
                    }}
                    onClick={() => openCandidateModal(cand)}
                  >
                    {/* Podium Rank indicator crown */}
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}>
                      <Trophy
                        size={isFirst ? 22 : 16}
                        style={{
                          color: isFirst ? 'var(--accent-yellow)' : isSecond ? 'var(--accent-purple)' : 'var(--accent-pink)'
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>Rank #{cand.rank}</span>
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <h4 className="truncate" style={{ fontSize: 16, fontWeight: 700, maxWidth: 160 }}>{cand.name}</h4>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{cand.scores.experience_years} yrs exp · {cand.scores.highest_degree}</p>
                    </div>

                    {/* Big Score Ring */}
                    <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        fontSize: isFirst ? 36 : 28,
                        fontWeight: 800,
                        color: isFirst ? 'var(--accent-yellow)' : isSecond ? 'var(--accent-purple)' : 'var(--accent-pink)'
                      }}>
                        {cand.scores.composite_score}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>COMPOSITE</span>
                    </div>

                    {/* Preview skills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: '100%' }}>
                      {cand.skills_preview.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="badge badge-gray" style={{ fontSize: 9, padding: '2px 6px' }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Table List */}
          <div className="glass-panel" style={{ padding: 24, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Leaderboard Rankings</h3>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Showing <strong>{candidates.length}</strong> candidates
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton" style={{ height: 48, opacity: 0.4 }} />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>No candidates found matching the active filters criteria.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('rank')} style={{ width: 60 }}>
                      Rank {renderSortIndicator('rank')}
                    </th>
                    <th onClick={() => handleSort('name')}>
                      Candidate {renderSortIndicator('name')}
                    </th>
                    <th onClick={() => handleSort('composite_score')}>
                      Composite {renderSortIndicator('composite_score')}
                    </th>
                    <th onClick={() => handleSort('technical_score')}>
                      Technical {renderSortIndicator('technical_score')}
                    </th>
                    <th onClick={() => handleSort('experience_score')}>
                      Experience {renderSortIndicator('experience_score')}
                    </th>
                    <th onClick={() => handleSort('education_score')}>
                      Education {renderSortIndicator('education_score')}
                    </th>
                    <th onClick={() => handleSort('certifications_score')}>
                      Certifications {renderSortIndicator('certifications_score')}
                    </th>
                    <th onClick={() => handleSort('project_score')}>
                      Projects {renderSortIndicator('project_score')}
                    </th>
                    <th onClick={() => handleSort('job_match_score')}>
                      Job Match {renderSortIndicator('job_match_score')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((cand) => {
                    const score = cand.scores.composite_score;
                    const scoreColor = score >= 80 ? 'var(--accent-green)'
                      : score >= 60 ? 'var(--accent-blue)'
                      : score >= 40 ? 'var(--accent-yellow)'
                      : 'var(--accent-red)';
                      
                    return (
                      <tr
                        key={cand.id}
                        onClick={() => openCandidateModal(cand)}
                        style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <td style={{ fontWeight: 700, color: cand.rank <= 3 ? 'var(--accent-yellow)' : 'inherit' }}>
                          #{cand.rank}
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600 }}>{cand.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cand.location}</div>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: `${scoreColor}15`, color: scoreColor, borderColor: `${scoreColor}25` }}>
                            {score}
                          </span>
                        </td>
                        <td>{cand.scores.technical_score}</td>
                        <td>{cand.scores.experience_score} ({cand.scores.experience_years} yrs)</td>
                        <td>{cand.scores.education_score} ({cand.scores.highest_degree})</td>
                        <td>{cand.scores.certifications_score} ({cand.scores.certifications_count})</td>
                        <td>{cand.scores.project_score}</td>
                        <td>
                          {selectedJobId !== 'none' ? (
                            <span style={{ fontWeight: 700, color: cand.scores.job_match_score >= 70 ? 'var(--accent-green)' : 'inherit' }}>
                              {cand.scores.job_match_score}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Detailed Quick-View Modal */}
      {modalOpen && selectedCandidate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 580,
              padding: 28,
              position: 'relative',
              animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            }}
          >
            {/* Close Button */}
            <button
              onClick={closeCandidateModal}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(139,92,246,0.12)',
                color: 'var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{selectedCandidate.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Rank #{selectedCandidate.rank}</span>
                  <span>·</span>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Composite Score: {selectedCandidate.scores.composite_score}</span>
                </div>
              </div>
            </div>

            {/* Candidate Metadata Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Contact Information */}
              <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h4 style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Contact Info</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Mail size={13} style={{ color: 'var(--accent-purple)' }} />
                  <span className="truncate" style={{ maxWidth: 200 }} title={selectedCandidate.email}>{selectedCandidate.email || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Phone size={13} style={{ color: 'var(--accent-purple)' }} />
                  <span>{selectedCandidate.phone || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <MapPin size={13} style={{ color: 'var(--accent-purple)' }} />
                  <span>{selectedCandidate.location}</span>
                </div>
              </div>

              {/* Seeding attributes summary */}
              <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h4 style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Recruitment parameters</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <DollarSign size={13} style={{ color: 'var(--accent-green)' }} />
                  <div>
                    <span>Expected Salary: </span>
                    <strong style={{ color: 'var(--accent-green)' }}>{selectedCandidate.scores.salary_formatted}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Calendar size={13} style={{ color: 'var(--accent-blue)' }} />
                  <div>
                    <span>Availability: </span>
                    <strong style={{ color: 'var(--accent-blue)' }}>{selectedCandidate.scores.availability}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Award size={13} style={{ color: 'var(--accent-yellow)' }} />
                  <div>
                    <span>Exp Level: </span>
                    <strong>{selectedCandidate.scores.experience_years} years</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Skills preview */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Key Skills</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {selectedCandidate.skills_preview.map((skill, idx) => (
                  <span key={idx} className="badge badge-skill">{skill}</span>
                ))}
              </div>
            </div>

            {/* Job description match details */}
            {selectedJobId !== 'none' && (
              <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={14} style={{ color: 'var(--accent-green)' }} /> Job Match Insights
                  </h4>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-green)' }}>
                    {selectedCandidate.scores.job_match_score}% Match
                  </span>
                </div>

                {/* Match / Missing tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                  <div>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700, display: 'block', marginBottom: 4 }}>MATCHED REQUIREMENTS:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {selectedCandidate.scores.matching_skills.length > 0 ? (
                        selectedCandidate.scores.matching_skills.map((s, i) => (
                          <span key={i} className="badge badge-green" style={{ fontSize: 9 }}>{s}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>None matched</span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 700, display: 'block', marginBottom: 4 }}>MISSING REQUIREMENTS:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {selectedCandidate.scores.missing_skills.length > 0 ? (
                        selectedCandidate.scores.missing_skills.map((s, i) => (
                          <span key={i} className="badge badge-red" style={{ fontSize: 9 }}>{s}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>None missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={closeCandidateModal}
              >
                Close
              </button>
              <button
                className="btn"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => {
                  closeCandidateModal();
                  onViewCandidate(selectedCandidate.id);
                }}
              >
                View Full Insights <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
