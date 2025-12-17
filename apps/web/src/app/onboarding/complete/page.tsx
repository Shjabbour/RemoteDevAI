'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper, CheckCircle, ArrowRight } from 'lucide-react';

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Create confetti effect (in real app, use canvas-confetti library)
      // For now, we'll just log it
      console.log('Confetti!', particleCount);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Mark onboarding as completed
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Confetti Animation */}
        <div className="mb-8 relative">
          <div className="inline-block relative">
            <PartyPopper className="w-24 h-24 text-purple-600 animate-bounce" />
            <div className="absolute inset-0 animate-ping">
              <PartyPopper className="w-24 h-24 text-purple-400 opacity-75" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          You're All Set! 🎉
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Welcome to RemoteDevAI! Your account is ready to go.
        </p>

        {/* Summary Cards */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What's Next?</h2>

          <div className="grid gap-4 text-left">
            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Profile Setup Complete</h3>
                <p className="text-sm text-gray-600">Your profile is configured and ready</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">🚀</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Start Your First Session</h3>
                <p className="text-sm text-gray-600">Create a project and start coding with AI</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">📱</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Download Mobile App</h3>
                <p className="text-sm text-gray-600">Control your AI from anywhere with our mobile app</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Quick Tips:</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>• Press <kbd className="px-2 py-1 bg-blue-200 rounded text-xs font-mono">Cmd+K</kbd> or <kbd className="px-2 py-1 bg-blue-200 rounded text-xs font-mono">Ctrl+K</kbd> to open the command palette</li>
            <li>• Check out our <a href="/docs" className="underline">documentation</a> for detailed guides</li>
            <li>• Join our <a href="/community" className="underline">community Discord</a> for support and tips</li>
            <li>• Explore <a href="/dashboard/settings" className="underline">settings</a> to customize your experience</li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          disabled={loading}
          className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 inline-flex items-center space-x-3"
        >
          <span>{loading ? 'Loading...' : 'Go to Dashboard'}</span>
          <ArrowRight className="w-6 h-6" />
        </button>

        {/* Footer Note */}
        <p className="mt-8 text-sm text-gray-500">
          Need help getting started?{' '}
          <a href="/docs/getting-started" className="text-blue-600 hover:underline">
            View our getting started guide
          </a>
        </p>
      </div>
    </div>
  );
}
