'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) {
      // Check user's onboarding status from metadata
      const onboardingCompleted = user?.publicMetadata?.onboardingCompleted;
      const onboardingStep = user?.publicMetadata?.onboardingStep || 0;

      if (onboardingCompleted) {
        router.push('/dashboard');
      } else if (onboardingStep === 0) {
        router.push('/onboarding/step-1');
      } else {
        router.push(`/onboarding/step-${onboardingStep + 1}`);
      }
    }
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading onboarding...</p>
      </div>
    </div>
  );
}
