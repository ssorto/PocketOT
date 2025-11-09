// src/components/SessionNotes.tsx
import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Sparkles, ClipboardCopy, Loader2, ArrowLeft, Calendar } from "lucide-react";
import * as storage from "../lib/storage";

type SoapNote = {
  S: string;
  O: string;
  A: string;
  P: string;
  missing_info: string[];
};

export default function SessionNotes({
  clientId,
  onBack,
}: {
  clientId: string;
  onBack: () => void;
}) {
  const client = storage.getClient(clientId);
  const [shorthand, setShorthand] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [soap, setSoap] = React.useState<SoapNote | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // pull prior client reflections (observations)
  const priorObs = React.useMemo(() => {
    const list = storage.getObservations(clientId) ?? [];
    // newest first
    return [...list].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()).slice(0, 5);
  }, [clientId]);

  // Optional: pass helpful context (goals, priorities, last vitals) to the model
  const clientContext = React.useMemo(() => {
    return {
      name: client?.name ?? "client",
      priorities: client?.priorities ?? [],
      goals: priorObs.map((o) => (o as any).note ?? (o as any).text).filter(Boolean),
      last_assessment_date: client?.dateISO ?? null,
    };
  }, [clientId, client, priorObs]);

  const runAI = async () => {
    setAiLoading(true);
    setError(null);
    setSoap(null);
    try {
      const resp = await fetch("/api/ot/soap_notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shorthand, clientContext }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error ?? "unknown_error");
      setSoap(data.note as SoapNote);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate SOAP notes");
    } finally {
      setAiLoading(false);
    }
  };

  const copyAll = async () => {
    if (!soap) return;
    const text = `S: ${soap.S}\n\nO: ${soap.O}\n\nA: ${soap.A}\n\nP: ${soap.P}`;
    await navigator.clipboard.writeText(text);
    alert("SOAP note copied to clipboard.");
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top bar with Back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack} className="border-slate-300 hover:bg-slate-50">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
            <h1 className="text-slate-900">Session Notes</h1>
          </div>
          <Badge variant="outline" className="border-slate-300 text-slate-600">
            {client?.name ?? clientId}
          </Badge>
        </div>

        {/* Prior Notes (recent reflections) */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <h2 className="text-slate-900 mb-3">Prior Notes</h2>
          {priorObs.length === 0 ? (
            <p className="text-slate-500 text-sm">No prior reflections from the client yet.</p>
          ) : (
            <div className="space-y-3">
              {priorObs.map((o) => (
                <div key={o.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                    <Calendar className="size-3" />
                    <span>
                      {new Date(o.dateISO).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="ml-2">Mood: {o.mood}/10</span>
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap">
                    {(o as any).note ?? (o as any).text ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Shorthand input + AI */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <label className="block text-sm text-slate-700 mb-1">
            Shorthand/rough notes (bullet points are fine)
          </label>
          <Textarea
            rows={6}
            value={shorthand}
            onChange={(e) => setShorthand(e.target.value)}
            placeholder={`e.g., fatigue 6/10; graded ADL sequencing; 2x min verbal cues; 10 mins task analysis; HR 84; improved carryover vs last week; caregiver reports school is harder on Tue.`}
            className="bg-slate-50"
          />

          <div className="mt-4 flex gap-2">
            <Button onClick={runAI} disabled={!shorthand || aiLoading} className="bg-teal-600 hover:bg-teal-700">
              {aiLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
              Generate AI SOAP Notes
            </Button>
            {soap && (
              <Button variant="outline" onClick={copyAll}>
                <ClipboardCopy className="mr-2 size-4" />
                Copy SOAP
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>

        {/* SOAP output */}
        {soap && (
          <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-4">
            <section>
              <h3 className="text-slate-900 mb-1">S — Subjective</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{soap.S}</p>
            </section>
            <section>
              <h3 className="text-slate-900 mb-1">O — Objective</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{soap.O}</p>
            </section>
            <section>
              <h3 className="text-slate-900 mb-1">A — Assessment</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{soap.A}</p>
            </section>
            <section>
              <h3 className="text-slate-900 mb-1">P — Plan</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{soap.P}</p>
            </section>

            {soap.missing_info?.length > 0 && (
              <section>
                <h4 className="text-slate-800 mb-1">Missing info (to document next time)</h4>
                <ul className="list-disc pl-5 text-slate-600">
                  {soap.missing_info.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </section>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}