// src/components/InterventionPlan.tsx
import React from 'react';
import * as storage from '../lib/storage';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ArrowLeft, Save, Plus, Trash2, Calendar, Sparkles } from 'lucide-react';
import { pillarData } from '../data/pillarData';
import { analyzeAssessment } from '../lib/ai';

type Props = { clientId: string; onBack: () => void };

/* ---------- Types & localStorage helpers ---------- */
type GoalRow = {
  id: string;
  areaId: number | null;     // pillar id
  goal: string;
  interventionsText: string; // free text (therapist writes)
  frequency: string;
  duration: string;
  status: 'planned' | 'in-progress' | 'completed';
};

type PlanDoc = {
  clientId: string;
  clientName?: string;
  therapist?: string;
  setting?: 'clinic' | 'home' | 'school' | 'community' | 'telehealth';
  startDate?: string;        // yyyy-mm-dd
  reviewDate?: string;       // yyyy-mm-dd
  notes?: string;
  goals: GoalRow[];
  updatedISO: string;
};

const planKey = (clientId: string) => `plan:${clientId}`;

function loadPlan(clientId: string): PlanDoc | null {
  try {
    const raw = localStorage.getItem(planKey(clientId));
    return raw ? (JSON.parse(raw) as PlanDoc) : null;
  } catch {
    return null;
  }
}
function savePlan(doc: PlanDoc) {
  localStorage.setItem(planKey(doc.clientId), JSON.stringify(doc));
}

/* ---------- Pick lists ---------- */
const FREQUENCIES = ['Daily', '2x/week', '3x/week', 'Weekly', 'Biweekly', 'Monthly'];
const DURATIONS = ['15 min', '30 min', '45 min', '60 min', '90 min'];
const SETTINGS = ['clinic', 'home', 'school', 'community', 'telehealth'] as const;

/* ---------- AI result types ---------- */
type AiPillarInsight = {
  pillar_name: string;
  pillar_score: number;
  trend_statement: string;
  consider_statement: string;
};
type AiPlan = {
  ai_suggested_focus_area: string;
  evidence_quotes: string[];
};

export function InterventionPlan({ clientId, onBack }: Props) {
  const client = React.useMemo(() => (clientId ? storage.getClient(clientId) : undefined), [clientId]);
  const clientName = client?.name || clientId;
  const lastAssessed = client?.dateISO
    ? new Date(client.dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  /* ---------------- plan state ---------------- */
  const [therapist, setTherapist] = React.useState('');
  const [setting, setSetting] = React.useState<PlanDoc['setting']>('clinic');
  const [startDate, setStartDate] = React.useState('');
  const [reviewDate, setReviewDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [goals, setGoals] = React.useState<GoalRow[]>([]);

  /* ---------------- AI state ---------------- */
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiPlan, setAiPlan] = React.useState<AiPlan | null>(null);
  const [aiInsightsByPillarId, setAiInsightsByPillarId] = React.useState<Record<number, AiPillarInsight> | null>(null);

  // map pillar name -> id for aligning AI insights
  const nameToId = React.useMemo(() => {
    const map: Record<string, number> = {};
    pillarData.forEach((p) => (map[p.name.toLowerCase()] = p.id));
    return map;
  }, []);

  /* ---------------- load existing plan or seed ---------------- */
  React.useEffect(() => {
    const existing = loadPlan(clientId);
    if (existing) {
      setTherapist(existing.therapist ?? '');
      setSetting(existing.setting ?? 'clinic');
      setStartDate(existing.startDate ?? '');
      setReviewDate(existing.reviewDate ?? '');
      setNotes(existing.notes ?? '');
      setGoals(existing.goals ?? []);
    } else {
      setGoals([
        {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
          areaId: null,
          goal: '',
          interventionsText: '',
          frequency: '',
          duration: '',
          status: 'planned',
        },
      ]);
    }
  }, [clientId]);

  /* ---------------- fetch AI plan & insights ---------------- */
  React.useEffect(() => {
    const run = async () => {
      if (!client?.responses) return;
      setAiLoading(true);
      setAiError(null);
      try {
        const pillarNameMap = pillarData.reduce<Record<number, string>>((acc, p) => {
          acc[p.id] = p.name.toLowerCase();
          return acc;
        }, {});

        const assessmentPayload = {
          selectedTop3: client.priorities ?? [],
          responses: client.responses,
        };

        // Use the same helper as ViewAssessment to avoid endpoint drift
        const result = await analyzeAssessment(assessmentPayload, pillarNameMap);

        const plan: AiPlan | null = (result as any)?.plan ?? (result as any)?.overview ?? null;
        const insightsArr: AiPillarInsight[] =
          (result as any)?.insights?.insights ?? (result as any)?.insights ?? [];

        const byId: Record<number, AiPillarInsight> = {};
        insightsArr.forEach((it) => {
          const id = nameToId[it.pillar_name?.toLowerCase?.() || ''];
          if (id) byId[id] = it;
        });

        setAiPlan(plan);
        setAiInsightsByPillarId(byId);
      } catch (e: any) {
        setAiError(e?.message ?? 'Failed to load AI insights');
      } finally {
        setAiLoading(false);
      }
    };

    run();
  }, [client?.responses, client?.priorities, nameToId]);

  /* ---------------- handlers ---------------- */
  const addRow = () =>
    setGoals((g) => [
      ...g,
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
        areaId: null,
        goal: '',
        interventionsText: '',
        frequency: '',
        duration: '',
        status: 'planned',
      },
    ]);

  const removeRow = (id: string) => setGoals((g) => g.filter((r) => r.id !== id));
  const updateRow = (id: string, patch: Partial<GoalRow>) =>
    setGoals((g) => g.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleSave = () => {
    const doc: PlanDoc = {
      clientId,
      clientName,
      therapist: therapist.trim() || undefined,
      setting,
      startDate: startDate || undefined,
      reviewDate: reviewDate || undefined, // kept, label has no "(optional)"
      notes: notes.trim() || undefined,
      goals,
      updatedISO: new Date().toISOString(),
    };
    savePlan(doc);
    alert('Plan saved ✅');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sticky header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack} className="border-slate-300 hover:bg-slate-50">
              <ArrowLeft className="size-4 mr-2" /> Back
            </Button>
            <div className="text-slate-800 text-sm">
              Intervention Plan — <span className="font-semibold">{clientName}</span>
            </div>
          </div>
          <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
            <Save className="size-4 mr-2" />
            Save Plan
          </Button>
        </div>
      </div>

      {/* content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* summary */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-slate-900 mb-1">{clientName}</h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar className="size-3" />
                <span>Last assessment: {lastAssessed}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(client?.priorities ?? []).slice(0, 3).map((pid) => {
                const name = pillarData.find((p) => p.id === pid)?.name ?? `Pillar ${pid}`;
                return (
                  <Badge key={pid} variant="outline" className="bg-slate-50 border-slate-300 text-slate-600">
                    Priority: {name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </Card>

        {/* plan meta */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-700 mb-1">Therapist</label>
              <Input value={therapist} onChange={(e) => setTherapist(e.target.value)} placeholder="Your name" />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm text-slate-700 mb-1">Setting</label>
              <select
                className="w-full border rounded-md h-10 px-2 bg-white"
                value={setting}
                onChange={(e) => setSetting(e.target.value as PlanDoc['setting'])}
              >
                {SETTINGS.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm text-slate-700 mb-1">Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm text-slate-700 mb-1">Review date</label>
              <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-slate-700 mb-1">Plan notes</label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key considerations, constraints, caregiver notes…"
              className="bg-slate-50"
            />
          </div>
        </Card>

        {/* global AI suggestion */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Sparkles className="size-5 text-teal-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-slate-900 flex items-center gap-2">AI-suggested focus area</h2>
              {aiLoading && <p className="text-sm text-slate-500 mt-1">Running analysis…</p>}
              {aiError && <p className="text-sm text-red-600 mt-1">{aiError}</p>}
              {!aiLoading && !aiError && aiPlan && (
                <>
                  <p className="text-slate-700 mt-1">{aiPlan.ai_suggested_focus_area}</p>
                  {aiPlan.evidence_quotes?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                      {aiPlan.evidence_quotes.map((q, i) => (
                        <li key={i}>“{q}”</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
              {!aiLoading && !aiError && !aiPlan && (
                <p className="text-sm text-slate-500 mt-1">No AI suggestion yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* goals (AI insight per row; interventions = free text) */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900">Goals</h2>
            <Button onClick={addRow} variant="outline" className="border-slate-300">
              <Plus className="size-4 mr-2" />
              Add Goal
            </Button>
          </div>

          <div className="space-y-4">
            {goals.map((row, idx) => {
              const areaOptions = pillarData.map((p) => ({ id: p.id, name: p.name }));
              const insight =
                row.areaId && aiInsightsByPillarId ? aiInsightsByPillarId[row.areaId] : undefined;

              return (
                <div key={row.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-slate-700 text-sm font-medium">Goal {idx + 1}</div>
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded-md h-9 px-2 text-sm"
                        value={row.status}
                        onChange={(e) => updateRow(row.id, { status: e.target.value as GoalRow['status'] })}
                        title="Status"
                      >
                        <option value="planned">Planned</option>
                        <option value="in-progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <Button
                        variant="outline"
                        onClick={() => removeRow(row.id)}
                        className="border-slate-300 hover:bg-red-50 hover:text-red-700"
                        title="Remove goal"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* AI insight banner */}
                  <div className="mb-3 rounded-md border border-teal-200 bg-teal-50 p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="size-4 mt-0.5 text-teal-700" />
                      <div className="text-sm text-slate-800">
                        {row.areaId ? (
                          insight ? (
                            <>
                              <div className="font-medium">
                                {pillarData.find((p) => p.id === row.areaId)?.name}: key insight
                              </div>
                              <div className="mt-1">{insight.trend_statement}</div>
                              <div className="mt-1 text-slate-700">{insight.consider_statement}</div>
                            </>
                          ) : (
                            <div>No AI insight found for this area.</div>
                          )
                        ) : (
                          <div>Select a target area to see AI insight.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* row grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-sm text-slate-700 mb-1">Target area</label>
                      <select
                        className="w-full border rounded-md h-10 px-2 bg-white"
                        value={row.areaId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          updateRow(row.id, { areaId: val });
                        }}
                      >
                        <option value="">Choose…</option>
                        {areaOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-9">
                      <label className="block text-sm text-slate-700 mb-1">Goal statement</label>
                      <Input
                        value={row.goal}
                        onChange={(e) => updateRow(row.id, { goal: e.target.value })}
                        placeholder="Describe the outcome and functional context…"
                        className="flex-1"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-sm text-slate-700 mb-1">Interventions (free text)</label>
                      <Textarea
                        rows={3}
                        value={row.interventionsText}
                        onChange={(e) => updateRow(row.id, { interventionsText: e.target.value })}
                        placeholder="E.g., sensory modulation strategies, caregiver education, task grading…"
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm text-slate-700 mb-1">Frequency</label>
                      <select
                        className="w-full border rounded-md h-10 px-2 bg-white"
                        value={row.frequency}
                        onChange={(e) => updateRow(row.id, { frequency: e.target.value })}
                      >
                        <option value="">Choose…</option>
                        {FREQUENCIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm text-slate-700 mb-1">Session duration</label>
                      <select
                        className="w-full border rounded-md h-10 px-2 bg-white"
                        value={row.duration}
                        onChange={(e) => updateRow(row.id, { duration: e.target.value })}
                      >
                        <option value="">Choose…</option>
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-end">
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
              <Save className="size-4 mr-2" />
              Save Plan
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default InterventionPlan;