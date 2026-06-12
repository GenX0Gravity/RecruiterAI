import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Search, MapPin, DollarSign, Award, ExternalLink,
  RefreshCw, SlidersHorizontal, Sparkles, TrendingUp, Building2,
  ListFilter, Code, HelpCircle, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useToast } from './Toast';

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

const PLATFORM_BADGE = {
  LinkedIn: 'badge-blue',
  Indeed: 'badge-purple',
  Naukri: 'badge-green',
  Wellfound: 'badge-yellow',
  Internshala: 'badge-red',
  Glassdoor: 'badge-cyan',
  'Company Career Pages': 'badge-gray',
};

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--accent-purple)' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function JobIntelligence({ backendUrl, onMatchCandidates }) {
  const { addToast } = useToast();

  // Job Search / List State
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch Jobs List
  const fetchJobs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      let queryStr = `page=${pageNum}&page_size=6`;
      if (searchQuery.trim()) queryStr += `&q=${encodeURIComponent(searchQuery)}`;
      if (locationFilter.trim()) queryStr += `&location=${encodeURIComponent(locationFilter)}`;
      if (skillsFilter.trim()) queryStr += `&skills=${encodeURIComponent(skillsFilter)}`;
      if (sourceFilter !== 'All') queryStr += `&source=${encodeURIComponent(sourceFilter)}`;
      if (minSalaryFilter) queryStr += `&min_salary=${minSalaryFilter}`;
      if (expFilter !== '') queryStr += `&experience=${expFilter}`;

      const res = await fetch(`${backendUrl}/jobs?${queryStr}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      addToast('Failed to fetch job vacancies.', 'error');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, searchQuery, locationFilter, skillsFilter, sourceFilter, minSalaryFilter, expFilter, addToast]);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/jobs/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [backendUrl]);

  // Initial loading
  useEffect(() => {
    fetchJobs(1);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setSkillsFilter('');
    setSourceFilter('All');
    setMinSalaryFilter('');
    setExpFilter('');
    // Trigger reset search next tick
    setTimeout(() => {
      setLoading(true);
      fetch(`${backendUrl}/jobs?page=1&page_size=6`)
        .then(res => res.json())
        .then(data => {
          setJobs(data.jobs || []);
          setTotal(data.total || 0);
          setPage(1);
          setLoading(false);
        });
    }, 50);
  };

  // Sync / Refresh Aggregation
  const handleForceRefresh = async () => {
    setSyncing(true);
    addToast('Syncing active vacancies from job boards...', 'info');
    try {
      const res = await fetch(`${backendUrl}/jobs/refresh`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        addToast(data.message, 'success');
        fetchJobs(1);
        fetchAnalytics();
      } else {
        throw new Error('Sync failed');
      }
    } catch {
      addToast('Failed to sync job listings.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const formatSalary = (min, max, currency) => {
    if (!min && !max) return 'Not Disclosed';
    const isUSD = currency === 'USD';
    const symbol = isUSD ? '$' : '₹';
    
    if (isUSD) {
      // e.g. $80k - $120k
      const minK = min ? `${Math.round(min / 1000)}k` : '0';
      const maxK = max ? `${Math.round(max / 1000)}k` : '';
      return maxK ? `${symbol}${minK} - ${symbol}${maxK}` : `${symbol}${minK}+`;
    } else {
      // e.g. ₹6L - ₹12L (LPA)
      const minL = min ? `${(min / 100000).toFixed(1).replace('.0', '')}L` : '0';
      const maxL = max ? `${(max / 100000).toFixed(1).replace('.0', '')}L` : '';
      return maxL ? `${symbol}${minL} - ${symbol}${maxL} PA` : `${symbol}${minL}+ PA`;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 6));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Market Job Intelligence</h1>
          <p className="page-subtitle">Real-time aggregated vacancies and skill demand analytics</p>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={handleForceRefresh} 
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={syncing ? 'spinner' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Syncing...' : 'Sync Vacancies'}
        </button>
      </div>

      {/* Recruiter Dashboard Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {analyticsLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel stat-card" style={{ height: 86, opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
          ))
        ) : (
          <>
            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)' }}>
                <Briefcase size={22} />
              </div>
              <div>
                <div className="stat-label">Active Vacancies</div>
                <div className="stat-value">{analytics?.total_active ?? 0}</div>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)' }}>
                <Building2 size={22} />
              </div>
              <div>
                <div className="stat-label">Hiring Companies</div>
                <div className="stat-value">{analytics?.hiring_companies?.length ?? 0}</div>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <div className="stat-label">Trending Role</div>
                <div className="stat-value" style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                  {analytics?.trending_jobs?.[0]?.title ?? 'Software Engineer'}
                </div>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(236,72,153,0.12)', color: 'var(--accent-pink)' }}>
                <Code size={22} />
              </div>
              <div>
                <div className="stat-label">Top Core Skill</div>
                <div className="stat-value">{analytics?.in_demand_skills?.[0]?.skill ?? 'Python'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Visual Analytics Widgets Row */}
      {analytics && !analyticsLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>
          {/* Active Openings by platform (Donut Chart) */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 className="card-title"><ListFilter size={16} /> Openings by Platform</h3>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.active_openings_by_source}
                    dataKey="count"
                    nameKey="source"
                    cx="50%" cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {analytics.active_openings_by_source.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend to make it look premium */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyItems: 'center', justifyContent: 'center', gap: '8px 12px', marginTop: 12 }}>
              {analytics.active_openings_by_source.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                  <span>{item.source}: <strong>{item.count}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* In-Demand Skills Bar Chart */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 className="card-title"><Sparkles size={16} /> Market Skill Demand</h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.in_demand_skills} margin={{ bottom: 20 }}>
                  <XAxis dataKey="skill" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={30}>
                    {analytics.in_demand_skills.map((_, i) => (
                      <Cell key={i} fill={`url(#skillGrad_${i})`} />
                    ))}
                  </Bar>
                  <defs>
                    {analytics.in_demand_skills.map((_, i) => (
                      <linearGradient key={i} id={`skillGrad_${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Filters & Search results */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Advanced Filters Panel */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={14} /> Filters
            </h3>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 10 }} onClick={handleResetFilters}>
              Reset
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Keyword */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>KEYWORDS / ROLE</label>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 30, fontSize: 12 }}
                  placeholder="e.g. Python, React"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>LOCATION</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 30, fontSize: 12 }}
                  placeholder="e.g. Remote, San Francisco"
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SKILLS (COMMA SEP)</label>
              <input
                className="input-field"
                style={{ fontSize: 12 }}
                placeholder="React, TypeScript, FastAPI"
                value={skillsFilter}
                onChange={e => setSkillsFilter(e.target.value)}
              />
            </div>

            {/* Platform Source */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>JOB PLATFORM</label>
              <select
                className="input-field"
                style={{ fontSize: 12, height: 38 }}
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
              >
                <option value="All">All Platforms</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Indeed">Indeed</option>
                <option value="Naukri">Naukri</option>
                <option value="Wellfound">Wellfound</option>
                <option value="Internshala">Internshala</option>
                <option value="Glassdoor">Glassdoor</option>
                <option value="Company Career Pages">Company Pages</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MAX EXPERIENCE REQUIRED</label>
              <select
                className="input-field"
                style={{ fontSize: 12, height: 38 }}
                value={expFilter}
                onChange={e => setExpFilter(e.target.value)}
              >
                <option value="">Any Experience</option>
                <option value="0">Internship / Entry (0 yrs)</option>
                <option value="2">Junior (Up to 2 yrs)</option>
                <option value="5">Mid-Senior (Up to 5 yrs)</option>
                <option value="10">Senior / Lead (Up to 10 yrs)</option>
              </select>
            </div>

            {/* Min Salary */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MIN SALARY (ANNUAL USD)</label>
              <select
                className="input-field"
                style={{ fontSize: 12, height: 38 }}
                value={minSalaryFilter}
                onChange={e => setMinSalaryFilter(e.target.value)}
              >
                <option value="">Any Salary</option>
                <option value="50000">$50,000+</option>
                <option value="80000">$80,000+</option>
                <option value="120000">$120,000+</option>
                <option value="160000">$160,000+</option>
              </select>
            </div>

            <button type="submit" className="btn btn-sm" style={{ width: '100%', marginTop: 8 }}>
              Apply Filters
            </button>
          </form>
        </div>

        {/* Listings display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active search filters summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Found <strong>{total}</strong> active openings matching query
            </span>
          </div>

          {/* Jobs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel" style={{ padding: 24, height: 210, opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
              ))
            ) : jobs.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: 'span 2', padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Briefcase size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No Vacancies Found</h3>
                <p style={{ marginTop: 4, fontSize: 13 }}>Try expanding your search query or reset filters.</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    {/* Source and Status row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className={`badge ${PLATFORM_BADGE[job.source] || 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {job.source}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Added {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title & Company */}
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{job.title}</h3>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{job.company}</div>
                  </div>

                  {/* Location, Experience & Salary stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} style={{ color: 'var(--accent-purple)' }} />
                      <span>{job.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={13} style={{ color: 'var(--accent-blue)' }} />
                      <span>{job.experience_required}+ yrs experience</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, gridColumn: 'span 2' }}>
                      <DollarSign size={13} style={{ color: 'var(--accent-green)' }} />
                      <span style={{ fontWeight: 600 }}>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                    </div>
                  </div>

                  {/* Skills required tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {job.skills_required && JSON.parse(job.skills_required).map((skill, i) => (
                      <span key={i} className="badge badge-skill" style={{ fontSize: 10 }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Description snippet */}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 34 }}>
                    {job.description}
                  </p>

                  <div className="divider" style={{ margin: 0 }} />

                  {/* Actions buttons */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                    <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <ExternalLink size={12} /> Apply Link
                    </a>
                    <button 
                      className="btn btn-sm" 
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onClick={() => onMatchCandidates({ id: job.id, title: job.title, desc: job.description })}
                    >
                      <UserCheck size={12} /> Match Candidates
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <button className="btn btn-secondary btn-sm btn-icon" disabled={page <= 1} onClick={() => fetchJobs(page - 1)}>
                Prev
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm btn-icon" disabled={page >= totalPages} onClick={() => fetchJobs(page + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
