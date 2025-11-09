// src/components/TherapistDashboard.tsx
import React from 'react';
import * as storage from '../lib/storage';
import { pillarData } from '../data/pillarData';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Users, FileText, Clipboard, Trash2, Filter, Brain } from 'lucide-react';

type Props = {
  onViewAssessment: (clientId: string) => void;
  onViewInterventions: (clientId: string) => void;
  onAddClient: () => void;
  onScheduleSession: () => void;
};

const RECENT_DAYS = 14;

const pillarNameById: Record<number, string> = Object.fromEntries(
  pillarData.map((p) => [p.id, p.name])
);

function overallFromResponses(responses: Record<number, { rating: number }>): number {
  const ratings = Object.values(responses ?? {}).map((r) => Number(r.rating ?? 0));
  if (!ratings.length) return 0;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}

// last activity = later of assessment date or latest observation date
function getLastActivityISO(clientId: string, assessmentISO: string) {
  const obs = (storage.getObservations?.(clientId) ?? []) as Array<{ dateISO: string }>;
  const latestObsISO = obs.length ? obs.map((o) => o.dateISO).sort().at(-1)! : undefined;
  const a = assessmentISO ? new Date(assessmentISO).getTime() : 0;
  const b = latestObsISO ? new Date(latestObsISO).getTime() : 0;
  const latest = Math.max(a, b);
  return latest ? new Date(latest).toISOString() : (assessmentISO || new Date(0).toISOString());
}

function isRecent(iso: string) {
  if (!iso) return false;
  const daysMs = RECENT_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(iso).getTime() <= daysMs;
}

export function TherapistDashboard({
  onViewAssessment,
  onViewInterventions,
  onAddClient,
  onScheduleSession,
}: Props) {
  const [version, setVersion] = React.useState(0);
  const [search, setSearch] = React.useState('');      // quick client search
  const [showRecentOnly, setShowRecentOnly] = React.useState(false);

  const clients = React.useMemo(() => {
    const map = storage.getAllClients();
    const items = Object.keys(map).map((id) => {
      const c = map[id];
      const lastActivityISO = getLastActivityISO(id, c.dateISO);
      // AI results availability (either helper or fallback key)
      const ai =
        (storage.getAIResults?.(id) as unknown) ??
        (() => {
          try {
            const raw = localStorage.getItem(`ai:${id}`);
            return raw ? JSON.parse(raw) : undefined;
          } catch {
            return undefined;
          }
        })();

      const flaggedCount = (storage.getObservations?.(id) ?? []).filter((o: any) => o.flagged).length;

      return {
        id,
        name: c.name || id,
        dateISO: c.dateISO,
        lastActivityISO,
        isRecent: isRecent(lastActivityISO),
        overallScore: overallFromResponses(c.responses),
        priorities: (c.priorities ?? []).map((pid) => pillarNameById[pid] ?? `Pillar ${pid}`),
        flaggedCount,
        hasAI: !!ai,
      };
    });

    // most recent activity first
    items.sort((a, b) => new Date(b.lastActivityISO).getTime() - new Date(a.lastActivityISO).getTime());
    return items;
  }, [version]);

  const filtered = clients.filter((c) => {
    const matches = c.name.toLowerCase().includes(search.toLowerCase());
    const recentOK = !showRecentOnly || c.isRecent;
    return matches && recentOK;
  });

  const resetAll = () => {
    if (!confirm('Reset ALL saved client data?')) return;
    storage.clearAll();
    setVersion((v) => v + 1);
  };

  const deleteOne = (id: string, name: string) => {
    if (!confirm(`Delete data for "${name}"?`)) return;
    storage.deleteClient(id);
    setVersion((v) => v + 1);
  };

  const avgScore =
    clients.length > 0 ? (clients.reduce((s, c) => s + c.overallScore, 0) / clients.length).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-slate-900 mb-1">Caseload Dashboard</h1>
            <p className="text-slate-500">Monitor client progress and manage interventions</p>
          </div>
          <div className="flex items-center gap-2">
            {/* quick search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="h-9 px-3 rounded-md border border-slate-300 bg-white text-sm"
            />
            <Button variant="outline" onClick={onAddClient}>Add Client</Button>
            <Button variant="outline" onClick={onScheduleSession}>Schedule</Button>
            <Button className="bg-red-50 text-red-700 hover:bg-red-100" onClick={resetAll}>
              <Trash2 className="size-4 mr-2" /> Reset All
            </Button>
          </div>
        </div>

        {/* small metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Total Clients</p>
                <p className="text-slate-900 text-2xl">{clients.length}</p>
              </div>
              <div className="size-12 bg-slate-100 rounded-full flex items-center justify-center">
                <Users className="size-6 text-slate-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Avg Score</p>
                <p className="text-slate-900 text-2xl">{avgScore}/10</p>
              </div>
            </div>
          </Card>

          {/* Recent Sessions metric + toggle */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Recent Sessions</p>
                <p className="text-slate-900 text-2xl">
                  {clients.filter((c) => c.isRecent).length}
                </p>
              </div>
              <Button
                variant={showRecentOnly ? 'default' : 'outline'}
                onClick={() => setShowRecentOnly((s) => !s)}
                className={showRecentOnly ? 'bg-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}
                title={`Show only clients seen/updated in the last ${RECENT_DAYS} days`}
              >
                <Filter className="size-4 mr-2" />
                {showRecentOnly ? 'Show All' : 'Recent Only'}
              </Button>
            </div>
          </Card>
        </div>

        {/* list */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-6 bg-white border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-900 mb-1">{c.name}</h3>
                    {c.hasAI && (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                        <Brain className="size-3 mr-1" /> AI
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <Calendar className="size-3" />
                    <span>
                      Last activity:{' '}
                      {new Date(c.lastActivityISO).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="ml-2">Score: {c.overallScore}/10</span>
                    {c.isRecent && <span className="ml-2 text-teal-700">Recent</span>}
                    {c.flaggedCount > 0 && (
                      <span className="ml-2 text-orange-600">{c.flaggedCount} flagged</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {c.priorities.length ? (
                      c.priorities.map((p) => (
                        <Badge key={p} variant="outline" className="bg-slate-50 border-slate-300 text-slate-600">
                          {p}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm">No priorities selected</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onViewAssessment(c.id)}>
                    <FileText className="size-4 mr-2" />
                    View Assessment
                  </Button>
                  <Button variant="outline" onClick={() => onViewInterventions(c.id)}>
                    <Clipboard className="size-4 mr-2" />
                    Open Plan
                  </Button>
                  <Button
                    variant="outline"
                    className="hover:bg-red-50 hover:border-red-300 text-red-700"
                    onClick={() => deleteOne(c.id, c.name)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card className="p-12 bg-white border-slate-200 text-center shadow-sm">
              <p className="text-slate-900 mb-1">No clients found</p>
              <p className="text-slate-500 text-sm">
                Ask a client to complete an assessment or toggle “Recent Only”.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}