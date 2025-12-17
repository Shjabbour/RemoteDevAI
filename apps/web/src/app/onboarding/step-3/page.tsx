'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import StepCard from '@/components/onboarding/StepCard';
import QRCodeConnect from '@/components/onboarding/QRCodeConnect';

export default function Step3Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');

  useEffect(() => {
    // Generate random connection code
    setConnectionCode(Math.random().toString(36).substring(2, 8).toUpperCase());

    // Check for agent connection (simulate for now)
    const checkConnection = setInterval(() => {
      // In real app, check WebSocket for agent connection
    }, 2000);

    return () => clearInterval(checkConnection);
  }, []);

  const handleContinue = async () => {
    setLoading(true);

    try {
      await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 3,
          data: { connected: true },
        }),
      });

      router.push('/onboarding/step-4');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await fetch('/api/onboarding/skip-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 3 }),
      });
      router.push('/onboarding/step-4');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepCard
      title="Connect Your Desktop Agent"
      description="Link your desktop agent to start coding remotely"
      step={3}
      estimatedTime={2}
    >
      <div className="space-y-6">
        {/* Connection Status */}
        <div className={`p-4 rounded-lg border-2 ${connected ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
          <div className="flex items-center space-x-3">
            {connected ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {connected ? 'Connected!' : 'Waiting for connection...'}
              </div>
              <div className="text-sm text-gray-600">
                {connected ? 'Your desktop agent is connected' : 'Open the desktop app and scan the QR code'}
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Connection */}
        <QRCodeConnect connectionCode={connectionCode} />

        {/* Manual Code Entry */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Manual Connection</h3>
          <p className="text-sm text-gray-600 mb-3">
            Can't scan the QR code? Enter this code in the desktop app:
          </p>
          <div className="flex items-center space-x-2">
            <code className="flex-1 bg-white px-4 py-3 rounded border border-gray-300 font-mono text-lg text-center tracking-widest">
              {connectionCode}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(connectionCode)}
              className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Connection Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
            <li>Open the RemoteDevAI Desktop Agent</li>
            <li>Click "Connect" or "Scan QR Code"</li>
            <li>Scan the QR code above or enter the code manually</li>
            <li>Wait for connection confirmation</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Skip for now
          </button>

          <button
            onClick={handleContinue}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>
    </StepCard>
  );
}
