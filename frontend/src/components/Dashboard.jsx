import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  Users, UserCheck, UserX, Award, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, Download,
  RefreshCw, Eye, Trash2, ChevronLeft, ChevronRight, BarChart2,
} from 'lucide-react';
import { SkeletonStatCard } from './Skeleton';
import { useToast } from './Toast';

const PIE_COLORS  = ['#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4'];

// SortIcon must be defined OUTSIDE of any component to avoid remounting on each render
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={13} style={{ opacity: 0.4 }} />;
  return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
}

const STATUS_BADGE = {
  Shortlisted: 'badge-green',
  Rejected:    'badge-red',
  Pending:     'badge-gray',
  Interview:   'badge-blue',
  Offer:       'badge-purple',
};

const REC_BADGE = {
  'Highly Recommended': 'badge-green',
  'Recommended':        'badge-blue',
  'Consider':           'badge-yellow',
  'Not Recommended':    'badge-red',
};

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Dashboard({ candidates, onViewCandidate, onRefresh, backendUrl }) {
  const { addToast } = useToast();

  const [analytics, setAnalytics]   = useState(null);
  const [loading, setLoading]        = useState(true);

  // Table state
  const [search, setSearch]          = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minScore, setMinScore]      = useState(0);
  const [sortField, setSortField]    = useState('overall_score');
  const [sortDir, setSortDir]        = useState('desc');
  const [page, setPage]              = useState(1);
  const PAGE_SIZE = 10;

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const res  = await fetch(`${backendUrl}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Delete candidate
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${backendUrl}/candidates/${id}`, { method: 'DELETE' });
      onRefresh?.();
      fetchAnalytics();
      addToast(`${name} deleted.`, 'success');
    } catch {
      addToast('Failed to delete candidate.', 'error');
    }
  };

  // Export all CSV
  const handleExportAll = () => {
    window.open(`${backendUrl}/export-all`, '_blank');
    addToast('Downloading all candidates CSV…', 'info');
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Filtered + sorted candidates
  const filtered = useMemo(() => {
    let list = [...candidates];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.recommendation?.toLowerCase().includes(q) ||
        JSON.stringify(c.parsed_data?.Skills || []).toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') list = list.filter(c => c.status === statusFilter);
    if (minScore > 0) list = list.filter(c => c.overall_score >= minScore);

    list.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [candidates, search, statusFilter, minScore, sortField, sortDir]);

  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Recruitment Dashboard</h1>
          <p className="page-subtitle">AI-powered talent pipeline and analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { onRefresh?.(); fetchAnalytics(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-sm" onClick={handleExportAll}>
            <Download size={14} /> Export All CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {loading ? (
          [1,2,3,4].map(i => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard icon={<Users size={22} />} label="Total Candidates" value={analytics?.total ?? 0} color="var(--accent-purple)" bg="rgba(139,92,246,0.12)" />
            <StatCard icon={<UserCheck size={22} />} label="Shortlisted" value={analytics?.shortlisted ?? 0} color="var(--accent-green)" bg="rgba(16,185,129,0.12)" />
            <StatCard icon={<UserX size={22} />} label="Rejected" value={analytics?.rejected ?? 0} color="var(--accent-red)" bg="rgba(239,68,68,0.12)" />
            <StatCard icon={<Award size={22} />} label="Avg AI Score" value={`${analytics?.avg_score ?? 0}/100`} color="var(--accent-blue)" bg="rgba(59,130,246,0.12)" />
          </>
        )}
      </div>

      {/* Charts Row */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Top Skills */}
          <div className="glass-panel" style={{ padding: 24, gridColumn: 'span 2' }}>
            <h3 className="card-title"><BarChart2 size={16} /> Top Skills in Talent Pool</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.top_skills} layout="vertical" margin={{ left: 60, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="skill" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" radius={[0, 5, 5, 0]} fill="url(#barGrad)" maxBarSize={18} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline Donut */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 className="card-title"><Users size={16} /> Pipeline Status</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.status_breakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {analytics.status_breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score Distribution */}
          <div className="glass-panel" style={{ padding: 24, gridColumn: 'span 3' }}>
            <h3 className="card-title">Score Distribution</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.score_distribution} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="range" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        {/* Table Header + Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <Users size={16} /> Candidates
            <span className="badge badge-gray" style={{ marginLeft: 8, fontSize: 11 }}>{filtered.length}</span>
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="input-field"
                style={{ paddingLeft: 32, width: 220 }}
                placeholder="Search name, skill…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {/* Status Filter */}
            <select
              className="input-field"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {['All', 'Pending', 'Shortlisted', 'Interview', 'Offer', 'Rejected'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {/* Min Score */}
            <select
              className="input-field"
              style={{ width: 140 }}
              value={minScore}
              onChange={e => { setMinScore(Number(e.target.value)); setPage(1); }}
            >
              <option value={0}>All Scores</option>
              <option value={40}>40+ Score</option>
              <option value={60}>60+ Score</option>
              <option value={80}>80+ Score</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('name')}>Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} /></th>
                <th onClick={() => toggleSort('overall_score')}>Score <SortIcon field="overall_score" sortField={sortField} sortDir={sortDir} /></th>
                <th onClick={() => toggleSort('recommendation')}>Recommendation <SortIcon field="recommendation" sortField={sortField} sortDir={sortDir} /></th>
                <th onClick={() => toggleSort('status')}>Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></th>
                <th>Skills Preview</th>
                <th onClick={() => toggleSort('created_at')}>Added <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    {candidates.length === 0
                      ? '📂 No candidates yet. Upload a resume to get started.'
                      : '🔍 No candidates match your filters.'}
                  </td>
                </tr>
              ) : paginated.map(c => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  onView={() => onViewCandidate(c.id)}
                  onDelete={() => handleDelete(c.id, c.name)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary btn-sm btn-icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-secondary btn-sm btn-icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="glass-panel stat-card">
      <div className="stat-icon" style={{ backgroundColor: bg, color }}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

// ── Candidate Row ───────────────────────────────────────────────────────────
function CandidateRow({ candidate: c, onView, onDelete }) {
  const skills = (c.parsed_data?.Skills || []).slice(0, 3);
  const scoreColor = c.overall_score >= 80 ? 'var(--accent-green)'
    : c.overall_score >= 60 ? 'var(--accent-blue)'
    : c.overall_score >= 40 ? 'var(--accent-yellow)'
    : 'var(--accent-red)';

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.email || c.filename}</div>
      </td>
      <td>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: scoreColor,
        }}>{c.overall_score}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
      </td>
      <td>
        <span className={`badge ${REC_BADGE[c.recommendation] || 'badge-gray'}`}>{c.recommendation || '—'}</span>
      </td>
      <td>
        <span className={`badge ${STATUS_BADGE[c.status] || 'badge-gray'}`}>{c.status}</span>
      </td>
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {skills.map((s, i) => <span key={i} className="badge badge-skill">{s}</span>)}
          {(c.parsed_data?.Skills?.length || 0) > 3 && (
            <span className="badge badge-gray">+{c.parsed_data.Skills.length - 3}</span>
          )}
        </div>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onView} title="View Profile"><Eye size={14} /></button>
          <button className="btn btn-danger btn-sm btn-icon" onClick={onDelete} title="Delete"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}
