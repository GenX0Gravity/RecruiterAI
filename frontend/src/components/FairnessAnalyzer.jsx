import React, { useState, useEffect } from 'react';

export default function FairnessAnalyzer({ candidates, backendUrl }) {
  const [candidateAttributes, setCandidateAttributes] = useState([]);
  const [sensitiveFeature, setSensitiveFeature] = useState('gender');
  const [fairnessResults, setFairnessResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Explainability state
  const [explainText, setExplainText] = useState('');
  const [explainEntity, setExplainEntity] = useState('');
  const [explainResult, setExplainResult] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    if (candidates && candidates.length > 0) {
      const initialAttrs = candidates.map((c, idx) => {
        const nameList = c.parsed_data?.Name || [];
        const name = nameList[0] || `Candidate ${idx + 1}`;
        return {
          id: idx + 1,
          name: name,
          gender: idx % 2 === 0 ? 'Female' : 'Male', // Mock defaults
          selected_for_interview: 1
        };
      });
      setCandidateAttributes(initialAttrs);
    }
  }, [candidates]);

  const handleAttributeChange = (index, field, value) => {
    const updated = [...candidateAttributes];
    updated[index][field] = field === 'selected_for_interview' ? parseInt(value) : value;
    setCandidateAttributes(updated);
  };

  const runFairnessCheck = async () => {
    if (candidateAttributes.length === 0) return;
    setLoading(true);
    setError(null);
    setFairnessResults(null);

    try {
      const response = await fetch(`${backendUrl}/fairness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_data: candidateAttributes,
          sensitive_feature: sensitiveFeature,
          target_metric: 'selected_for_interview'
        })
      });

      if (!response.ok) {
        throw new Error('Fairness check failed.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setFairnessResults(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to check fairness metrics.');
    } finally {
      setLoading(false);
    }
  };

  const runExplainability = async (e) => {
    e.preventDefault();
    if (!explainText || !explainEntity) return;

    setExplainLoading(true);
    setExplainResult('');

    try {
      const response = await fetch(`${backendUrl}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: explainText,
          entity: explainEntity
        })
      });

      if (!response.ok) throw new Error('Failed to load explanation.');

      const data = await response.json();
      setExplainResult(data.highlighted_context || 'Entity not found.');
    } catch (err) {
      setExplainResult('Failed to explain entity context.');
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'start' }} className="fade-in">
      {/* Configuration & Selection Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="card-title">
            <span className="logo-icon" style={{ width: '24px', height: '24px', fontSize: '14px', background: 'var(--gradient-primary)' }}>⚖️</span>
            Bias Detection (Fairlearn)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Assign sensitive attributes and hiring decisions to evaluate selection rates and verify demographic parity.
          </p>

          {candidateAttributes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', margin: '20px 0' }}>
              No candidates parsed yet. Parse resumes first to configure demographic attributes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Sensitive Attribute:</span>
                <select 
                  className="input-field" 
                  style={{ width: '150px', padding: '6px 12px' }}
                  value={sensitiveFeature}
                  onChange={(e) => setSensitiveFeature(e.target.value)}
                >
                  <option value="gender">Gender</option>
                </select>
              </div>

              {/* Table of Candidate Decisions */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Candidate Name</th>
                      <th style={{ padding: '10px' }}>Gender</th>
                      <th style={{ padding: '10px' }}>Hiring Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateAttributes.map((attr, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px', fontWeight: '600' }}>{attr.name}</td>
                        <td style={{ padding: '10px' }}>
                          <select 
                            className="input-field" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            value={attr.gender}
                            onChange={(e) => handleAttributeChange(idx, 'gender', e.target.value)}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select 
                            className="input-field" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            value={attr.selected_for_interview}
                            onChange={(e) => handleAttributeChange(idx, 'selected_for_interview', e.target.value)}
                          >
                            <option value={1}>Selected</option>
                            <option value={0}>Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn" onClick={runFairnessCheck} disabled={loading}>
                {loading ? 'Evaluating Bias...' : 'Compute Fairness Metrics'}
              </button>
            </div>
          )}

          {error && (
            <div className="fade-in" style={{ color: 'var(--accent-red)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: '12px' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Explainability / Context Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="card-title">
            <span className="logo-icon" style={{ width: '24px', height: '24px', fontSize: '14px', background: 'var(--gradient-secondary)' }}>🔍</span>
            Explainable Entity Extraction
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Check the original sentence of an entity to understand *why* the CPU NER model labeled it.
          </p>
          <form onSubmit={runExplainability} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              className="input-field"
              placeholder="Paste original resume sentence/block..."
              value={explainText}
              onChange={(e) => setExplainText(e.target.value)}
              style={{ minHeight: '80px', fontSize: '13px' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Entity to highlight (e.g. Python)"
              value={explainEntity}
              onChange={(e) => setExplainEntity(e.target.value)}
              style={{ fontSize: '13px' }}
            />
            <button type="submit" className="btn btn-secondary" disabled={explainLoading || !explainText || !explainEntity}>
              {explainLoading ? 'Extracting context...' : 'Explain Context'}
            </button>
          </form>

          {explainResult && (
            <div className="fade-in" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '13px', fontFamily: 'monospace', color: '#60a5fa', overflowWrap: 'break-word' }}>
              {explainResult}
            </div>
          )}
        </div>
      </div>

      {/* Fairness Results Card */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '380px' }}>
        <h3 className="card-title">
          <span className="logo-icon" style={{ width: '24px', height: '24px', fontSize: '14px', background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}>📊</span>
          Fairness Assessment
        </h3>

        {!fairnessResults && (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', height: '250px' }}>
            <p>Compute metrics to see selection rates and demographic parity difference.</p>
          </div>
        )}

        {fairnessResults && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Demographic Parity Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Demographic Parity Difference</div>
              <div style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'var(--font-display)', color: fairnessResults.demographic_parity_difference > 0.2 ? 'var(--accent-pink)' : 'var(--accent-green)' }}>
                {parseFloat(fairnessResults.demographic_parity_difference || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {fairnessResults.demographic_parity_difference > 0.2 
                  ? '⚠️ High selection rate variance detected between groups.' 
                  : '✅ Fair representation across sensitive feature groups.'}
              </div>
            </div>

            {/* Selection Rates by Group */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Group Selection Rates</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(fairnessResults.group_selection_rates || {}).map(([group, rate], idx) => {
                  const percentage = Math.round(rate * 100);
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>{group}</span>
                        <span style={{ fontWeight: '600' }}>{percentage}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${percentage}%`,
                            background: group === 'Female' ? 'var(--gradient-secondary)' : 'var(--gradient-primary)'
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
