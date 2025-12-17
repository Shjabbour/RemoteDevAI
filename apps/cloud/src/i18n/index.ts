/**
 * Backend i18n support for RemoteDevAI Cloud API
 * Handles Accept-Language header parsing and response localization
 */

import { Request } from 'express';

export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/**
 * Parse Accept-Language header to determine preferred locale
 * Follows RFC 2616 specification
 */
export function parseAcceptLanguage(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header
  // Format: "en-US,en;q=0.9,es;q=0.8,fr;q=0.7"
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, q = 'q=1'] = lang.trim().split(';');
      const quality = parseFloat(q.split('=')[1] || '1');
      return {
        locale: locale.split('-')[0].toLowerCase(),
        quality: isNaN(quality) ? 0 : quality,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported locale
  for (const { locale } of languages) {
    if (locales.includes(locale as Locale)) {
      return locale as Locale;
    }
  }

  return defaultLocale;
}

/**
 * Get locale from Express request
 * Checks in order:
 * 1. Query parameter (lang=en)
 * 2. User preference (if authenticated)
 * 3. Accept-Language header
 * 4. Default locale
 */
export function getLocaleFromRequest(req: Request, userLocale?: Locale): Locale {
  // Check query parameter
  const queryLang = req.query.lang as string;
  if (queryLang && locales.includes(queryLang as Locale)) {
    return queryLang as Locale;
  }

  // Check user preference (from database)
  if (userLocale && locales.includes(userLocale)) {
    return userLocale;
  }

  // Parse Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  return parseAcceptLanguage(acceptLanguage);
}

/**
 * Middleware to add locale to request object
 */
export function localeMiddleware(req: Request, res: any, next: any) {
  // Add locale to request object
  (req as any).locale = getLocaleFromRequest(req);
  next();
}

/**
 * API error messages in multiple languages
 */
export const apiErrors: Record<Locale, Record<string, string>> = {
  en: {
    serverError: 'Internal server error',
    notFound: 'Resource not found',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access forbidden',
    badRequest: 'Invalid request',
    validationError: 'Validation error',
    conflict: 'Resource already exists',
    tooManyRequests: 'Too many requests',
  },
  es: {
    serverError: 'Error interno del servidor',
    notFound: 'Recurso no encontrado',
    unauthorized: 'Acceso no autorizado',
    forbidden: 'Acceso prohibido',
    badRequest: 'Solicitud no válida',
    validationError: 'Error de validación',
    conflict: 'El recurso ya existe',
    tooManyRequests: 'Demasiadas solicitudes',
  },
  fr: {
    serverError: 'Erreur interne du serveur',
    notFound: 'Ressource non trouvée',
    unauthorized: 'Accès non autorisé',
    forbidden: 'Accès interdit',
    badRequest: 'Demande non valide',
    validationError: 'Erreur de validation',
    conflict: 'La ressource existe déjà',
    tooManyRequests: 'Trop de demandes',
  },
  de: {
    serverError: 'Interner Serverfehler',
    notFound: 'Ressource nicht gefunden',
    unauthorized: 'Nicht autorisierter Zugriff',
    forbidden: 'Zugriff verboten',
    badRequest: 'Ungültige Anfrage',
    validationError: 'Validierungsfehler',
    conflict: 'Ressource existiert bereits',
    tooManyRequests: 'Zu viele Anfragen',
  },
  zh: {
    serverError: '内部服务器错误',
    notFound: '资源未找到',
    unauthorized: '未授权访问',
    forbidden: '访问被禁止',
    badRequest: '无效请求',
    validationError: '验证错误',
    conflict: '资源已存在',
    tooManyRequests: '请求过多',
  },
  ja: {
    serverError: '内部サーバーエラー',
    notFound: 'リソースが見つかりません',
    unauthorized: '未承認アクセス',
    forbidden: 'アクセスが禁止されています',
    badRequest: '無効なリクエスト',
    validationError: '検証エラー',
    conflict: 'リソースは既に存在します',
    tooManyRequests: 'リクエストが多すぎます',
  },
};

/**
 * Get localized API error message
 */
export function getApiError(locale: Locale, errorKey: string): string {
  return apiErrors[locale][errorKey] || apiErrors[defaultLocale][errorKey] || 'Unknown error';
}

/**
 * Format error response with localization
 */
export function formatErrorResponse(
  locale: Locale,
  errorKey: string,
  details?: any
): { success: false; error: string; message: string; details?: any } {
  return {
    success: false,
    error: errorKey,
    message: getApiError(locale, errorKey),
    ...(details && { details }),
  };
}
