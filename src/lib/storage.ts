/* ----------------------------- Types ----------------------------- */
export type Observation = {
  id: string;
  dateISO: string;
  mood: number;
  note?: string;
  flagged?: boolean;
};

export type AssessmentResponses = {
  [pillarId: number]: { rating: number; answers: Record<string, string> };
};

export type ClientAI = {
  overview?: {
    functional_findings: string;
    performance_factors: string;
    functional_impact: string;
    clinical_justification: string;
  };
  insights?: Array<{
    pillar_name: string;
    pillar_score: number;
    trend_statement: string;
    consider_statement: string;
  }>;
  updatedISO?: string;
};

export type ClientRecord = {
  id: string;
  name?: string;
  dateISO: string;
  responses: AssessmentResponses;
  priorities: number[];
  ai?: ClientAI; // <-- AI summary/insights live here when saved via saveClientAI
};

/* -------------------------- JSON helpers ------------------------- */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/* ------------------------- Observations -------------------------- */
const obsKey = (clientId: string) => `obs:${clientId}`;

export function getObservations(clientId: string): Observation[] {
  return readJSON<Observation[]>(obsKey(clientId), []);
}

export function addObservation(
  clientId: string,
  input: { mood: number; note?: string }
) {
  const list = getObservations(clientId);
  const now = new Date().toISOString();
  const item: Observation = {
    id: `${Date.now()}`,
    dateISO: now,
    mood: Math.max(0, Math.min(10, input.mood ?? 0)),
    note: input.note?.trim() || undefined,
    flagged: false,
  };
  list.unshift(item);
  writeJSON(obsKey(clientId), list);
  return item;
}

export function setObservationFlag(clientId: string, id: string, flagged: boolean) {
  const list = getObservations(clientId);
  const i = list.findIndex((o) => o.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], flagged };
    writeJSON(obsKey(clientId), list);
  }
}

/* ---------------------------- Clients ---------------------------- */
const CLIENTS_KEY = 'clients';

export function getAllClients(): Record<string, ClientRecord> {
  return readJSON<Record<string, ClientRecord>>(CLIENTS_KEY, {});
}

export function getClient(id: string): ClientRecord | undefined {
  const all = getAllClients();
  return all[id];
}

export function saveClient(record: ClientRecord) {
  const all = getAllClients();
  all[record.id] = record;
  writeJSON(CLIENTS_KEY, all);
}

export function deleteClient(id: string) {
  const all = getAllClients();
  if (all[id]) {
    delete all[id];
    writeJSON(CLIENTS_KEY, all);
  }
  // also remove their observations
  localStorage.removeItem(obsKey(id));
}

export function clearAll() {
  // remove all clients
  localStorage.removeItem(CLIENTS_KEY);
  // remove all obs:* keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('obs:')) localStorage.removeItem(k);
  }
  // remove ai results map
  localStorage.removeItem(AI_RESULTS_KEY);
}

/* --------------------------- AI: Map API ------------------------- */
/** Separate map that AI App.tsx writes to via saveAIResults() */
const AI_RESULTS_KEY = 'ai_results';

export function saveAIResults(clientId: string, result: any) {
  const map = readJSON<Record<string, any>>(AI_RESULTS_KEY, {});
  map[clientId] = result;
  writeJSON(AI_RESULTS_KEY, map);
}

export function getAIResults(clientId: string): any | undefined {
  const map = readJSON<Record<string, any>>(AI_RESULTS_KEY, {});
  return map[clientId];
}

/**
 * Merge AI overview/insights directly into the client record
 * (used by AI ViewAssessment via storage.saveClientAI).
 */
export function saveClientAI(id: string, ai: ClientAI) {
  const all = getAllClients();
  const cur = all[id] ?? {
    id,
    name: 'Client',
    dateISO: new Date().toISOString(),
    responses: {},
    priorities: [],
  };
  all[id] = {
    ...cur,
    ai: {
      ...(cur.ai ?? {}),
      ...ai,
      updatedISO: new Date().toISOString(),
    },
  };
  writeJSON(CLIENTS_KEY, all);
}

/* --------------------------- Demo Seeder ------------------------- */
/** Call this from a temporary button in the app to re-fill demo clients. */
export function seedDemoClients() {
  const demo: Record<string, ClientRecord> = {
    'client-001': {
      id: 'client-001',
      name: 'Sarah Johnson',
      dateISO: new Date('2025-02-10').toISOString(),
      responses: {},
      priorities: [1, 2, 3],
    },
    'client-002': {
      id: 'client-002',
      name: 'Emma Rodriguez',
      dateISO: new Date('2025-03-05').toISOString(),
      responses: {},
      priorities: [2, 4, 5],
    },
    'client-003': {
      id: 'client-003',
      name: 'James Carter',
      dateISO: new Date('2025-04-18').toISOString(),
      responses: {},
      priorities: [1, 3, 6],
    },
  };

  const merged = { ...getAllClients(), ...demo };
  writeJSON(CLIENTS_KEY, merged);

  // seed a couple observations for each (once)
  const maybeSeedObs = (clientId: string) => {
    if (getObservations(clientId).length > 0) return;
    addObservation(clientId, { mood: 6, note: 'Felt a bit tired today.' });
    addObservation(clientId, { mood: 8, note: 'Energy improved after routine.' });
  };
  Object.keys(demo).forEach(maybeSeedObs);
}