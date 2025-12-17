'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Video, Keyboard, Play, CheckCircle } from 'lucide-react';
import StepCard from '@/components/onboarding/StepCard';
import InteractiveTour from '@/components/onboarding/InteractiveTour';

export default function Step5Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completedFeatures, setCompletedFeatures] = useState<string[]>([]);

  const features = [
    {
      id: 'voice',
      title: 'Voice Input',
      description: 'Control AI with your voice',
      icon: Mic,
      demo: 'Try saying: "Create a new React component called Button"',
    },
    {
      id: 'recording',
      title: 'Screen Recording',
      description: 'Record your coding sessions',
      icon: Video,
      demo: 'Start a recording to capture your work',
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Work faster with hotkeys',
      icon: Keyboard,
      demo: 'Press Cmd/Ctrl + K to open command palette',
    },
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 5,
          data: { completed: true, featuresViewed: completedFeatures },
        }),
      });

      router.push('/onboarding/complete');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    router.push('/onboarding/complete');
  };

  return (
    <StepCard
      title="Quick Tutorial"
      description="Learn the basics: voice commands, screen recording, and more"
      step={5}
      estimatedTime={5}
    >
      <div className="space-y-6">
        {/* Interactive Tour */}
        <InteractiveTour />

        {/* Feature Cards */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Key Features:</h3>
          {features.map((feature) => {
            const Icon = feature.icon;
            const completed = completedFeatures.includes(feature.id);

            return (
              <div
                key={feature.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  completed
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    completed ? 'bg-green-500' : 'bg-blue-100'
                  }`}>
                    {completed ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    <p className="text-sm text-blue-600 mt-2 font-medium">{feature.demo}</p>
                    {!completed && (
                      <button
                        onClick={() => setCompletedFeatures([...completedFeatures, feature.id])}
                        className="mt-3 text-sm text-blue-600 hover:underline flex items-center"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Try it now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use voice commands while coding for hands-free control</li>
            <li>• Record sessions to review and share with your team</li>
            <li>• Press Cmd+K (Mac) or Ctrl+K (Windows) for quick actions</li>
            <li>• Connect mobile app for remote control anywhere</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Skip tutorial
          </button>

          <button
            onClick={handleComplete}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Finishing...' : 'Complete Tutorial'}
          </button>
        </div>
      </div>
    </StepCard>
  );
}
