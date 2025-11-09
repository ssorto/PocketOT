import type { ClientAssessment } from "../types/shared";

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

const A_KEY = "assessments";
const R_KEY = "ai_results";

function getMap<T>(key:string): Record<string,T> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}
function setMap<T>(key:string, map: Record<string,T>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(map));
}

export function saveAssessment(clientId: string, a: ClientAssessment) {
  const m = getMap<ClientAssessment>(A_KEY); m[clientId]=a; setMap(A_KEY,m);
}
export function getAssessment(clientId: string): ClientAssessment | undefined {
  return getMap<ClientAssessment>(A_KEY)[clientId];
}

export function saveAIResults(clientId: string, r: any) {
  const m = getMap<any>(R_KEY); m[clientId]=r; setMap(R_KEY,m);
}
export function getAIResults(clientId: string): any | undefined {
  return getMap<any>(R_KEY)[clientId];
}

// ClientRecord type and storage functions
export type ClientRecord = {
  id: string;
  name: string;
  dateISO: string;
  responses: Record<number, { rating: number; answers: Record<string, string> }>;
  priorities: number[];
  ai?: ClientAI;
};

const C_KEY = "clients";

export function getAllClients(): Record<string, ClientRecord> {
  return getMap<ClientRecord>(C_KEY);
}

export function saveClient(record: ClientRecord) {
  const m = getAllClients();
  m[record.id] = record;
  setMap(C_KEY, m);
}

export function getClient(id: string): ClientRecord | undefined {
  return getAllClients()[id];
}

export function deleteClient(id: string) {
  const m = getAllClients();
  delete m[id];
  setMap(C_KEY, m);
}

export function clearAll() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(C_KEY);
  localStorage.removeItem(A_KEY);
  localStorage.removeItem(R_KEY);
}

export type Observation = {
  id: string;
  dateISO: string;
  text: string;
  mood: number;
  flagged: boolean;
};

export function getObservations(clientId: string): Observation[] {
  const key = `observations_${clientId}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function addObservation(clientId: string, observation: Observation) {
  const key = `observations_${clientId}`;
  const observations = getObservations(clientId);
  observations.push(observation);
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(observations));
  }
}

export function setObservationFlag(clientId: string, obsId: string, flagged: boolean) {
  const key = `observations_${clientId}`;
  const observations = getObservations(clientId);
  const updated = observations.map(obs => obs.id === obsId ? { ...obs, flagged } : obs);
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(updated));
  }
}

function readAll(): Record<string, ClientRecord> {
  return getAllClients();
}

function writeAll(all: Record<string, ClientRecord>) {
  setMap(C_KEY, all);
}

export function saveClientAI(id: string, ai: ClientAI) {
  const all = readAll();
  const cur = all[id] ?? { id, dateISO: new Date().toISOString(), responses: {}, priorities: [] };
  all[id] = { ...cur, ai: { ...cur.ai, ...ai, updatedISO: new Date().toISOString() } };
  writeAll(all);
}

