import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Layers } from 'lucide-react';
import { useToast } from './Toast';

const ALLOWED_EXTS = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
const MAX_SIZE_MB  = 5;

export default function UploadSection({ onParseSuccess, backendUrl }) {
  const { addToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles]           = useState([]);   // [{ file, status, result }]
  const [bulkMode, setBulkMode]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef                = useRef(null);

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) { addToast(`"${f.name}" — unsupported format.`, 'warning'); return false; }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { addToast(`"${f.name}" exceeds ${MAX_SIZE_MB}MB limit.`, 'warning'); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid.map(f => ({ file: f, status: 'queued', result: null }))]);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  // ── Single parse ─────────────────────────────────────────────────────────
  const parseSingle = async (fileObj, idx) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'uploading' } : f));
    const form = new FormData();
    form.append('file', fileObj.file);

    try {
      const res  = await fetch(`${backendUrl}/parse`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.status === 'success') {
        setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'done', result: data } : f));
        addToast(`"${fileObj.file.name}" parsed successfully!`, 'success');
        onParseSuccess(data);
      } else {
        throw new Error(data.error || 'Parsing failed.');
      }
    } catch (err) {
      setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
      addToast(`Failed: ${fileObj.file.name} — ${err.message}`, 'error');
    }
  };

  // ── Bulk parse ───────────────────────────────────────────────────────────
  const parseBulk = async () => {
    const queued = files.filter(f => f.status === 'queued');
    if (!queued.length) return;
    setUploading(true);

    // Mark all as uploading
    setFiles(prev => prev.map(f => f.status === 'queued' ? { ...f, status: 'uploading' } : f));

    const form = new FormData();
    queued.forEach(q => form.append('files', q.file));

    try {
      const res  = await fetch(`${backendUrl}/bulk-parse`, { method: 'POST', body: form });
      const data = await res.json();

      // Map results back to files
      const resultMap = {};
      (data.results || []).forEach(r => { resultMap[r.filename] = r; });

      setFiles(prev => prev.map(f => {
        const r = resultMap[f.file.name];
        if (!r) return f;
        if (r.status === 'success') {
          onParseSuccess({ id: r.id }); // trigger refresh
          return { ...f, status: 'done', result: r };
        }
        return { ...f, status: 'error', error: r.error };
      }));

      addToast(`Bulk parse complete: ${data.success}/${data.total} succeeded.`,
        data.failed === 0 ? 'success' : 'warning');
    } catch (err) {
      addToast('Bulk parse failed: ' + err.message, 'error');
      setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'error', error: err.message } : f));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = async () => {
    if (bulkMode) {
      await parseBulk();
    } else {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        if (files[i].status === 'queued') await parseSingle(files[i], i);
      }
      setUploading(false);
    }
  };

  const queuedCount   = files.filter(f => f.status === 'queued').length;
  const doneCount     = files.filter(f => f.status === 'done').length;
  const errorCount    = files.filter(f => f.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Upload Resumes</h1>
        <p className="page-subtitle">AI-powered resume parsing — single or bulk processing</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className={`btn btn-sm ${!bulkMode ? '' : 'btn-secondary'}`}
          onClick={() => setBulkMode(false)}
        >
          <Upload size={14} /> Single Mode
        </button>
        <button
          className={`btn btn-sm ${bulkMode ? '' : 'btn-secondary'}`}
          onClick={() => setBulkMode(true)}
        >
          <Layers size={14} /> Bulk Mode
        </button>
      </div>

      {/* Drop Zone */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTS.join(',')}
          multiple={bulkMode}
          style={{ display: 'none' }}
          onChange={e => e.target.files?.length && addFiles(e.target.files)}
        />
        <div className="floating" style={{ fontSize: 44, marginBottom: 12, lineHeight: 1 }}>
          {bulkMode ? '📂' : '📄'}
        </div>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          {dragActive ? 'Drop it here!' : bulkMode ? 'Drop multiple resumes or click to browse' : 'Drop a resume here or click to browse'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Supports PDF, DOCX, TXT, PNG, JPG{bulkMode ? ' · Up to 20 files at once' : ' · Max 5MB'}
        </p>
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              File Queue
              {doneCount > 0 && <span className="badge badge-green" style={{ marginLeft: 8 }}>{doneCount} done</span>}
              {errorCount > 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>{errorCount} errors</span>}
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setFiles([])}>Clear All</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {files.map((item, idx) => (
              <FileQueueItem key={idx} item={item} onRemove={() => removeFile(idx)} />
            ))}
          </div>

          {/* Summary stats */}
          {files.length > 1 && (
            <div style={{ display: 'flex', gap: 20, marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{files.length}</strong></span>
              <span>Queued: <strong>{queuedCount}</strong></span>
              <span>Done: <strong style={{ color: 'var(--accent-green)' }}>{doneCount}</strong></span>
              {errorCount > 0 && <span>Errors: <strong style={{ color: 'var(--accent-red)' }}>{errorCount}</strong></span>}
            </div>
          )}

          <button
            className="btn"
            style={{ width: '100%', marginTop: 16 }}
            disabled={uploading || queuedCount === 0}
            onClick={handleUploadAll}
          >
            {uploading
              ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Processing…</>
              : <><Upload size={15} /> {bulkMode ? `Bulk Parse ${queuedCount} File${queuedCount > 1 ? 's' : ''}` : `Analyze ${queuedCount} Resume${queuedCount > 1 ? 's' : ''}`}</>
            }
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 className="card-title">How the AI Pipeline Works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { step: '01', title: 'Text Extraction', desc: 'PyMuPDF + Tesseract OCR for scanned PDFs', icon: '📤' },
            { step: '02', title: 'NLP Processing', desc: 'spaCy NER + regex pattern matching', icon: '🧠' },
            { step: '03', title: 'Skill Normalization', desc: 'Maps skills to ESCO taxonomy categories', icon: '🗺️' },
            { step: '04', title: 'AI Scoring', desc: 'Multi-dimensional 0–100 candidate score', icon: '⭐' },
            { step: '05', title: 'Storage', desc: 'Persisted in SQLite for instant retrieval', icon: '💾' },
          ].map(s => (
            <div key={s.step} style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '1px', marginBottom: 4 }}>STEP {s.step}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── File Queue Item ──────────────────────────────────────────────────────────
function FileQueueItem({ item, onRemove }) {
  const { file, status, error } = item;
  const ext  = file.name.split('.').pop().toUpperCase();
  const size = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  const STATUS_ICON = {
    queued:    <div className="badge badge-gray" style={{ fontSize: 10 }}>Queued</div>,
    uploading: <div className="spinner" style={{ width: 16, height: 16 }} />,
    done:      <CheckCircle2 size={18} color="var(--accent-green)" />,
    error:     <AlertCircle size={18} color="var(--accent-red)" />,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: status === 'error' ? 'rgba(239,68,68,0.06)' : status === 'done' ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
      border: '1px solid var(--glass-border)', borderRadius: 8,
    }}>
      <div style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
        {ext}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        {error
          ? <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 2 }}>{error}</div>
          : <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{size}</div>
        }
        {status === 'uploading' && (
          <div className="progress-bar-container" style={{ marginTop: 6 }}>
            <div className="progress-bar-fill" style={{ width: '75%', animation: 'pulse 1.2s ease-in-out infinite' }} />
          </div>
        )}
      </div>
      {STATUS_ICON[status]}
      {status !== 'uploading' && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, lineHeight: 0 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
