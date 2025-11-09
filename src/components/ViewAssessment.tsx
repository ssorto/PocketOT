// src/components/ViewAssessment.tsx
import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, ArrowLeft } from 'lucide-react';
import { pillarData } from '../data/pillarData';
import * as storage from '../lib/storage';

// AI bits
import { analyzeAssessment } from '../lib/ai';
import AiOverviewCard from './AiOverviewCard';
import AiPillarInsights from './AiPillarInsights';

type Props = {
  clientId: string;
  onBack: () => void;
  onViewObservations: (clientId: string) => void;
  onViewInterventions: (clientId: string) => void;
  onViewSessionNotes: (clientId: string) => void;
};

type AIOverview = any;
type AIInsight = any;

export function ViewAssessment({
  clientId,
  onBack,
  onViewObservations,
  onViewInterventions,
  onViewSessionNotes,
}: Props) {
  // Pull client record from local storage
  const client = React.useMemo(() => storage.getClient(clientId), [clientId]);

  // ---- AI state ----
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiOverview, setAiOverview] = React.useState<AIOverview | null>(null);
  const [aiInsights, setAiInsights] = React.useState<AIInsight[] | null>(null);

  // Load any saved AI for this client (supports either storage.saveClientAI or localStorage fallback)
  React.useEffect(() => {
    if (!clientId) return;

    // 1) preferred: saved on the client record (client.ai)
    const freshClient = storage.getClient(clientId);
    const fromClient = (freshClient as any)?.ai;
    if (fromClient) {
      setAiOverview(fromClient.overview ?? null);
      setAiInsights(fromClient.insights ?? null);
      return;
    }
    // 2) optional helper
    const fromHelper = (storage as any).getAIResults?.(clientId);
    if (fromHelper) {
      setAiOverview(fromHelper.overview ?? null);
      setAiInsights(fromHelper.insights ?? null);
      return;
    }
    // 3) fallback localStorage slot
    try {
      const raw = localStorage.getItem(`ai:${clientId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAiOverview(parsed?.overview ?? null);
        setAiInsights(parsed?.insights ?? null);
      } else {
        setAiOverview(null);
        setAiInsights(null);
      }
    } catch {
      setAiOverview(null);
      setAiInsights(null);
    }
  }, [clientId]);

  // Build helpers
  const prioritiesByName = React.useMemo(() => {
    const byId = new Map(pillarData.map((p) => [p.id, p.name]));
    return (client?.priorities ?? []).map((pid) => byId.get(pid) ?? `Pillar ${pid}`);
  }, [client]);

  const responsesArray = React.useMemo(() => {
    if (!client?.responses) return [];
    // Map stored responses to richer display objects
    return pillarData.map((pillar) => {
      const resp = client.responses[pillar.id];
      return {
        id: pillar.id,
        name: pillar.name,
        subtitle: pillar.subtitle,
        color: pillar.color,
        rating: resp?.rating ?? null,
        answers: resp?.answers ?? {},
      };
    });
  }, [client]);

  const overallScore = React.useMemo(() => {
    const ratings = responsesArray
      .map((r) => (typeof r.rating === 'number' ? r.rating : null))
      .filter((n): n is number => n !== null);
    if (!ratings.length) return null;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return Math.round(avg * 10) / 10;
  }, [responsesArray]);

  async function runAI() {
    if (!client) return;
    try {
      setAiLoading(true);

      // Build payload expected by your ai.ts
      const pillarNameMap = Object.fromEntries(pillarData.map((p) => [p.id, p.name.toLowerCase()]));
      const assessmentPayload = {
        selectedTop3: client.priorities ?? [],
        responses: client.responses ?? {},
      };

      const result = await analyzeAssessment(assessmentPayload, pillarNameMap);

      // normalize result shape
      const nextOverview = (result as any)?.overview ?? null;
      const nextInsights = (result as any)?.insights?.insights ?? (result as any)?.insights ?? null;

      // Save back via any available path
      if ((storage as any).saveClientAI) {
        (storage as any).saveClientAI(clientId, { overview: nextOverview, insights: nextInsights || [] });
      } else if ((storage as any).saveAIResults) {
        (storage as any).saveAIResults(clientId, { overview: nextOverview, insights: nextInsights || [] });
      } else {
        // fallback localStorage slot
        localStorage.setItem(
          `ai:${clientId}`,
          JSON.stringify({ overview: nextOverview, insights: nextInsights || [] })
        );
        // also try to tuck it onto the client record for convenience if you want
        const all = storage.getAllClients();
        if (all[clientId]) {
          (all as any)[clientId].ai = { overview: nextOverview, insights: nextInsights || [] };
          localStorage.setItem('clients', JSON.stringify(all));
        }
      }

      setAiOverview(nextOverview);
      setAiInsights(nextInsights || []);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }

  // Empty state if nothing saved
  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Sticky top bar with nav buttons */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm rounded-b-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBack} className="border-slate-300 hover:bg-slate-50">
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div className="text-slate-700 text-sm">No assessment found</div>
            </div>
            <div className="flex gap-2">
              <Button disabled variant="outline" className="border-slate-300">View Observations</Button>
              <Button disabled variant="outline" className="border-slate-300">Open Plan</Button>
              <Button disabled variant="outline" className="border-slate-300">Session Notes</Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-8">
          <Card className="p-10 bg-white border-slate-200 text-center">
            <p className="text-slate-900 mb-2">Nothing to show yet</p>
            <p className="text-slate-500">
              Ask the client to complete an assessment from the client view.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky top bar with nav buttons at the very top */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm rounded-b-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack} className="border-slate-300 hover:bg-slate-50">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
            <div className="text-slate-700 text-sm">
              Viewing&nbsp;<span className="font-medium">{client.name || client.id}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onViewObservations(clientId)}
              variant="outline"
              className="border-slate-300 hover:bg-slate-50"
            >
              View Observations
            </Button>
            <Button
              onClick={() => onViewInterventions(clientId)}
              variant="outline"
              className="border-slate-300 hover:bg-slate-50"
            >
              Open Plan
            </Button>
            <Button
              onClick={() => onViewSessionNotes(clientId)}
              variant="outline"
              className="border-slate-300 hover:bg-slate-50"
            >
              Session Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        {/* Header card */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-slate-900 mb-1">
                {client.name || client.id}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar className="size-3" />
                <span>
                  Assessed on{' '}
                  {client.dateISO
                    ? new Date(client.dateISO).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-slate-500 text-xs mb-1">Overall Score</p>
                <p className="text-slate-900 text-2xl">
                  {overallScore !== null ? `${overallScore}/10` : '—'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-slate-500 text-xs mb-1">Top Priorities</p>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {(prioritiesByName.length ? prioritiesByName : ['—']).map((p, i) => (
                    <Badge key={`${p}-${i}`} variant="outline" className="bg-slate-50 border-slate-300 text-slate-600">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Pillar responses */}
        <div className="grid grid-cols-1 gap-4">
          {responsesArray.map((r) => (
            <Card key={r.id} className="p-5 bg-white border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`inline-block px-2 py-1 rounded text-xs ${r.color}`}>Pillar {r.id}</div>
                  <h3 className="text-slate-900 mt-2 mb-1">{r.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{r.subtitle}</p>
                </div>
                <div className="text-right min-w-[96px]">
                  <p className="text-slate-500 text-xs mb-1">Rating</p>
                  <p className="text-slate-900 text-xl">{r.rating ?? '—'}/10</p>
                </div>
              </div>

              {/* Open-ended answers */}
              {Object.keys(r.answers).length > 0 ? (
                <div className="mt-3 space-y-3">
                  {Object.entries(r.answers).map(([qid, text]) => (
                    <div key={qid} className="bg-slate-50 border border-slate-200 rounded-md p-3">
                      <p className="text-slate-600 text-sm whitespace-pre-wrap">{text || '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-slate-500 text-sm">No written responses.</div>
              )}
            </Card>
          ))}
        </div>

        {/* AI controls + render */}
        <Card className="mt-6 p-6 bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-8">
            <button
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={runAI}
              disabled={aiLoading}
            >
              {aiLoading ? 'Generating…' : 'Generate AI Summary'}
            </button>
            {(aiOverview || (aiInsights && aiInsights.length)) && (
              <span className="text-slate-500 text-sm">
                Last updated: {new Date().toLocaleString()}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <AiOverviewCard data={aiOverview ?? undefined} />
            <AiPillarInsights items={aiInsights ?? undefined} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ViewAssessment;