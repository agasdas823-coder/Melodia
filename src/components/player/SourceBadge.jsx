import React from 'react';

/**
 * SourceBadge
 * Shows a small pill indicating whether audio is coming from JioSaavn or YouTube.
 */
export default function SourceBadge({ source, usingFallback = false }) {
  if (!source || source === 'cache') return null;
  if (source === 'spotify' && !usingFallback) return null;

  const configs = {
    jiosaavn: { label: 'JioSaavn', color: '#1DB954' },
    youtube:  { label: 'YouTube',  color: '#FF0000' },
    spotify:  { label: '⏱️ Preview', color: '#1DB954' },
  };

  const config = configs[source];
  if (!config) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase select-none transition-all duration-300"
      style={{
        background: `${config.color}15`,
        border: `1px solid ${config.color}40`,
        color: config.color,
      }}
      title={`Playing from ${config.label}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: config.color }}
      />
      <span>{config.label}</span>
    </div>
  );
}
