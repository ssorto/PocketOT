import "dotenv/config";
import express from "express";
import cors from "cors";
import { jsonSchemaChat } from "../src/server/openai";

import { OVERVIEW_SYSTEM } from "../src/ai/overview_otpf4_system";
import { PILLAR_INSIGHT_SYSTEM } from "../src/ai/pillar_insight_system";
import { INTERVENTION_PLAN_SYSTEM } from "../src/ai/intervention_plan_system";
import { SOAP_NOTES_SYSTEM } from "../src/ai/soap_notes_system";

const app = express();
app.use(cors());
app.use(express.json());

// Single endpoint that runs all 3 calls
app.post("/api/ot/analyze", async (req, res) => {
  try {
    const { assessment, pillarNameMap } = req.body;

    const insightsUser = {
      selected_top3: assessment.selectedTop3,
      scores: Object.fromEntries(Object.entries(assessment.responses).map(([pid, r]: any) => [pid, r.rating])),
      reflections: Object.fromEntries(Object.entries(assessment.responses).map(([pid, r]: any) => [pid, r.answers])),
      pillar_name_map: pillarNameMap ?? { 1:"physical",2:"cognitive",3:"emotional",4:"environment",5:"engagement",6:"purpose" }
    };

    const stitchedText = Object.values(assessment.responses)
      .map((r: any) => Object.values(r.answers).join(" "))
      .join(" ");

    const [overview, insights, plan] = await Promise.all([
      jsonSchemaChat({
        system: OVERVIEW_SYSTEM,
        user: assessment,
        schemaName: "overview",
        schema: {
          type: "object",
          properties: {
            functional_findings: { type: "string" },
            performance_factors: { type: "string" },
            functional_impact: { type: "string" },
            clinical_justification: { type: "string" },
          },
          required: ["functional_findings","performance_factors","functional_impact","clinical_justification"],
          additionalProperties: false,
        },
      }),
      jsonSchemaChat({
        system: PILLAR_INSIGHT_SYSTEM,
        user: insightsUser,
        schemaName: "pillar_insights",
        schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pillar_name: { type: "string" },
                  pillar_score: { type: "number" },
                  trend_statement: { type: "string" },
                  consider_statement: { type: "string" },
                },
                required: ["pillar_name","pillar_score","trend_statement","consider_statement"],
              },
            },
          },
          required: ["insights"],
          additionalProperties: false,
        },
      }),
      jsonSchemaChat({
        system: INTERVENTION_PLAN_SYSTEM,
        user: { text: stitchedText },
        schemaName: "plan",
        schema: {
          type: "object",
          properties: {
            ai_suggested_focus_area: { type: "string" },
            evidence_quotes: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
          },
          required: ["ai_suggested_focus_area","evidence_quotes"],
          additionalProperties: false,
        },
      }),
    ]);

    res.json({ ok: true, result: { overview, insights, plan } });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ ok: false, error: e?.message || "error" });
  }
});

// SOAP notes endpoint
app.post("/api/ot/soap_notes", async (req, res) => {
    try {
      const { shorthand, clientContext } = req.body;
  
      if (!shorthand || !shorthand.trim()) {
        return res.status(400).json({ ok: false, error: "shorthand is required" });
      }
  
      const note = await jsonSchemaChat({
        system: SOAP_NOTES_SYSTEM,
        user: { shorthand, clientContext },
        schemaName: "clinical_note",
        schema: {
          type: "object",
          properties: {
            bullets: { type: "array", items: { type: "string" } },
            missing_info: { type: "array", items: { type: "string" } }
          },
          required: ["bullets", "missing_info"],
          additionalProperties: false,
        },
      });
  
      res.json({ ok: true, note });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ ok: false, error: e?.message || "error" });
    }
  });
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  