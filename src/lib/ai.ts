export type AnalyzeResult = {
  overview: {
    functional_findings: string;
    performance_factors: string;
    functional_impact: string;
    clinical_justification: string;
  };
  insights: {
    insights: Array<{
      pillar_name: string;
      pillar_score: number;
      trend_statement: string;
      consider_statement: string;
    }>;
  };
  plan?: unknown;
};

export async function analyzeAssessment(assessment: any, pillarNameMap?: Record<number,string>) {
  const res = await fetch("/api/ot/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessment, pillarNameMap }),
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  const { result } = await res.json();
  return result as AnalyzeResult;
}
