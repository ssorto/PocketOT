// src/components/DailyObservation.tsx
import React from 'react';
import * as storage from '../lib/storage';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';

type Props = {
  clientId: string;
  onBack: () => void;
  onSaved?: (clientId: string) => void;
};

export function DailyObservation({ clientId, onBack, onSaved }: Props) {
  const client = React.useMemo(() => (clientId ? storage.getClient(clientId) : undefined), [clientId]);

  const [text, setText] = React.useState('');
  const [mood, setMood] = React.useState<number>(5);
  const [observations, setObservations] = React.useState<storage.Observation[]>([]);

  React.useEffect(() => {
    if (!clientId) return;
    setObservations(storage.getObservations(clientId));
  }, [clientId]);

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="p-6 bg-white/90 backdrop-blur border-slate-200 shadow-lg rounded-2xl">
            <p className="text-slate-900 mb-2 text-lg">Daily Observation</p>
            <p className="text-slate-600">Please complete the assessment first.</p>
            <div className="mt-4">
              <Button variant="outline" onClick={onBack} className="border-slate-300">
                Back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!text.trim()) {
      alert('Please write a short note before saving.');
      return;
    }

    // Create a new observation (AI-storage shape: includes "text")
    const newObservation: storage.Observation = {
      id: `obs-${Date.now()}`,
      dateISO: new Date().toISOString(),
      text,
      mood,
      flagged: false,
    };

    storage.addObservation(client.id, newObservation);
    setObservations(storage.getObservations(client.id));

    // Reset form
    setText('');
    setMood(5);

    onSaved?.(client.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6 bg-white/90 backdrop-blur border-slate-200 shadow-lg rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-sm">
                Daily Observation
              </div>
              <p className="text-slate-600 text-sm mt-2">
                For: <span className="font-medium text-slate-800">{client.name || client.id}</span>
              </p>
            </div>
            <Button variant="outline" onClick={onBack} className="border-slate-300 hover:bg-slate-50">
              Back
            </Button>
          </div>

          <div className="mt-8">
            <p className="text-slate-800 mb-2">Mood / Wellness (0–10)</p>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Slider value={[mood]} onValueChange={(v) => setMood(v[0])} min={0} max={10} step={1} className="w-full" />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">0</span>
                <span className="px-3 py-1 rounded-full text-white bg-gradient-to-r from-teal-500 to-blue-500">
                  {mood}/10
                </span>
                <span className="text-slate-500">10</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-slate-800 mb-2">Notes</p>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a short reflection for today…"
              className="bg-slate-50 border-slate-200"
            />
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white"
            >
              Save Reflection
            </Button>
            <Button variant="outline" onClick={onBack} className="border-slate-300 hover:bg-slate-50">
              Back
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white/90 backdrop-blur border-slate-200 shadow-lg rounded-2xl">
          <p className="text-slate-900 mb-4 text-lg">Recent reflections</p>
          {observations.length === 0 ? (
            <p className="text-slate-600 text-sm">No reflections yet.</p>
          ) : (
            <div className="space-y-3">
              {observations.slice(0, 5).map((o) => (
                <div key={o.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2 text-sm text-slate-600">
                    <span>
                      {new Date(o.dateISO).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>
                      Mood: <span className="font-medium text-slate-800">{o.mood}</span>/10
                    </span>
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap">{o.text || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}