'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, MonitorCheck, Apple, ExternalLink } from 'lucide-react';
import StepCard from '@/components/onboarding/StepCard';
import PlatformDownload from '@/components/onboarding/PlatformDownload';

export default function Step2Page() {
  const router = useRouter();
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Detect user's platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setPlatform('macos');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    } else {
      setPlatform('windows');
    }
  }, []);

  const handleDownload = async () => {
    setLoading(true);

    try {
      // Track download
      await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 2,
          data: {
            platform,
            downloaded: true,
          },
        }),
      });

      // In a real app, trigger actual download
      alert('Download will start shortly!');

      // Move to next step after short delay
      setTimeout(() => {
        router.push('/onboarding/step-3');
      }, 1000);
    } catch (error) {
      console.error('Error tracking download:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      await fetch('/api/onboarding/skip-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ step: 2 }),
      });

      router.push('/onboarding/step-3');
    } catch (error) {
      console.error('Error skipping step:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepCard
      title="Download Desktop Agent"
      description="Install the desktop agent to control your local development environment"
      step={2}
      estimatedTime={3}
    >
      <div className="space-y-6">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select your platform
          </label>
          <div className="flex space-x-3">
            <button
              onClick={() => setPlatform('windows')}
              className={`
                flex-1 p-4 rounded-lg border-2 transition-all
                ${
                  platform === 'windows'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <MonitorCheck className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">Windows</div>
              <div className="text-xs text-gray-500 mt-1">10, 11</div>
            </button>

            <button
              onClick={() => setPlatform('macos')}
              className={`
                flex-1 p-4 rounded-lg border-2 transition-all
                ${
                  platform === 'macos'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Apple className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">macOS</div>
              <div className="text-xs text-gray-500 mt-1">10.15+</div>
            </button>

            <button
              onClick={() => setPlatform('linux')}
              className={`
                flex-1 p-4 rounded-lg border-2 transition-all
                ${
                  platform === 'linux'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="text-2xl mx-auto mb-2">🐧</div>
              <div className="font-medium">Linux</div>
              <div className="text-xs text-gray-500 mt-1">Ubuntu, Debian</div>
            </button>
          </div>
        </div>

        {/* Download Component */}
        <PlatformDownload platform={platform} />

        {/* Installation Instructions */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <span className="text-blue-600 mr-2">📝</span>
            Installation Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            {platform === 'windows' && (
              <>
                <li>Download the installer (.exe file)</li>
                <li>Run the installer as administrator</li>
                <li>Follow the installation wizard</li>
                <li>Launch RemoteDevAI Desktop Agent</li>
              </>
            )}
            {platform === 'macos' && (
              <>
                <li>Download the installer (.dmg file)</li>
                <li>Open the .dmg file</li>
                <li>Drag RemoteDevAI to Applications folder</li>
                <li>Launch from Applications</li>
              </>
            )}
            {platform === 'linux' && (
              <>
                <li>Download the package (.deb or .appimage)</li>
                <li>Install using your package manager</li>
                <li>Or make the AppImage executable: chmod +x</li>
                <li>Launch RemoteDevAI Desktop Agent</li>
              </>
            )}
          </ol>
        </div>

        {/* System Requirements */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">System Requirements</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 4GB RAM minimum (8GB recommended)</li>
            <li>• 500MB free disk space</li>
            <li>• Internet connection required</li>
            <li>• Node.js 18+ (for development features)</li>
          </ul>
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
            onClick={handleDownload}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>{loading ? 'Processing...' : 'Download & Continue'}</span>
          </button>
        </div>

        {/* Help Link */}
        <div className="text-center">
          <a
            href="/docs/desktop-agent"
            target="_blank"
            className="text-sm text-blue-600 hover:underline inline-flex items-center"
          >
            <span>View detailed installation guide</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>
    </StepCard>
  );
}
