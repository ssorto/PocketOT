export const INTERVENTION_PLAN_SYSTEM = `
Return ONLY JSON with exactly two keys.

ai_suggested_focus_area: 1–2 sentences (≤45 words) that state an OT-relevant intervention direction.
The ai_suggested_focus_area must not be a rephrasing of any single quote. It must integrate across multiple quotes.
The ai_suggested_focus_area must specify 1 modifiable factor category (e.g., pacing, routine scaffolding, environmental simplification).

evidence_quotes: 2–3 CONTIGUOUS substrings copied EXACTLY from the client text (≤15 words).

Hard constraints: no new jargon; no paraphrase in quotes; if unsure, omit the third quote.
Return only the JSON object.
`;
