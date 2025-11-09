import React, { useMemo, useState } from 'react';
import * as storage from '../lib/storage';

type Props = {
  clientId?: string;
  onBack: () => void;
  onSaved?: (clientId: string) => void;
};

const FALLBACK_ID = 'default-client';

export default function DailyObservations({ clientId, onBack, onSaved }: Props) {
  const safeClientId = useMemo(() => (clientId?.trim() ? clientId : FALLBACK_ID), [clientId]);

  const [mood, setMood] = useState<number>(5);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const onNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  };

  function handleSave() {
    setSaving(true);
    try {
      storage.addObservation(safeClientId, { 
        mood, 
        note: String(note ?? '')
      });
      setNote('');
      setMood(5);
      onSaved?.(safeClientId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Daily Observation</h2>
        <button onClick={onBack} style={btnOutline}>Back</button>
      </div>

      <div style={card}>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 12 }}>
          Quick check-in (0–10) and an optional note about your day.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#475569', marginBottom: 8 }}>
            <span>Mood / Energy</span>
            <span style={{ fontWeight: 600 }}>{mood}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 4 }}>
            <span>0</span><span>10</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 14, color: '#334155' }}>Optional note</label>
          <textarea
            placeholder="What worked today? What was a barrier?"
            value={note}
            onChange={onNoteChange}
            rows={4}
            style={textarea}
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSave} disabled={saving} style={btn}>
            {saving ? 'Saving...' : 'Save observation'}
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>Client: {safeClientId}</span>
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 16,
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const textarea: React.CSSProperties = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: 10,
  fontSize: 14,
};

const btn: React.CSSProperties = {
  padding: '10px 14px',
  background: '#0ea5e9',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
};

const btnOutline: React.CSSProperties = {
  ...btn,
  background: 'white',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
};