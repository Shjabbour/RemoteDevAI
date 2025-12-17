'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProgressBar from '@/components/onboarding/ProgressBar';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Extract step number from pathname (e.g., /onboarding/step-1)
    const match = pathname?.match(/step-(\d+)/);
    if (match) {
      setCurrentStep(parseInt(match[1]));
    } else if (pathname?.includes('complete')) {
      setCurrentStep(6);
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Progress Bar */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProgressBar currentStep={currentStep} totalSteps={5} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={currentStep > 0 && currentStep < 6 ? 'pt-20' : ''}>
        {children}
      </main>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
      </div>
    </div>
  );
}
