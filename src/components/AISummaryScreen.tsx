import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Sparkles, ArrowLeft, TrendingUp, AlertCircle, Target, Calendar } from 'lucide-react';

// Local types for this component
type ViewType = 'welcome' | 'assessment' | 'summary' | 'next-steps' | 'daily';

type PillarData = {
  pillarName: string;
  score: number;
  working?: string;
  challenging?: string;
};

type AssessmentData = {
  pillars: PillarData[];
  priorities: string[];
  completedDate: string;
};

interface AISummaryScreenProps {
  assessmentData: AssessmentData | null;
  onNavigate: (view: ViewType) => void;
}

export function AISummaryScreen({ assessmentData, onNavigate }: AISummaryScreenProps) {
  if (!assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-slate-600 mb-4">No assessment data available yet.</p>
          <Button onClick={() => onNavigate('assessment')}>
            Start Your Assessment
          </Button>
        </Card>
      </div>
    );
  }

  // Calculate insights
  const strengths = assessmentData.pillars
    .filter(p => p.score >= 8)
    .sort((a, b) => b.score - a.score);

  const barriers = assessmentData.pillars
    .filter(p => p.score <= 5)
    .sort((a, b) => a.score - b.score);

  const priorityPillars = assessmentData.pillars.filter(p =>
    assessmentData.priorities.includes(p.pillarName)
  );

  return (
    <div className="min-h-screen p-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => onNavigate('welcome')}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Welcome
          </Button>
        </div>

        {/* Title Card */}
        <Card className="p-8 mb-6 bg-gradient-to-br from-teal-50 to-blue-50 border-0 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="size-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="size-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-slate-900 mb-2">Here's what we discovered together</h1>
              <p className="text-slate-600">
                Completed on {new Date(assessmentData.completedDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </Card>

        {/* Strengths */}
        {strengths.length > 0 && (
          <Card className="p-8 mb-6 bg-white/90 backdrop-blur border-0 shadow-lg">
            <div className="flex items-start gap-3 mb-6">
              <TrendingUp className="size-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-slate-900 mb-1">Your Strengths</h2>
                <p className="text-slate-600">
                  These areas are serving you well. They're foundations you can build on.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {strengths.map((pillar) => (
                <div key={pillar.pillarName} className="border-l-4 border-green-400 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-slate-900">{pillar.pillarName}</h4>
                    <Badge className="bg-green-100 text-green-700">
                      {pillar.score}/10
                    </Badge>
                  </div>
                  {pillar.working && (
                    <p className="text-slate-600 italic">"{pillar.working}"</p>
                   )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Barriers */}
        {barriers.length > 0 && (
          <Card className="p-8 mb-6 bg-white/90 backdrop-blur border-0 shadow-lg">
            <div className="flex items-start gap-3 mb-6">
              <AlertCircle className="size-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-slate-900 mb-1">Areas Needing Attention</h2>
                <p className="text-slate-600">
                  It's okay to have challenges. Recognizing them is the first step toward change.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {barriers.map((pillar) => (
                <div key={pillar.pillarName} className="border-l-4 border-amber-400 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-slate-900">{pillar.pillarName}</h4>
                    <Badge className="bg-amber-100 text-amber-700">
                      {pillar.score}/10
                    </Badge>
                  </div>
                  {pillar.challenging && (
                    <p className="text-slate-600 italic">"{pillar.challenging}"</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Focus Areas */}
        <Card className="p-8 mb-6 bg-white/90 backdrop-blur border-0 shadow-lg">
          <div className="flex items-start gap-3 mb-6">
            <Target className="size-6 text-teal-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-slate-900 mb-1">Your Focus Areas</h2>
              <p className="text-slate-600">
                You've chosen to prioritize these areas. Small, consistent steps will make a difference.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {priorityPillars.map((pillar) => (
              <div
                key={pillar.pillarName}
                className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-slate-900">{pillar.pillarName}</h4>
                  <Badge className="bg-teal-100 text-teal-700">
                    Current: {pillar.score}/10
                  </Badge>
                </div>
                
                {pillar.challenging && (
                  <div className="mb-3">
                    <p className="text-slate-600 mb-1">Challenge identified:</p>
                    <p className="text-slate-700 italic">"{pillar.challenging}"</p>
                  </div>
                )}

                <div className="bg-white/80 rounded-lg p-3 mt-3">
                  <p className="text-slate-700">
                    <strong>Suggested focus:</strong> {getRecommendation(pillar.pillarName, pillar.score)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Supportive Message */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-0">
          <p className="text-slate-700 leading-relaxed text-center italic">
            "Remember: This is a journey, not a destination. Progress happens in small moments, 
            and you're already taking important steps by being here."
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-blue-500"
            onClick={() => onNavigate('next-steps')}
          >
            <Calendar className="size-4 mr-2" />
            Set a Goal or Schedule a Consultation
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate('daily')}
          >
            Start Daily Observations
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate('assessment')}
          >
            Retake Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate contextual recommendations
function getRecommendation(pillarName: string, score: number): string {
  const recommendations: Record<string, string[]> = {
    'Physical Performance Optimization': [
      'Start with gentle movement each morning—even 5 minutes counts.',
      'Notice when your energy is highest and protect that time for important activities.',
      'Consider small adjustments to your daily routine that honor your body\'s needs.'
    ],
    'Cognitive Function Optimization': [
      'Try single-tasking instead of multitasking for just one activity today.',
      'Create simple routines that reduce decision fatigue.',
      'Build in short mental breaks between focused work periods.'
    ],
    'Emotional Wellbeing Optimization': [
      'Practice one moment of intentional breathing when you notice stress building.',
      'Identify one emotion you\'re feeling right now without judgment.',
      'Connect with one person who helps you feel grounded.'
    ],
    'Purposeful Living': [
      'Write down one thing that truly matters to you and why.',
      'Choose one daily action that reflects your deeper values.',
      'Notice moments when you feel most aligned and authentic.'
    ],
    'Meaningful Engagement': [
      'Identify one activity that naturally draws your attention and energy.',
      'Set a small, achievable goal that connects to something you care about.',
      'Reflect on what "meaningful" looks like for you personally.'
    ],
    'Environmental Design for Optimized Performance': [
      'Make one small change to your space that supports how you want to feel.',
      'Notice what in your environment drains you versus what energizes you.',
      'Create one designated area for an activity that matters to you.'
    ]
  };

  const pillarRecs = recommendations[pillarName] || ['Focus on small, sustainable changes.'];
  return pillarRecs[Math.floor(Math.random() * pillarRecs.length)];
}