import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

type Item = {
  pillar_name: string;
  pillar_score: number;
  trend_statement: string;
  consider_statement: string;
};

export default function AiPillarInsights({ items }: { items?: Item[] }) {
  if (!items?.length) return null;

  return (
    <Card className="p-4 bg-white border-slate-200">
      <h4 className="text-slate-900 mb-3">AI Insights by Pillar</h4>
      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-900">{it.pillar_name}</span>
              <Badge variant="outline">{it.pillar_score}/10</Badge>
            </div>
            <p className="text-slate-700 text-sm mb-1">{it.trend_statement}</p>
            <p className="text-slate-500 text-sm">Consider: {it.consider_statement}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

