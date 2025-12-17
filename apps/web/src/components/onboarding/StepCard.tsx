'use client';

import { Clock } from 'lucide-react';

interface StepCardProps {
  title: string;
  description: string;
  step: number;
  estimatedTime?: number;
  children: React.ReactNode;
}

export default function StepCard({
  title,
  description,
  step,
  estimatedTime,
  children,
}: StepCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 font-bold text-2xl mb-4">
            {step}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-lg text-gray-600">{description}</p>
          {estimatedTime && (
            <div className="mt-3 inline-flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              <span>{estimatedTime} min</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
          {children}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <a href="/docs" className="text-blue-600 hover:underline">
              View documentation
            </a>{' '}
            or{' '}
            <a href="/support" className="text-blue-600 hover:underline">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
