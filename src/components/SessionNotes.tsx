// src/components/SessionNotes.tsx
import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Sparkles, ClipboardCopy, Loader2 } from "lucide-react";
import * as storage from "../lib/storage";

type SoapNote = {
  S: string;
  O: string;
  A: string;
  P: string;
  missing_info: string[];
};

export default function SessionNotes({ clientId }: { clientId: string }) {
  const client = storage.getClient(clientId);
  const [shorthand, setShorthand] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [soap, setSoap] = React.useState<SoapNote | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Optional: pass helpful context (goals, priorities, last vitals) to the model
  const clientContext = React.useMemo(() => {
    return {
      name: client?.name ?? "client",
      priorities: client?.priorities ?? [],
      goals: (storage.getObservations(clientId) ?? [])
        .slice(-5)
        .map(o => o.text)
        .filter(Boolean),
      last_assessment_date: client?.dateISO ?? null,
    };
  }, [clientId, client]);

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
    <div className="space-y-6">
      {/* Shorthand input */}
      <Card className="p-5 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-900">Session Notes</h2>
          <Badge variant="outline" className="border-slate-300 text-slate-600">
            {client?.name ?? clientId}
          </Badge>
        </div>

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
  );
}