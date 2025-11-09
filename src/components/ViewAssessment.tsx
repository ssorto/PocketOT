// src/components/ViewAssessment.tsx
import React from 'react';
import * as storage from '../lib/storage';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { pillarData } from '../data/pillarData';
import AiOverviewCard from "./AiOverviewCard";
import AiPillarInsights from "./AiPillarInsights";
import { analyzeAssessment } from "../lib/ai";

type Props = {
  clientId: string;
  onBack: () => void;
  onViewObservations: (clientId: string) => void;
  onViewInterventions: (clientId: string) => void;
  onViewSessionNotes: (clientId: string) => void;
};

export function ViewAssessment({
  clientId,
  onBack,
  onViewObservations,
  onViewInterventions,
  onViewSessionNotes,
}: Props) {
  const [client, setClient] = React.useState<storage.ClientRecord | undefined>();
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiOverview, setAiOverview] = React.useState<any>(null);
  const [aiInsights, setAiInsights] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    setClient(clientId ? storage.getClient(clientId) : undefined);
  }, [clientId]);

  React.useEffect(() => {
    const all = storage.getAllClients();
    const rec = all[clientId];
    if (rec?.ai) {
      setAiOverview(rec.ai.overview ?? null);
      setAiInsights(rec.ai.insights ?? null);
    }
  }, [clientId]);

  if (!client) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-slate-900">Assessment</h1>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" /> Back
            </Button>
          </div>
          <Card className="p-6 bg-white border-slate-200 shadow-sm">
            <p className="text-slate-700">No assessment found for this client.</p>
          </Card>
        </div>
      </div>
    );
  }

  const scoreFor = (id: number) => client.responses[id]?.rating ?? 0;

  async function runAI() {
    try {
      setAiLoading(true);
      const all = storage.getAllClients();
      const rec = all[clientId];
      if (!rec?.responses) {
        alert("No saved responses for this client.");
        return;
      }

      const pillarNameMap = Object.fromEntries(
        pillarData.map(p => [p.id, p.name.toLowerCase()])
      );

      const assessmentPayload = {
        selectedTop3: rec.priorities ?? [],
        responses: rec.responses,
      };

      const result = await analyzeAssessment(assessmentPayload, pillarNameMap);

      storage.saveClientAI(clientId, {
        overview: result.overview,
        insights: result.insights?.insights ?? [],
      });

      setAiOverview(result.overview);
      setAiInsights(result.insights?.insights ?? []);
    } catch (e:any) {
      console.error(e);
      alert(e?.message ?? "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-slate-900">Assessment — {client.name || client.id}</h1>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>
        </div>

        <Card className="p-6 bg-white border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm mb-4">
            Date: {new Date(client.dateISO).toLocaleString()}
          </p>

          {/* Pillar scores */}
          <div className="grid sm:grid-cols-2 gap-4">
            {pillarData.map((p) => (
              <div key={p.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-900 font-medium">{p.name}</p>
                  <div className="text-slate-700">{scoreFor(p.id)}/10</div>
                </div>
                {/* open-ended answers */}
                {Object.entries(client.responses[p.id]?.answers ?? {}).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(client.responses[p.id]?.answers ?? {}).map(([qid, answer]) => (
                      <div key={qid} className="text-sm text-slate-600">
                        • {answer}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm">No answers recorded.</div>
                )}
              </div>
            ))}
          </div>

          {/* priorities */}
          <div className="mt-6">
            <p className="text-slate-800 mb-2">Selected priorities</p>
            {client.priorities.length ? (
              <div className="flex flex-wrap gap-2">
                {client.priorities.map((pid) => {
                  const p = pillarData.find((x) => x.id === pid);
                  return (
                    <span key={pid} className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 text-sm">
                      {p?.name ?? `Pillar ${pid}`}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">None selected.</div>
            )}
          </div>

          {/* AI controls */}
          <div className="mt-6 flex items-center gap-8">
            <button
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={runAI}
              disabled={aiLoading}
            >
              {aiLoading ? "Generating…" : "Generate AI Summary"}
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

          {/* nav */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => onViewObservations(client.id)} variant="outline">
              View Observations
            </Button>
            <Button onClick={() => onViewInterventions(client.id)} variant="outline">
              Open Plan
            </Button>
            <Button onClick={() => onViewSessionNotes(client.id)} variant="outline">
              Session Notes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}