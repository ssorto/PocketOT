import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

// Local types for this component
type ViewType = 'welcome' | 'assessment' | 'summary' | 'next-steps' | 'daily';

type PillarResponse = {
  pillarName: string;
  score: number;
  working: string;
  challenging: string;
};

type AssessmentData = {
  pillars: PillarResponse[];
  priorities: string[];
  completedDate: string;
};

interface AssessmentFlowProps {
  onComplete: (data: AssessmentData) => void;
  onNavigate: (view: ViewType) => void;
}

const pillars = [
  {
    name: 'Physical Performance Optimization',
    question: 'From 1–10, how energized and physically capable do you feel in your daily life?',
    color: 'teal'
  },
  {
    name: 'Cognitive Function Optimization',
    question: 'From 1–10, how focused, clear, and mentally sharp do you feel day to day?',
    color: 'blue'
  },
  {
    name: 'Emotional Wellbeing Optimization',
    question: 'From 1–10, how calm and emotionally grounded do you feel most days?',
    color: 'purple'
  },
  {
    name: 'Purposeful Living',
    question: 'From 1–10, how aligned do your daily actions feel with your deeper goals and values?',
    color: 'indigo'
  },
  {
    name: 'Meaningful Engagement',
    question: 'From 1–10, how engaged and motivated do you feel in your routines, relationships, and responsibilities?',
    color: 'rose'
  },
  {
    name: 'Environmental Design for Optimized Performance',
    question: 'From 1–10, how well does your environment (home, work, school) support your focus, energy, and wellbeing?',
    color: 'emerald'
  }
];

export function AssessmentFlow({ onComplete, onNavigate }: AssessmentFlowProps) {
  const [currentPillarIndex, setCurrentPillarIndex] = useState(0);
  const [showPriorities, setShowPriorities] = useState(false);
  const [responses, setResponses] = useState<PillarResponse[]>(
    pillars.map(p => ({
      pillarName: p.name,
      score: 5,
      working: '',
      challenging: ''
    }))
  );
  const [priorities, setPriorities] = useState<string[]>([]);

  const currentPillar = pillars[currentPillarIndex];
  const currentResponse = responses[currentPillarIndex];
  const totalPillars = pillars.length;
  const progress = ((currentPillarIndex + 1) / totalPillars) * 100;

  const updateResponse = (field: keyof PillarResponse, value: any) => {
    const newResponses = [...responses];
    newResponses[currentPillarIndex] = {
      ...newResponses[currentPillarIndex],
      [field]: value
    };
    setResponses(newResponses);
  };

  const handleNext = () => {
    if (currentPillarIndex < totalPillars - 1) {
      setCurrentPillarIndex(currentPillarIndex + 1);
    } else {
      setShowPriorities(true);
    }
  };

  const handleBack = () => {
    if (showPriorities) {
      setShowPriorities(false);
    } else if (currentPillarIndex > 0) {
      setCurrentPillarIndex(currentPillarIndex - 1);
    }
  };

  const togglePriority = (pillarName: string) => {
    if (priorities.includes(pillarName)) {
      setPriorities(priorities.filter(p => p !== pillarName));
    } else if (priorities.length < 3) {
      setPriorities([...priorities, pillarName]);
    }
  };

  const handleComplete = () => {
    const assessmentData: AssessmentData = {
      pillars: responses,
      priorities,
      completedDate: new Date().toISOString()
    };
    onComplete(assessmentData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
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

          {!showPriorities && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 text-slate-600">
                <span>Pillar {currentPillarIndex + 1} of {totalPillars}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pillar Assessment */}
        {!showPriorities ? (
          <Card className="p-8 bg-white/90 backdrop-blur shadow-xl border-0">
            <div className="space-y-8">
              {/* Pillar Title */}
              <div>
                <h2 className="text-slate-900 mb-3">{currentPillar.name}</h2>
                <p className="text-slate-700 leading-relaxed">
                  {currentPillar.question}
                </p>
              </div>

              {/* Score Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Your rating</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900">{currentResponse.score}</span>
                    <span className="text-slate-400">/10</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentResponse.score}
                    onChange={(e) => updateResponse('score', Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200"
                  />
                  <div className="flex justify-between mt-2 text-slate-400">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Reflection Questions */}
              <div className="space-y-6 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    What's working well in this area?
                  </Label>
                  <Textarea
                    placeholder="Take a moment to reflect on your strengths here..."
                    value={currentResponse.working}
                    onChange={(e) => updateResponse('working', e.target.value)}
                    rows={3}
                    className="resize-none bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">
                    What feels challenging or out of balance?
                  </Label>
                  <Textarea
                    placeholder="It's okay to acknowledge difficulties. What needs attention?"
                    value={currentResponse.challenging}
                    onChange={(e) => updateResponse('challenging', e.target.value)}
                    rows={3}
                    className="resize-none bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>
            </div>
          </Card>
        ) : (
          /* Priorities Selection */
          <Card className="p-8 bg-white/90 backdrop-blur shadow-xl border-0">
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-3">Choose Your Focus</h2>
                <p className="text-slate-600 leading-relaxed">
                  Select 1–3 areas you'd like to prioritize for improvement. These will guide your personalized insights.
                </p>
              </div>

              <div className="space-y-3">
                {pillars.map((pillar) => {
                  const response = responses.find(r => r.pillarName === pillar.name);
                  const isSelected = priorities.includes(pillar.name);
                  const canSelect = priorities.length < 3 || isSelected;

                  return (
                    <div
                      key={pillar.name}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50'
                          : canSelect
                          ? 'border-slate-200 hover:border-slate-300'
                          : 'border-slate-100 opacity-50'
                      } ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      onClick={() => canSelect && togglePriority(pillar.name)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={!canSelect}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="text-slate-900 mb-1">{pillar.name}</h4>
                          <p className="text-slate-600">Score: {response?.score}/10</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-slate-500 pt-2">
                {priorities.length === 0 && 'Select at least 1 area to continue'}
                {priorities.length === 1 && 'You can select up to 2 more areas'}
                {priorities.length === 2 && 'You can select 1 more area'}
                {priorities.length === 3 && 'Maximum 3 areas selected'}
              </div>
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentPillarIndex === 0 && !showPriorities}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>

          {!showPriorities ? (
            <Button onClick={handleNext} size="lg">
              {currentPillarIndex === totalPillars - 1 ? 'Continue' : 'Next Pillar'}
              <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={priorities.length === 0}
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-blue-500"
            >
              <Check className="size-4 mr-2" />
              Complete Assessment
            </Button>
          )}
        </div>

        {/* Encouraging Message */}
        {!showPriorities && (
          <div className="text-center mt-8 text-slate-500 italic">
            "Take your time. There are no wrong answers."
          </div>
        )}
      </div>
    </div>
  );
}