// src/App.tsx — your design + always-ask-name + AI analysis on save
import React from 'react';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';

// Client views
import { ClientHome } from './components/ClientHome';
import { AssessmentIntro } from './components/AssessmentIntro';
import { AssessmentThankYou } from './components/AssessmentThankYou';
import { ClientPillarAssessment } from './components/ClientPillarAssessment';
import { ClientSummary } from './components/ClientSummary';
import { ClientComplete } from './components/ClientComplete';
import { WellnessAssessment } from './components/WellnessAssessment';
import { ClientDashboard } from './components/ClientDashboard';
import { DailyObservation } from './components/DailyObservation';

// Therapist views
import { TherapistDashboard } from './components/TherapistDashboard';
import { ViewAssessment } from './components/ViewAssessment';
import { DailyObservationViewer } from './components/DailyObservationViewer';
import { InterventionPlan } from './components/InterventionPlan';
import SessionNotes from './components/SessionNotes';
import { TherapistComms } from './components/TherapistComms';
import { Users, User } from 'lucide-react';

// Data
import { pillarData } from './data/pillarData';

// Storage + AI
import * as storage from './lib/storage';
import { analyzeAssessment } from './lib/ai';

/* ---------------- types ---------------- */
type ClientView =
  | 'home'
  | 'assessment-intro'
  | 'pillar-assessment'
  | 'summary'
  | 'thank-you'
  | 'complete'
  | 'dashboard'
  | 'wellness'
  | 'daily-observation';

type TherapistView =
  | 'dashboard'
  | 'view-assessment'
  | 'interventions'
  | 'session-notes'
  | 'daily-observations'
  | 'comms';

type UserRole = 'client' | 'therapist';

type AssessmentResponses = {
  [pillarId: number]: { rating: number; answers: Record<string, string> };
};

/* ----- tiny persisted state helper ----- */
function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/* --------------- app ------------------- */
export default function App() {
  const [userRole, setUserRole] = React.useState<UserRole>('client');
  const [clientView, setClientView] = React.useState<ClientView>('home');
  const [therapistView, setTherapistView] = React.useState<TherapistView>('dashboard');

  // keep the same client ID across modes so data links up
  const [selectedClientId, setSelectedClientId] = useStoredState<string>('selectedClientId', 'client-001');

  // store the client name (we prompt every assessment start)
  const [clientName, setClientName] = useStoredState<string>('clientName', '');

  // refresh therapist observation list when client saves
  const [obsRefreshKey, setObsRefreshKey] = React.useState(0);

  // assessment flow state
  const [currentPillarIndex, setCurrentPillarIndex] = React.useState(0);
  const [assessmentResponses, setAssessmentResponses] = React.useState<AssessmentResponses>({});
  const [selectedPriorities, setSelectedPriorities] = React.useState<number[]>([]);

  const toggleUserMode = () => {
    setUserRole((prev) => (prev === 'client' ? 'therapist' : 'client'));
    if (userRole === 'client') setTherapistView('dashboard');
    else setClientView('home');
  };

  /* -------- client flow -------- */
  const handleStartAssessment = () => {
    // Always ask name before each new assessment
    const entered = window.prompt("Before we begin, what’s your name?");
    if (!entered || !entered.trim()) {
      alert('Please enter your name to start the assessment.');
      return;
    }
    setClientName(entered.trim());

    // Reset and start fresh
    setCurrentPillarIndex(0);
    setAssessmentResponses({});
    setSelectedPriorities([]);
    setClientView('assessment-intro');
  };

  const handleBeginPillars = () => setClientView('pillar-assessment');

  const handlePillarNext = (responses: { rating: number; answers: Record<string, string> }) => {
    const currentPillar = pillarData[currentPillarIndex];
    setAssessmentResponses((prev) => ({ ...prev, [currentPillar.id]: responses }));
    if (currentPillarIndex < pillarData.length - 1) setCurrentPillarIndex((i) => i + 1);
    else setClientView('summary');
  };

  // Save, run AI, then go to Thank You
  const handleSummaryComplete = async (priorities: number[]) => {
    setSelectedPriorities(priorities);

    const id = selectedClientId || 'client-001';
    const record: storage.ClientRecord = {
      id,
      name: clientName.trim() || 'Client',
      dateISO: new Date().toISOString(),
      responses: assessmentResponses,
      priorities,
    };

    // Save the raw assessment
    storage.saveClient(record);
    setSelectedClientId(id);

    // Kick off AI analysis (non-blocking)
    try {
      const ai = await analyzeAssessment(record);
      if (typeof (storage as any).saveAIResults === 'function') {
        (storage as any).saveAIResults(id, ai);
      } else {
        localStorage.setItem(`ai:${id}`, JSON.stringify(ai));
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
    }

    setClientView('thank-you');
  };

  /* -------- therapist navigation -------- */
  const handleViewAssessment = (clientId: string) => {
    setSelectedClientId(clientId);
    setTherapistView('view-assessment');
  };
  const handleBackToDashboard = () => setTherapistView('dashboard');

  const handleViewObservations = (clientId: string) => {
    setSelectedClientId(clientId);
    setTherapistView('daily-observations');
  };
  const handleBackToAssessment = () => setTherapistView('view-assessment');

  const handleViewInterventions = (clientId: string) => {
    setSelectedClientId(clientId);
    setTherapistView('interventions');
  };
  const handleViewSessionNotes = (clientId: string) => {
    setSelectedClientId(clientId);
    setTherapistView('session-notes');
  };
  const handleOpenComms = (clientId: string) => {
    setSelectedClientId(clientId);
    setTherapistView('comms');
  };

  const getSummaryPillars = () =>
    pillarData.map((pillar) => ({
      id: pillar.id,
      name: pillar.name,
      subtitle: pillar.subtitle,
      score: assessmentResponses[pillar.id]?.rating || 5,
      color: pillar.color,
    }));

  return (
    <div className="min-h-screen">
      <Toaster />

      {/* compact toggle — bottom-right, out of the way */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleUserMode}
          className={`shadow-lg ${
            userRole === 'therapist'
              ? 'bg-slate-700 hover:bg-slate-800'
              : 'bg-teal-600 hover:bg-teal-700'
          } text-xs px-3 py-2`}
          title="Switch view"
        >
          {userRole === 'client' ? (
            <>
              <Users className="size-3 mr-2" />
              Therapist
            </>
          ) : (
            <>
              <User className="size-3 mr-2" />
              Client
            </>
          )}
        </Button>
      </div>

      {/* CLIENT MODE */}
      {userRole === 'client' && (
        <>
          {clientView === 'home' && (
            <ClientHome
              onStartAssessment={handleStartAssessment}
              onDailyObservation={() => setClientView('daily-observation')}
              onScheduleConsultation={() => alert('Schedule coming soon')}
            />
          )}

          {clientView === 'assessment-intro' && <AssessmentIntro onBeginPillars={handleBeginPillars} />}

          {clientView === 'pillar-assessment' && (
            <ClientPillarAssessment
              pillarData={pillarData[currentPillarIndex]}
              currentStep={currentPillarIndex + 1}
              totalSteps={pillarData.length}
              onNext={handlePillarNext}
              onBack={currentPillarIndex > 0 ? () => setCurrentPillarIndex((i) => i - 1) : undefined}
            />
          )}

          {clientView === 'summary' && (
            <ClientSummary
              pillars={getSummaryPillars()}
              onComplete={handleSummaryComplete}
              onBack={() => setCurrentPillarIndex(pillarData.length - 1)}
            />
          )}

          {clientView === 'thank-you' && (
            <AssessmentThankYou
              onReturnHome={() => setClientView('home')}
              onScheduleConsultation={() => alert('Schedule coming soon')}
            />
          )}

          {clientView === 'complete' && (
            <ClientComplete
              onReturnHome={() => setClientView('home')}
              onScheduleConsultation={() => alert('Schedule coming soon')}
            />
          )}

          {clientView === 'dashboard' && (
            <ClientDashboard onNavigate={(v) => setClientView(v as ClientView)} />
          )}

          {clientView === 'daily-observation' && (
            <DailyObservation
              clientId={selectedClientId}
              onBack={() => setClientView('home')}
              onSaved={() => setObsRefreshKey((k) => k + 1)}
            />
          )}

          {clientView === 'wellness' && (
            <WellnessAssessment onNavigate={(view) => setClientView(view as ClientView)} />
          )}
        </>
      )}

      {/* THERAPIST MODE */}
      {userRole === 'therapist' && (
        <>
          {therapistView === 'dashboard' && (
            <TherapistDashboard
              onViewAssessment={handleViewAssessment}
              onViewInterventions={handleViewInterventions}
              onAddClient={() => alert('Add client soon')}
              onScheduleSession={() => alert('Schedule soon')}
            />
          )}

          {therapistView === 'view-assessment' && (
            <ViewAssessment
              clientId={selectedClientId}
              onBack={handleBackToDashboard}
              onViewObservations={handleViewObservations}
              onViewInterventions={handleViewInterventions}
              onViewSessionNotes={handleViewSessionNotes}
            />
          )}

          {therapistView === 'daily-observations' && (
            <DailyObservationViewer
              clientId={selectedClientId}
              refreshKey={obsRefreshKey}
              onBack={handleBackToAssessment}
            />
          )}

          {therapistView === 'interventions' && (
            <InterventionPlan clientId={selectedClientId} onBack={() => setTherapistView('view-assessment')} />
          )}

          {therapistView === 'session-notes' && (
            <SessionNotes clientId={selectedClientId} onBack={() => setTherapistView('view-assessment')} />
          )}

          {therapistView === 'comms' && (
            <TherapistComms clientId={selectedClientId} onBack={() => setTherapistView('view-assessment')} />
          )}
        </>
      )}
    </div>
  );
}