import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock analyze endpoint
app.post('/api/ot/analyze', (req, res) => {
  const mock = {
    ok: true,
    result: {
      plan: {
        ai_suggested_focus_area:
          'Focus on Consistency & Routines for 2–3 weeks; add brief sensory prep before tasks.',
        evidence_quotes: [
          '“Energy dips in afternoons; better carryover on structured days.”',
          '“Overwhelm reported on Tue/Wed — front-load supports.”',
        ],
      },
      insights: {
        insights: [
          {
            pillar_name: 'Daily Structure',
            pillar_score: 4,
            trend_statement: 'Inconsistent routines → variable performance.',
            consider_statement: 'Try 2–3 anchor activities + one visual checklist.',
          },
          {
            pillar_name: 'Self-Regulation',
            pillar_score: 5,
            trend_statement: 'Mild dysregulation under time pressure.',
            consider_statement: '2-min sensory prep; reduce simultaneous demands.',
          },
        ],
      },
    },
  };
  res.json(mock);
});

// Mock SOAP notes endpoint
app.post('/api/ot/soap_notes', (req, res) => {
  const { shorthand = '' } = req.body || {};
  const note = {
    S: `Client reports: ${shorthand || 'no subjective notes provided.'}`,
    O: 'Graded ADL sequencing x15 min; min verbal cues; tolerated well.',
    A: 'Improving task initiation and carryover vs last week; still needs cueing.',
    P: 'Continue graded ADLs; add HEP 3x/week; caregiver training next session.',
    missing_info: ['Pain level', 'Vitals start/end', 'Specific HEP details'],
  };
  res.json({ ok: true, note });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}`);
});