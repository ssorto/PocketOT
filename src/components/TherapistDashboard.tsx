// src/components/TherapistDashboard.tsx
import React from "react";
import * as storage from "../lib/storage";
import { pillarData } from "../data/pillarData";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, Users, FileText, Clipboard, Trash2, Filter } from "lucide-react";

type Props = {
  onViewAssessment: (clientId: string) => void;
  onViewInterventions: (clientId: string) => void;
  onAddClient: () => void;
  onScheduleSession: () => void;
};

const pillarNameById: Record<number, string> = Object.fromEntries(
  pillarData.map((p) => [p.id, p.name])
);

function overallFromResponses(responses: Record<number, { rating: number }>): number {
  const ratings = Object.values(responses ?? {}).map((r) => Number(r.rating ?? 0));
  if (!ratings.length) return 0;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}

export function TherapistDashboard({
  onViewAssessment,
  onViewInterventions,
  onAddClient,
  onScheduleSession,
}: Props) {
  const [version, setVersion] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [showFlagged, setShowFlagged] = React.useState(false);

  const clients = React.useMemo(() => {
    const map = storage.getAllClients();
    const items = Object.keys(map).map((id) => {
      const c = map[id];
      return {
        id,
        name: c.name || id,
        dateISO: c.dateISO,
        overallScore: overallFromResponses(c.responses),
        priorities: (c.priorities ?? []).map((pid: number) => pillarNameById[pid] ?? `Pillar ${pid}`),
        flaggedCount: (storage.getObservations?.(id) ?? []).filter((o: any) => o.flagged).length,
      };
    });
    items.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
    return items;
  }, [version]);

  const filtered = clients.filter((c) => {
    const matches = c.name.toLowerCase().includes(search.toLowerCase());
    const flagOK = !showFlagged || c.flaggedCount > 0;
    return matches && flagOK;
  });

  const resetAll = () => {
    if (!confirm("Reset ALL saved client data?")) return;
    storage.clearAll();
    setVersion((v) => v + 1);
  };

  const deleteOne = (id: string, name: string) => {
    if (!confirm(`Delete data for "${name}"?`)) return;
    storage.deleteClient(id);
    setVersion((v) => v + 1);
  };

  const avgScore =
    clients.length > 0
      ? (clients.reduce((s, c) => s + c.overallScore, 0) / clients.length).toFixed(1)
      : "0.0";

  // --- DEV ONLY: seed a demo row quickly so you can see the list render ---
  const seedDemo = () => {
    const id = "demo-1";
    const now = new Date().toISOString();
    storage.saveClient({
      id,
      name: "Demo Client",
      dateISO: now,
      priorities: [2, 3, 4],
      responses: {
        1: { rating: 5, answers: {} },
        2: { rating: 4, answers: {} },
        3: { rating: 3, answers: {} },
        4: { rating: 6, answers: {} },
        5: { rating: 7, answers: {} },
        6: { rating: 6, answers: {} },
      },
    });
    setVersion((v) => v + 1);
  };
  // -----------------------------------------------------------------------

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
            <Button variant="outline" onClick={onAddClient}>
              Add Client
            </Button>
            <Button variant="outline" onClick={onScheduleSession}>
              Schedule
            </Button>
            <Button variant="outline" onClick={seedDemo}>
              Seed demo client
            </Button>
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

          <Card className="p-4 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">With Flags</p>
                <p className="text-slate-900 text-2xl">
                  {clients.filter((c) => c.flaggedCount > 0).length}
                </p>
              </div>
              <Button
                variant={showFlagged ? "default" : "outline"}
                onClick={() => setShowFlagged((s) => !s)}
                className={showFlagged ? "bg-slate-700 hover:bg-slate-800" : "border-slate-300"}
              >
                <Filter className="size-4 mr-2" />
                {showFlagged ? "Show All" : "Flagged Only"}
              </Button>
            </div>
          </Card>
        </div>

        {/* list (one Card = one "row") */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-6 bg-white border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-slate-900 mb-1">{c.name}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <Calendar className="size-3" />
                    <span>{new Date(c.dateISO).toLocaleDateString()}</span>
                    <span className="ml-2">Score: {c.overallScore}/10</span>
                    {c.flaggedCount > 0 && (
                      <span className="ml-2 text-orange-600">{c.flaggedCount} flagged</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.priorities.length ? (
                      c.priorities.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className="bg-slate-50 border-slate-300 text-slate-600"
                        >
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
                Ask a client to complete an assessment or reset filters.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
