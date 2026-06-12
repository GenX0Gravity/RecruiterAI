import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Upload, Trophy, Scale, Brain,
  Sun, Moon, ChevronRight, BarChart3, Users, Briefcase, TrendingUp, Award, Sparkles, MessageSquare, Columns, ShieldAlert
} from 'lucide-react';

import { ToastProvider } from './components/Toast';
import Dashboard       from './components/Dashboard';
import UploadSection   from './components/UploadSection';
import InsightsPage    from './components/InsightsPage';
import Leaderboard     from './components/Leaderboard';
import FairnessAnalyzer from './components/FairnessAnalyzer';
import JobIntelligence from './components/JobIntelligence';
import InterviewAssistant from './components/InterviewAssistant';
import SkillGapAnalyzer from './components/SkillGapAnalyzer';
import MarketIntelligence from './components/MarketIntelligence';
import CareerGrowthPredictor from './components/CareerGrowthPredictor';
import ResumeEnhancer from './components/ResumeEnhancer';
import HiringCopilot from './components/HiringCopilot';
import RecruitmentCRM from './components/RecruitmentCRM';
import ResumeVerification from './components/ResumeVerification';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab]             = useState('dashboard');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidates, setCandidates]           = useState([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [theme, setTheme]                     = useState(() => localStorage.getItem('ats-theme') || 'dark');
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [matcherInitialData, setMatcherInitialData] = useState({ title: '', desc: '' });

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ats-theme', theme);
  }, [theme]);

  const fetchCandidates = useCallback(async (page = 1, pageSize = 50) => {
    try {
      const res  = await fetch(`${BACKEND_URL}/candidates?page=${page}&page_size=${pageSize}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
      setTotalCandidates(data.total || 0);
    } catch { /* backend offline */ }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleParseSuccess = (data) => {
    fetchCandidates();
    setSelectedCandidateId(data.id);
    setActiveTab('insights');
  };

  const handleViewCandidate = (id) => {
    setSelectedCandidateId(id);
    setActiveTab('insights');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
                 candidates={candidates}
                 totalCandidates={totalCandidates}
                 onViewCandidate={handleViewCandidate}
                 onRefresh={fetchCandidates}
                 backendUrl={BACKEND_URL}
               />;
      case 'upload':
        return <UploadSection onParseSuccess={handleParseSuccess} backendUrl={BACKEND_URL} />;
      case 'insights':
        return <InsightsPage
                 candidateId={selectedCandidateId}
                 onBack={() => setActiveTab('dashboard')}
                 backendUrl={BACKEND_URL}
               />;
      case 'leaderboard':
        return <Leaderboard
                 backendUrl={BACKEND_URL}
                 initialJob={matcherInitialData}
                 onViewCandidate={handleViewCandidate}
               />;
      case 'jobs':
        return <JobIntelligence 
                 backendUrl={BACKEND_URL} 
                 onMatchCandidates={(jobInfo) => {
                   setMatcherInitialData(jobInfo);
                   setActiveTab('leaderboard');
                 }}
               />;
      case 'interview':
        return <InterviewAssistant backendUrl={BACKEND_URL} />;
      case 'skill_gap':
        return <SkillGapAnalyzer backendUrl={BACKEND_URL} />;
      case 'career_growth':
        return <CareerGrowthPredictor backendUrl={BACKEND_URL} />;
      case 'market_intel':
        return <MarketIntelligence backendUrl={BACKEND_URL} />;
      case 'fairness':
        return <FairnessAnalyzer candidates={candidates} backendUrl={BACKEND_URL} />;
      case 'resume_enhancer':
        return <ResumeEnhancer backendUrl={BACKEND_URL} />;
      case 'copilot':
        return <HiringCopilot backendUrl={BACKEND_URL} onViewCandidate={handleViewCandidate} />;
      case 'crm':
        return <RecruitmentCRM backendUrl={BACKEND_URL} />;
      case 'verification':
        return <ResumeVerification backendUrl={BACKEND_URL} />;
      default:
        return null;
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard',   label: 'Dashboard',      icon: <LayoutDashboard size={18} />, badge: totalCandidates > 0 ? totalCandidates : null },
    { id: 'upload',      label: 'Upload Resume',  icon: <Upload size={18} /> },
    { id: 'leaderboard', label: 'Leaderboard',    icon: <Trophy size={18} /> },
    { id: 'jobs',        label: 'Job Intelligence', icon: <Briefcase size={18} /> },
    { id: 'market_intel',label: 'Market Intel',   icon: <TrendingUp size={18} /> },
    { id: 'interview',   label: 'Interview AI',   icon: <Brain size={18} /> },
    { id: 'skill_gap',   label: 'Skill Gap',      icon: <BarChart3 size={18} /> },
    { id: 'career_growth',label: 'Career Growth', icon: <Award size={18} /> },
    { id: 'resume_enhancer', label: 'Resume Enhancer', icon: <Sparkles size={18} /> },
    { id: 'copilot',     label: 'Hiring Copilot',  icon: <MessageSquare size={18} /> },
    { id: 'crm',         label: 'CRM Pipeline',    icon: <Columns size={18} /> },
    { id: 'verification', label: 'Verify Resumes',  icon: <ShieldAlert size={18} /> },
    { id: 'fairness',    label: 'Bias Assessment',icon: <Scale size={18} /> },
  ];

  return (
    <ToastProvider>
      <div className="app-shell">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          {/* Logo */}
          <div style={{ padding: '0 16px', marginBottom: 28 }}>
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">ATS</div>
              <span style={{ fontSize: 17 }}>RecruitAI</span>
            </div>
          </div>

          {/* Nav */}
          <div className="sidebar-section-label">Navigation</div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge != null && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer — theme toggle */}
          <div className="sidebar-footer">
            <button
              className="sidebar-item"
              style={{ width: '100%' }}
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark'
                ? <><Sun size={16} /> Light Mode</>
                : <><Moon size={16} /> Dark Mode</>
              }
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="main-content">
          {/* Mobile top bar */}
          <div style={{ display: 'none' }} className="mobile-topbar">
            <button className="btn-icon btn-secondary" onClick={() => setSidebarOpen(true)}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="fade-in" key={activeTab}>
            {renderContent()}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
