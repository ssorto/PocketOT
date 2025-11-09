// src/App.tsx — baseline wiring with toggle & working transfer
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

// Storage
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

  // single client id we keep across modes so data links up
  const [selectedClientId, setSelectedClientId] = useStoredState<string>('selectedClientId', 'client-001');

  // force therapist observations screen to refresh after client saves
  const [obsRefreshKey, setObsRefreshKey] = React.useState(0);

  // client assessment state (not persisted on purpose)
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

  const handleSummaryComplete = async (priorities: number[]) => {
    setSelectedPriorities(priorities);

    const id = selectedClientId || 'client-001';
    const record: storage.ClientRecord = {
      id,
      name: 'Demo Client', // replace later with a real captured name
      dateISO: new Date().toISOString(),
      responses: assessmentResponses,
      priorities,
    };
    storage.saveClient(record);
    setSelectedClientId(id);

    // Trigger AI analysis
    try {
      const aiResults = await analyzeAssessment(record);
      storage.saveAIResults(id, aiResults);
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Continue anyway - don't block the user flow
    }

    setClientView('thank-you');
  };

  /* -------- therapist nav -------- */
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

      {/* Toggle + current clientId (tiny debug badge) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end">
        <Button
          onClick={toggleUserMode}
          className={`shadow-lg ${
            userRole === 'therapist' ? 'bg-slate-700 hover:bg-slate-800' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {userRole === 'client' ? (
            <>
              <Users className="size-4 mr-2" />
              Switch to Therapist View
            </>
          ) : (
            <>
              <User className="size-4 mr-2" />
              Switch to Client View
            </>
          )}
        </Button>
        <div className="text-xs bg-black/70 text-white px-2 py-1 rounded">clientId: {selectedClientId}</div>
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

// test line
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