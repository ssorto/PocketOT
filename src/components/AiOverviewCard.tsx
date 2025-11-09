import { Card } from "./ui/card";

type Props = {
  data?: {
    functional_findings: string;
    performance_factors: string;
    functional_impact: string;
    clinical_justification: string;
  };
};

export default function AiOverviewCard({ data }: Props) {
  if (!data) return null;

  return (
    <Card className="p-4 bg-white border-slate-200">
      <h4 className="text-slate-900 mb-3">AI Overview (OTPF-4)</h4>
      <div className="grid md:grid-cols-2 gap-3 text-sm leading-6">
        <div>
          <p className="text-slate-500">Functional Findings</p>
          <p className="text-slate-900">{data.functional_findings}</p>
        </div>
        <div>
          <p className="text-slate-500">Performance Factors</p>
          <p className="text-slate-900">{data.performance_factors}</p>
        </div>
        <div>
          <p className="text-slate-500">Functional Impact</p>
          <p className="text-slate-900">{data.functional_impact}</p>
        </div>
        <div>
          <p className="text-slate-500">Clinical Justification</p>
          <p className="text-slate-900">{data.clinical_justification}</p>
        </div>
      </div>
    </Card>
  );
}

