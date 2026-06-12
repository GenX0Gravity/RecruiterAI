import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Building2, Users, DollarSign, TrendingUp, BarChart3,
  MapPin, SlidersHorizontal, RefreshCw, Sparkles, HelpCircle, Info,
  Mail, Phone, ExternalLink, Award, FileText, ChevronRight, User
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, Legend, CartesianGrid, AreaChart, Area
} from 'recharts';
import { useToast } from './Toast';

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

export default function MarketIntelligence({ backendUrl }) {
  const { addToast } = useToast();

  // Dashboard Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/jobs/market-intelligence`);
      const resData = await res.json();
      setData(resData);
    } catch {
      addToast('Failed to load recruitment market intelligence metrics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, addToast]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  const handleContactRecruiter = (email, name) => {
    navigator.clipboard.writeText(email);
    addToast(`Copied ${name}'s email (${email}) to clipboard!`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={28} style={{ color: 'var(--accent-purple)' }} /> Market Intelligence
          </h1>
          <p className="page-subtitle">Real-time aggregate data on salary distributions, hiring speed, and skill demand matrices</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchIntelligence}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Stats
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 86, opacity: 0.4 }} />
            ))}
          </div>
          <div className="glass-panel" style={{ height: 350, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
        </div>
      )}

      {data && !loading && (
        <>
          {/* KPI Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)' }}>
                <Briefcase size={22} />
              </div>
              <div>
                <div className="stat-label">Total Open Positions</div>
                <div className="stat-value">{data.total_openings}</div>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)' }}>
                <Building2 size={22} />
              </div>
              <div>
                <div className="stat-label">Hiring Companies</div>
                <div className="stat-value">{data.active_companies_count}</div>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)' }}>
                <Users size={22} />
              </div>
              <div>
                <div className="stat-label">Active Recruiters</div>
                <div className="stat-value">{data.active_recruiters_count}</div>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(236,72,153,0.12)', color: 'var(--accent-pink)' }}>
                <DollarSign size={22} />
              </div>
              <div>
                <div className="stat-label">Salary Benchmark</div>
                <div className="stat-value" style={{ fontSize: 18, fontWeight: 800 }}>$85k - $160k</div>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: 1, gap: 10 }}>
            {[
              { id: 'overview', label: 'Market Overview' },
              { id: 'companies', label: 'Company Rankings' },
              { id: 'salaries', label: 'Salary Curves' },
              { id: 'skills', label: 'Skill Demand Matrix' },
              { id: 'recruiters', label: 'Recruiter Directory' }
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid var(--accent-purple)' : '3px solid transparent',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 700,
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Render based on Active Tab */}
          <div className="fade-in">
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24 }}>
                {/* Visual Openings by Platform (Bar Chart) */}
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 className="card-title" style={{ marginBottom: 20 }}>Hiring Share by Platform</h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.keys(data.company_rankings).map(key => {
                        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
                        const item = data.company_rankings[key];
                        return {
                          name: item.company,
                          openings: item.openings,
                          fill: colors[key % colors.length]
                        };
                      })}>
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                        <Bar dataKey="openings" radius={[5, 5, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Geographical Openings Density Heatmap */}
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 className="card-title" style={{ marginBottom: 16 }}>Geographical Hotspots</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {data.location_heatmap.map((loc, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} style={{ color: 'var(--accent-purple)' }} /> {loc.location}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{loc.openings} open positions</span>
                        </div>
                        {/* Density percentage indicator bar */}
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${loc.intensity}%`,
                              background: 'var(--gradient-primary)'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'companies' && (
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="card-title" style={{ marginBottom: 18 }}>Top Hiring Companies & Velocity</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Company</th>
                      <th>Open Roles</th>
                      <th>Hiring Velocity</th>
                      <th>Hiring Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.company_rankings.map((company) => {
                      const velocityColor = company.velocity.includes('Fast') ? 'var(--accent-green)'
                        : company.velocity.includes('Medium') ? 'var(--accent-blue)' : 'var(--accent-yellow)';
                      return (
                        <tr key={company.rank}>
                          <td style={{ fontWeight: 700, color: company.rank <= 3 ? 'var(--accent-yellow)' : 'inherit' }}>
                            #{company.rank}
                          </td>
                          <td style={{ fontWeight: 600 }}>{company.company}</td>
                          <td>
                            <span className="badge badge-purple" style={{ fontSize: 11 }}>
                              {company.openings} active listings
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{ background: `${velocityColor}15`, color: velocityColor, borderColor: `${velocityColor}20` }}>
                              {company.velocity}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{company.frequency}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'salaries' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24 }}>
                {/* Salaries Area chart */}
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 className="card-title" style={{ marginBottom: 20 }}>Salary Trajectory by Technical Role</h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.salary_trends} margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="role" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="avg_min_usd" name="Avg Min Salary" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
                        <Area type="monotone" dataKey="avg_max_usd" name="Avg Max Salary" stroke="#8b5cf6" fill="rgba(139,92,246,0.1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Salary list summaries */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 className="card-title">Salary Benchmarks</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.salary_trends.map((item, idx) => (
                      <div key={idx} className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{item.role}</span>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Based on {item.count} postings</p>
                        </div>
                        <strong style={{ color: 'var(--accent-green)', fontSize: 13 }}>
                          ${(item.avg_min_usd / 1000).toFixed(0)}k - ${(item.avg_max_usd / 1000).toFixed(0)}k
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24 }}>
                {/* Horizontal Bar Chart of Skill requests */}
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 className="card-title" style={{ marginBottom: 20 }}>Most Requested Tech Skills</h3>
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.skill_demand_trends} layout="vertical" margin={{ left: 15, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="skill" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="percentage" name="Request Frequency (%)" fill="var(--accent-purple)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 5x5 Custom CSS Grid Correlation Heatmap */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
                  <h3 className="card-title" style={{ marginBottom: 8 }}>Role vs. Tech Affinity Heatmap</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Purple intensity represents skill frequency overlap affinity.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: 450, margin: '0 auto' }}>
                    {/* Heatmap header cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>
                      <div style={{ textAlign: 'left' }}>Role Type</div>
                      {data.matrix_skills_header.map(skill => (
                        <div key={skill} style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{skill}</div>
                      ))}
                    </div>

                    {/* Heatmap Rows */}
                    {data.heatmap_matrix.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: 4, alignItems: 'center' }}>
                        {/* Row Header Label */}
                        <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={row.role}>
                          {row.role}
                        </div>

                        {/* Affinity Cells */}
                        {data.matrix_skills_header.map(skill => {
                          const val = row[skill];
                          // Color matching background opacity
                          const cellBg = `rgba(139, 92, 246, ${val})`;
                          // text color: white if background is dark, muted if transparent
                          const textColor = val > 0.6 ? '#ffffff' : 'var(--text-secondary)';

                          return (
                            <div
                              key={skill}
                              style={{
                                height: 36,
                                background: cellBg,
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 800,
                                color: textColor,
                                border: '1px solid rgba(255, 255, 255, 0.02)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                cursor: 'help'
                              }}
                              title={`${row.role} matches ${skill}: ${Math.round(val * 100)}% affinity`}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.4)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {Math.round(val * 100)}%
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recruiters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 className="card-title">Recruiter Active Directory</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                  {data.recruiters.map((rec, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Recruiter header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center' }}>
                          <User size={20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700 }}>{rec.name}</h4>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>{rec.title} @ <strong>{rec.company}</strong></span>
                        </div>
                      </div>

                      {/* Recruiter details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Active Vacancies:</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>{rec.postings} listings</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Response Speed:</span>
                          <strong style={{ color: 'var(--accent-green)' }}>{rec.response_velocity}</strong>
                        </div>
                      </div>

                      {/* Contact button */}
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                        onClick={() => handleContactRecruiter(rec.contact, rec.name)}
                      >
                        <Mail size={12} /> Contact Recruiter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
