import { useState, useEffect, useCallback } from 'react';
import {
  Columns, User, ArrowLeft, ArrowRight, Calendar, Plus, Trash2,
  Mail, MessageSquare, Send, CheckCircle2, Award, Clock, RefreshCw,
  X, Tag, UserCheck, ShieldAlert, FileText, Bookmark
} from 'lucide-react';
import { useToast } from './Toast';

const STAGES = ["Applied", "Screening", "Interview", "Assessment", "Offer", "Hired", "Rejected"];

const STAGE_COLORS = {
  "Applied": { bg: "rgba(59, 130, 246, 0.1)", border: "#3b82f6", text: "#60a5fa" },
  "Screening": { bg: "rgba(168, 85, 247, 0.1)", border: "#a855f7", text: "#c084fc" },
  "Interview": { bg: "rgba(236, 72, 153, 0.1)", border: "#ec4899", text: "#f472b6" },
  "Assessment": { bg: "rgba(245, 158, 11, 0.1)", border: "#f59e0b", text: "#fbbf24" },
  "Offer": { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981", text: "#34d399" },
  "Hired": { bg: "rgba(13, 148, 136, 0.15)", border: "#0d9488", text: "#2dd4bf" },
  "Rejected": { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", text: "#f87171" }
};

export default function RecruitmentCRM({ backendUrl }) {
  const { addToast } = useToast();

  // Kanban Pipeline State
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(false);

  // Detail Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'tags' | 'interviews' | 'emails'

  // Input states inside Modal
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newInterview, setNewInterview] = useState({ title: '', date: '', notes: '' });
  const [newEmail, setNewEmail] = useState({ subject: '', body: '', sender: 'recruiter@recruitai.com' });

  // Fetch Pipeline Grouping
  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/crm/pipeline`);
      if (!res.ok) throw new Error('API pipeline error');
      const data = await res.json();
      setPipeline(data);
    } catch {
      addToast('Failed to load Recruitment pipeline.', 'error');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, addToast]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Transition stage candidate
  const handleTransition = async (candId, currentStage, direction) => {
    const currentIndex = STAGES.indexOf(currentStage);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= STAGES.length) return;

    const nextStage = STAGES[nextIndex];
    try {
      const res = await fetch(`${backendUrl}/crm/candidates/${candId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStage })
      });
      if (!res.ok) throw new Error();
      
      addToast(`Moved candidate to ${nextStage}`, 'success');
      fetchPipeline();
      
      // If modal is open for this candidate, update its details
      if (selectedCandidate && selectedCandidate.id === candId) {
        setSelectedCandidate(prev => ({ ...prev, status: nextStage }));
      }
    } catch {
      addToast('Failed to update candidate pipeline stage.', 'error');
    }
  };

  // Open Details Modal and fetch full logs
  const openDetails = async (candId) => {
    setModalLoading(true);
    setModalOpen(true);
    setActiveTab('notes');
    try {
      const res = await fetch(`${backendUrl}/crm/candidates/${candId}/details`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedCandidate(data);
    } catch {
      addToast('Failed to retrieve candidate logs.', 'error');
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  // Add Note
  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/crm/candidates/${selectedCandidate.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });
      if (!res.ok) throw new Error();
      const note = await res.json();
      
      setSelectedCandidate(prev => ({
        ...prev,
        notes: [note, ...prev.notes]
      }));
      setNewNote('');
      addToast('Note added successfully', 'success');
      fetchPipeline(); // update note count in kanban
    } catch {
      addToast('Failed to add note.', 'error');
    }
  };

  // Delete Note
  const deleteNote = async (noteId) => {
    try {
      const res = await fetch(`${backendUrl}/crm/notes/${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      
      setSelectedCandidate(prev => ({
        ...prev,
        notes: prev.notes.filter(n => n.id !== noteId)
      }));
      addToast('Note deleted', 'success');
      fetchPipeline();
    } catch {
      addToast('Failed to delete note.', 'error');
    }
  };

  // Add Tag
  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/crm/candidates/${selectedCandidate.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTag.trim() })
      });
      if (!res.ok) throw new Error();
      const tag = await res.json();
      
      setSelectedCandidate(prev => {
        const exists = prev.tags.some(t => t.name.toLowerCase() === tag.name.toLowerCase());
        return {
          ...prev,
          tags: exists ? prev.tags : [...prev.tags, tag]
        };
      });
      setNewTag('');
      addToast('Tag added', 'success');
      fetchPipeline();
    } catch {
      addToast('Failed to add tag.', 'error');
    }
  };

  // Delete Tag
  const deleteTag = async (tagId) => {
    try {
      const res = await fetch(`${backendUrl}/crm/tags/${tagId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      
      setSelectedCandidate(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t.id !== tagId)
      }));
      addToast('Tag removed', 'success');
      fetchPipeline();
    } catch {
      addToast('Failed to remove tag.', 'error');
    }
  };

  // Schedule Interview
  const scheduleInterview = async (e) => {
    e.preventDefault();
    if (!newInterview.title || !newInterview.date) {
      addToast('Please input title and scheduled date.', 'warning');
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/crm/candidates/${selectedCandidate.id}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newInterview.title,
          scheduled_at: newInterview.date,
          notes: newInterview.notes
        })
      });
      if (!res.ok) throw new Error();
      const item = await res.json();
      
      setSelectedCandidate(prev => ({
        ...prev,
        interviews: [...prev.interviews, item]
      }));
      setNewInterview({ title: '', date: '', notes: '' });
      addToast('Interview scheduled', 'success');
      fetchPipeline();
    } catch {
      addToast('Failed to schedule interview.', 'error');
    }
  };

  // Send Email Log
  const sendEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.subject || !newEmail.body) {
      addToast('Please complete subject and body content.', 'warning');
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/crm/candidates/${selectedCandidate.id}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newEmail.subject,
          body: newEmail.body,
          sender: newEmail.sender
        })
      });
      if (!res.ok) throw new Error();
      const item = await res.json();
      
      setSelectedCandidate(prev => ({
        ...prev,
        emails: [item, ...prev.emails]
      }));
      setNewEmail(prev => ({ ...prev, subject: '', body: '' }));
      addToast('Recruiter email logged', 'success');
    } catch {
      addToast('Failed to log email communication.', 'error');
    }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Columns style={{ color: 'var(--accent)' }} size={26} /> Recruitment CRM Board
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          Manage hiring funnel stages, schedule coding/screening assessments, log recruiter notes, and view candidate email transcripts.
        </p>
      </div>

      {/* Kanban Board Area */}
      <div style={{ flex: 1, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
        {STAGES.map(stage => {
          const cards = pipeline[stage] || [];
          const colorset = STAGE_COLORS[stage];
          
          return (
            <div
              key={stage}
              style={{
                flex: '0 0 280px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
                padding: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `2px solid ${colorset.border}`,
                  paddingBottom: 8,
                  marginBottom: 12
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13, color: colorset.text }}>
                  {stage.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 750,
                    background: colorset.bg,
                    color: colorset.text,
                    border: `1px solid ${colorset.border}`,
                    borderRadius: 10,
                    padding: '2px 8px'
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Card List Container */}
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cards.map(cand => (
                  <div
                    key={cand.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'background 0.2s, transform 0.1s'
                    }}
                  >
                    {/* Candidate Name & overall score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <span
                        style={{ fontWeight: 650, fontSize: 13, color: 'var(--text-main)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => openDetails(cand.id)}
                      >
                        {cand.name}
                      </span>
                      <span className="badge badge-secondary" style={{ fontSize: 9, padding: '1px 5px' }}>
                        {cand.overall_score}%
                      </span>
                    </div>

                    {/* Metadata counters */}
                    <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: 11 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <Clock size={11} /> {cand.interviews_count} Int
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <FileText size={11} /> {cand.notes_count} Notes
                      </span>
                    </div>

                    {/* Tags list */}
                    {cand.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {cand.tags.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              fontSize: 9,
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-muted)',
                              padding: '1px 5px',
                              borderRadius: 4,
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Transition actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 6, marginTop: 4 }}>
                      <button
                        className="btn-icon btn-secondary"
                        style={{ padding: 4, height: 'auto', width: 'auto', opacity: STAGES.indexOf(stage) > 0 ? 1 : 0.3 }}
                        onClick={() => handleTransition(cand.id, stage, -1)}
                        disabled={STAGES.indexOf(stage) === 0}
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>Move Stage</span>
                      <button
                        className="btn-icon btn-secondary"
                        style={{ padding: 4, height: 'auto', width: 'auto', opacity: STAGES.indexOf(stage) < STAGES.length - 1 ? 1 : 0.3 }}
                        onClick={() => handleTransition(cand.id, stage, 1)}
                        disabled={STAGES.indexOf(stage) === STAGES.length - 1}
                      >
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: 11, color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 8 }}>
                    Column Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CRM Details Modal / Dialog */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '90%',
              maxWidth: 750,
              height: '80%',
              maxHeight: 600,
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} style={{ color: 'var(--accent)' }} /> {selectedCandidate?.name || 'Loading Candidate...'}
                </h2>
                <span className="badge badge-success" style={{ fontSize: 11 }}>
                  Stage: {selectedCandidate?.status}
                </span>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body (tabs & lists) */}
            {modalLoading || !selectedCandidate ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RefreshCw className="spin" size={18} />
                  <span>Loading full candidate profile history...</span>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Vertical Tab navigation */}
                <div style={{ width: '25%', borderRight: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                  <button
                    className={`sidebar-item ${activeTab === 'notes' ? 'active' : ''}`}
                    style={{ width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-color)', padding: 12, justifyContent: 'flex-start' }}
                    onClick={() => setActiveTab('notes')}
                  >
                    <FileText size={16} /> Notes
                  </button>
                  <button
                    className={`sidebar-item ${activeTab === 'tags' ? 'active' : ''}`}
                    style={{ width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-color)', padding: 12, justifyContent: 'flex-start' }}
                    onClick={() => setActiveTab('tags')}
                  >
                    <Tag size={16} /> Tags
                  </button>
                  <button
                    className={`sidebar-item ${activeTab === 'interviews' ? 'active' : ''}`}
                    style={{ width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-color)', padding: 12, justifyContent: 'flex-start' }}
                    onClick={() => setActiveTab('interviews')}
                  >
                    <Calendar size={16} /> Interviews
                  </button>
                  <button
                    className={`sidebar-item ${activeTab === 'emails' ? 'active' : ''}`}
                    style={{ width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-color)', padding: 12, justifyContent: 'flex-start' }}
                    onClick={() => setActiveTab('emails')}
                  >
                    <Mail size={16} /> Emails
                  </button>
                </div>

                {/* Tab contents (scrollable) */}
                <div style={{ width: '75%', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* NOTES TAB */}
                  {activeTab === 'notes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Logged Recruiter Notes</h3>
                      
                      {/* Note add form */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <textarea
                          className="form-control"
                          style={{ flex: 1, minHeight: 46, fontSize: 13 }}
                          placeholder="Log recruiter feedback..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={addNote}>
                          Add
                        </button>
                      </div>

                      {/* Notes list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedCandidate.notes.map(n => (
                          <div key={n.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{n.content}</span>
                              <button
                                className="btn-icon btn-secondary"
                                style={{ padding: 2, height: 'auto', width: 'auto', color: 'var(--danger)' }}
                                onClick={() => deleteNote(n.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                        {selectedCandidate.notes.length === 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No recruiter notes logged.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAGS TAB */}
                  {activeTab === 'tags' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Candidate Tags</h3>
                      
                      {/* Tag Add */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ flex: 1, height: 36, fontSize: 13 }}
                          placeholder="Add new tag (e.g. 'React Developer', 'Senior')"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        />
                        <button className="btn btn-primary" style={{ height: 36 }} onClick={addTag}>
                          Add Tag
                        </button>
                      </div>

                      {/* Tags Badges grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedCandidate.tags.map(t => (
                          <span
                            key={t.id}
                            className="badge badge-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
                          >
                            {t.name}
                            <X
                              size={12}
                              style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                              onClick={() => deleteTag(t.id)}
                            />
                          </span>
                        ))}
                        {selectedCandidate.tags.length === 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tags attached to this candidate profile.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* INTERVIEWS TAB */}
                  {activeTab === 'interviews' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Schedule Interview Session</h3>

                      {/* Schedule form */}
                      <form onSubmit={scheduleInterview} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ height: 36, fontSize: 12 }}
                              placeholder="Title (e.g. 'React Technical Screen')"
                              value={newInterview.title}
                              onChange={(e) => setNewInterview(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div>
                            <input
                              type="datetime-local"
                              className="form-control"
                              style={{ height: 36, fontSize: 12 }}
                              value={newInterview.date}
                              onChange={(e) => setNewInterview(prev => ({ ...prev, date: e.target.value }))}
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: 36, fontSize: 12 }}
                          placeholder="Interview instructions/location/link..."
                          value={newInterview.notes}
                          onChange={(e) => setNewInterview(prev => ({ ...prev, notes: e.target.value }))}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', margin: 0 }}>
                          Schedule Interview
                        </button>
                      </form>

                      {/* Interviews schedule list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedCandidate.interviews.map(item => (
                          <div key={item.id} style={{ border: '1px solid var(--border-color)', padding: 12, borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>{item.title}</strong>
                              <span className="badge badge-secondary" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} /> {new Date(item.scheduled_at).toLocaleString()}
                              </span>
                            </div>
                            {item.notes && (
                              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        ))}
                        {selectedCandidate.interviews.length === 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No interviews currently scheduled.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EMAIL HISTORY TAB */}
                  {activeTab === 'emails' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Recruiter Email Logs</h3>

                      {/* Compose Email */}
                      <form onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input
                            type="text"
                            className="form-control"
                            style={{ height: 36, fontSize: 12, flex: 2 }}
                            placeholder="Subject (e.g. 'Screening Invitation')"
                            value={newEmail.subject}
                            onChange={(e) => setNewEmail(prev => ({ ...prev, subject: e.target.value }))}
                          />
                          <select
                            className="form-control"
                            style={{ height: 36, fontSize: 12, flex: 1 }}
                            value={newEmail.sender}
                            onChange={(e) => setNewEmail(prev => ({ ...prev, sender: e.target.value }))}
                          >
                            <option value="recruiter@recruitai.com">recruiter@recruitai.com</option>
                            <option value="hr@recruitai.com">hr@recruitai.com</option>
                          </select>
                        </div>
                        <textarea
                          className="form-control"
                          style={{ minHeight: 60, fontSize: 12 }}
                          placeholder="Compose mock email content..."
                          value={newEmail.body}
                          onChange={(e) => setNewEmail(prev => ({ ...prev, body: e.target.value }))}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Send size={12} /> Log Sent Email
                        </button>
                      </form>

                      {/* Email logs list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedCandidate.emails.map(item => (
                          <div key={item.id} style={{ border: '1px solid var(--border-color)', padding: 12, borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 6 }}>
                              <div>
                                <strong style={{ fontSize: 13, color: 'var(--text-main)', display: 'block' }}>{item.subject}</strong>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>From: {item.sender}</span>
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {new Date(item.sent_at).toLocaleString()}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
                              {item.body}
                            </p>
                          </div>
                        ))}
                        {selectedCandidate.emails.length === 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No outbound recruiter emails logged.</span>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
