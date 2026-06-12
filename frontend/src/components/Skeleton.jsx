import React from 'react';

// Skeleton block of given width/height
export function SkeletonBlock({ width = '100%', height = '16px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: '6px', ...style }}
    />
  );
}

// Skeleton for a stat card
export function SkeletonStatCard() {
  return (
    <div className="glass-panel stat-card" style={{ padding: '20px' }}>
      <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 10 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock width="60%" height="12px" />
        <SkeletonBlock width="40%" height="22px" />
      </div>
    </div>
  );
}

// Skeleton for a table row
export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px' }}>
          <SkeletonBlock width={i === 0 ? '80%' : '50%'} height="14px" />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for a candidate card panel
export function SkeletonProfileCard() {
  return (
    <div className="glass-panel" style={{ padding: 32 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="50%" height="20px" />
          <SkeletonBlock width="35%" height="14px" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock height="14px" />
        <SkeletonBlock height="14px" width="80%" />
        <SkeletonBlock height="14px" width="60%" />
      </div>
    </div>
  );
}
