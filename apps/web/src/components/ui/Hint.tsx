'use client';

import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface HintProps {
  id: string;
  title: string;
  content: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showAfter?: number; // milliseconds
  dismissible?: boolean;
}

export default function Hint({
  id,
  title,
  content,
  position = 'bottom-right',
  showAfter = 1000,
  dismissible = true,
}: HintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if hint was previously dismissed
    const dismissed = localStorage.getItem(`hint-dismissed-${id}`);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show hint after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, showAfter);

    return () => clearTimeout(timer);
  }, [id, showAfter]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    if (dismissible) {
      localStorage.setItem(`hint-dismissed-${id}`, 'true');
    }
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 max-w-sm animate-slide-in-up`}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-blue-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-blue-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{content}</p>
          </div>

          {dismissible && (
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
