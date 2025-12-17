/**
 * RTL (Right-to-Left) Support Utilities
 * Provides support for RTL languages like Arabic and Hebrew
 */

import { type Locale } from './config';

// RTL languages (currently none in our supported set, but infrastructure ready)
export const rtlLocales: Locale[] = [];

// Future RTL support (when Arabic/Hebrew are added)
export const potentialRtlLocales = ['ar', 'he', 'fa', 'ur'];

/**
 * Check if a locale uses RTL direction
 */
export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Get text direction for a locale
 */
export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get appropriate text alignment for a locale
 */
export function getTextAlign(locale: Locale): 'left' | 'right' {
  return isRTL(locale) ? 'right' : 'left';
}

/**
 * Mirror value for RTL (e.g., padding-left becomes padding-right)
 */
export function mirrorValue<T extends Record<string, any>>(
  locale: Locale,
  ltrValue: T,
  rtlValue: T
): T {
  return isRTL(locale) ? rtlValue : ltrValue;
}

/**
 * RTL-aware class names
 */
export function rtlClass(locale: Locale, ltrClass: string, rtlClass: string): string {
  return isRTL(locale) ? rtlClass : ltrClass;
}

/**
 * Generate RTL CSS variables
 */
export function getRTLCSSVariables(locale: Locale): Record<string, string> {
  const direction = getDirection(locale);
  const isRtl = direction === 'rtl';

  return {
    '--direction': direction,
    '--text-align': isRtl ? 'right' : 'left',
    '--text-align-opposite': isRtl ? 'left' : 'right',
    '--margin-start': isRtl ? 'margin-right' : 'margin-left',
    '--margin-end': isRtl ? 'margin-left' : 'margin-right',
    '--padding-start': isRtl ? 'padding-right' : 'padding-left',
    '--padding-end': isRtl ? 'padding-left' : 'padding-right',
    '--border-start': isRtl ? 'border-right' : 'border-left',
    '--border-end': isRtl ? 'border-left' : 'border-right',
    '--float-start': isRtl ? 'right' : 'left',
    '--float-end': isRtl ? 'left' : 'right',
  };
}

/**
 * Apply RTL transformations to tailwind classes
 */
export function rtlTailwind(locale: Locale, classes: string): string {
  if (!isRTL(locale)) return classes;

  // Map of LTR -> RTL class transformations
  const transformations: Record<string, string> = {
    // Margin
    'ml-': 'mr-',
    'mr-': 'ml-',
    // Padding
    'pl-': 'pr-',
    'pr-': 'pl-',
    // Border
    'border-l-': 'border-r-',
    'border-r-': 'border-l-',
    'rounded-l-': 'rounded-r-',
    'rounded-r-': 'rounded-l-',
    // Text
    'text-left': 'text-right',
    'text-right': 'text-left',
    // Flexbox
    'items-start': 'items-end',
    'items-end': 'items-start',
    'justify-start': 'justify-end',
    'justify-end': 'justify-start',
  };

  let result = classes;

  // Apply transformations
  Object.entries(transformations).forEach(([ltr, rtl]) => {
    const regex = new RegExp(ltr, 'g');
    result = result.replace(regex, rtl);
  });

  return result;
}

/**
 * Hook for RTL-aware styling (for use in components)
 */
export function useRTL(locale: Locale) {
  const isRtl = isRTL(locale);
  const direction = getDirection(locale);

  return {
    isRtl,
    direction,
    textAlign: getTextAlign(locale),
    mirror: <T extends Record<string, any>>(ltr: T, rtl: T) => mirrorValue(locale, ltr, rtl),
    className: (ltr: string, rtl: string) => rtlClass(locale, ltr, rtl),
    cssVariables: getRTLCSSVariables(locale),
  };
}
