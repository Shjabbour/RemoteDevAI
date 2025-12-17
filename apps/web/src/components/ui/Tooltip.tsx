'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0;
        let y = 0;

        switch (position) {
          case 'top':
            x = rect.left + rect.width / 2;
            y = rect.top;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2;
            y = rect.bottom;
            break;
          case 'left':
            x = rect.left;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right;
            y = rect.top + rect.height / 2;
            break;
        }

        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipElement = isVisible ? (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        transform: getTransform(position),
      }}
    >
      <div className={`relative ${getMargin(position)}`}>
        <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs">
          {content}
        </div>
        {/* Arrow */}
        <div
          className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${getArrowPosition(
            position
          )}`}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {typeof document !== 'undefined' &&
        tooltipElement &&
        createPortal(tooltipElement, document.body)}
    </>
  );
}

function getTransform(position: string): string {
  switch (position) {
    case 'top':
      return 'translateX(-50%)';
    case 'bottom':
      return 'translateX(-50%)';
    case 'left':
      return 'translateY(-50%)';
    case 'right':
      return 'translateY(-50%)';
    default:
      return '';
  }
}

function getMargin(position: string): string {
  switch (position) {
    case 'top':
      return 'mb-2';
    case 'bottom':
      return 'mt-2';
    case 'left':
      return 'mr-2';
    case 'right':
      return 'ml-2';
    default:
      return '';
  }
}

function getArrowPosition(position: string): string {
  switch (position) {
    case 'top':
      return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
    case 'bottom':
      return 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
    case 'left':
      return 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2';
    case 'right':
      return 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2';
    default:
      return '';
  }
}
