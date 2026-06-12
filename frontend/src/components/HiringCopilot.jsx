import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Sparkles, User, RefreshCw, Trophy,
  Award, CheckCircle, Mail, Phone, MapPin, ArrowRight, Compass
} from 'lucide-react';
import { useToast } from './Toast';

export default function HiringCopilot({ backendUrl, onViewCandidate }) {
  const { addToast } = useToast();
  
  // State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "Hello! I am your Hiring Copilot. You can ask me search questions about our candidate database in plain English, and I will find the best talent. For example:",
      isWelcome: true
    }
  ]);

  const messagesEndRef = useRef(null);

  // Suggested Prompts
  const PRESETS = [
    "Show best React developers",
    "Find candidates with AWS certification",
    "Who matches this JD above 80%?",
    "Show candidates with leadership experience"
  ];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submitQuery = async (queryText) => {
    if (!queryText.trim() || loading) return;

    // Add User Message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText
    };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      // Add Copilot Message
      const copilotMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'copilot',
        text: data.answer,
        candidates: data.candidates || []
      };
      setMessages(prev => [...prev, copilotMsg]);
    } catch {
      addToast('Error querying Hiring Copilot backend.', 'error');
      // Error fallback message
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'copilot',
          text: "I'm sorry, I encountered an issue querying the database. Please verify the backend service is running and try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    submitQuery(query);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 20px', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Info */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare style={{ color: 'var(--accent)' }} size={26} /> Hiring Copilot Chat
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          Perform conversational lookups over candidate skills, certifications, scores, and job history.
        </p>
      </div>

      {/* Main Chat Box Container */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        
        {/* Messages Thread list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 10px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              {/* Bubble wrapper */}
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.5,
                  background: msg.sender === 'user' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)',
                  color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {/* Text content */}
                <div style={{ fontWeight: msg.isWelcome ? 500 : 'normal' }}>
                  {msg.text}
                </div>

                {/* Preset Suggestions inside welcome bubble */}
                {msg.isWelcome && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {PRESETS.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        className="btn btn-sm"
                        style={{
                          margin: 0,
                          fontSize: 11,
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 20,
                          padding: '4px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        onClick={() => submitQuery(p)}
                        disabled={loading}
                      >
                        <Compass size={12} /> {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Candidates Grid Card Lists inside Copilot messages */}
              {msg.candidates && msg.candidates.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 12,
                    width: '100%',
                    maxWidth: 720,
                    marginTop: 12,
                    paddingLeft: 4
                  }}
                >
                  {msg.candidates.map((cand) => (
                    <div
                      key={cand.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        transition: 'transform 0.2s',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div>
                        {/* Name and general compatibility score */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}>{cand.name}</span>
                          <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>
                            {cand.overall_score}% Match
                          </span>
                        </div>

                        {/* Location */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                          <MapPin size={11} /> {cand.location}
                        </div>

                        {/* Matched Reason */}
                        <div
                          style={{
                            fontSize: 12,
                            marginTop: 8,
                            padding: '6px 8px',
                            background: 'rgba(13, 148, 136, 0.05)',
                            borderLeft: '2px solid var(--success)',
                            borderRadius: '0 4px 4px 0',
                            color: 'var(--text-main)'
                          }}
                        >
                          {cand.matched_reason}
                        </div>

                        {/* Tech skills list */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {cand.skills.map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 9,
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Jump navigation trigger */}
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{
                          width: '100%',
                          margin: 0,
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          padding: '6px'
                        }}
                        onClick={() => onViewCandidate(cand.id)}
                      >
                        View Full Insights <ArrowRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Copilot is matching candidates</span>
                <span className="spin" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <RefreshCw size={12} style={{ color: 'var(--accent)' }} />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset Suggestions Quick Bar */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 4 }}>
            Try Asking:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              className="btn btn-sm"
              style={{
                margin: 0,
                fontSize: 11,
                borderRadius: 16,
                padding: '4px 12px',
                background: 'none',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border-color)'
              }}
              onClick={() => submitQuery(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input box form */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.15)',
            display: 'flex',
            gap: 12,
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, height: 42, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}
            placeholder="Search candidates... (e.g. 'Show best React developers')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              height: 42,
              width: 42,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              margin: 0
            }}
            disabled={loading || !query.trim()}
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
}
