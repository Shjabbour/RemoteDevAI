/**
 * Shared error message translations
 * Used across all RemoteDevAI applications
 */

import type { Locale } from './locales';

export interface ErrorMessages {
  validation: {
    required: string;
    email: string;
    password: string;
    passwordMatch: string;
    minLength: string;
    maxLength: string;
    pattern: string;
  };
  api: {
    serverError: string;
    networkError: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
    timeout: string;
    badRequest: string;
    conflict: string;
    unknown: string;
  };
  network: {
    offline: string;
    slow: string;
    disconnected: string;
    reconnecting: string;
  };
}

export const errorMessages: Record<Locale, ErrorMessages> = {
  en: {
    validation: {
      required: '{field} is required',
      email: 'Please enter a valid email address',
      password: 'Password must be at least 8 characters',
      passwordMatch: 'Passwords do not match',
      minLength: '{field} must be at least {min} characters',
      maxLength: '{field} must be at most {max} characters',
      pattern: '{field} format is invalid',
    },
    api: {
      serverError: 'Server error. Please try again later',
      networkError: 'Network error. Check your connection',
      unauthorized: 'You are not authorized to perform this action',
      forbidden: 'Access forbidden',
      notFound: 'The requested resource was not found',
      timeout: 'Request timeout. Please try again',
      badRequest: 'Invalid request',
      conflict: 'Resource already exists',
      unknown: 'An unknown error occurred',
    },
    network: {
      offline: 'You are offline',
      slow: 'Slow network connection',
      disconnected: 'Connection lost',
      reconnecting: 'Reconnecting...',
    },
  },
  es: {
    validation: {
      required: '{field} es requerido',
      email: 'Por favor ingresa una dirección de correo electrónico válida',
      password: 'La contraseña debe tener al menos 8 caracteres',
      passwordMatch: 'Las contraseñas no coinciden',
      minLength: '{field} debe tener al menos {min} caracteres',
      maxLength: '{field} debe tener como máximo {max} caracteres',
      pattern: 'Formato de {field} no válido',
    },
    api: {
      serverError: 'Error del servidor. Por favor intenta más tarde',
      networkError: 'Error de red. Verifica tu conexión',
      unauthorized: 'No estás autorizado para realizar esta acción',
      forbidden: 'Acceso prohibido',
      notFound: 'No se encontró el recurso solicitado',
      timeout: 'Tiempo de espera agotado. Por favor intenta de nuevo',
      badRequest: 'Solicitud no válida',
      conflict: 'El recurso ya existe',
      unknown: 'Ocurrió un error desconocido',
    },
    network: {
      offline: 'Estás desconectado',
      slow: 'Conexión de red lenta',
      disconnected: 'Conexión perdida',
      reconnecting: 'Reconectando...',
    },
  },
  fr: {
    validation: {
      required: '{field} est requis',
      email: 'Veuillez entrer une adresse e-mail valide',
      password: 'Le mot de passe doit contenir au moins 8 caractères',
      passwordMatch: 'Les mots de passe ne correspondent pas',
      minLength: '{field} doit contenir au moins {min} caractères',
      maxLength: '{field} doit contenir au maximum {max} caractères',
      pattern: 'Format de {field} non valide',
    },
    api: {
      serverError: 'Erreur serveur. Veuillez réessayer plus tard',
      networkError: 'Erreur réseau. Vérifiez votre connexion',
      unauthorized: 'Vous n\'êtes pas autorisé à effectuer cette action',
      forbidden: 'Accès interdit',
      notFound: 'La ressource demandée n\'a pas été trouvée',
      timeout: 'Délai d\'attente dépassé. Veuillez réessayer',
      badRequest: 'Demande non valide',
      conflict: 'La ressource existe déjà',
      unknown: 'Une erreur inconnue s\'est produite',
    },
    network: {
      offline: 'Vous êtes hors ligne',
      slow: 'Connexion réseau lente',
      disconnected: 'Connexion perdue',
      reconnecting: 'Reconnexion...',
    },
  },
  de: {
    validation: {
      required: '{field} ist erforderlich',
      email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      password: 'Passwort muss mindestens 8 Zeichen lang sein',
      passwordMatch: 'Passwörter stimmen nicht überein',
      minLength: '{field} muss mindestens {min} Zeichen lang sein',
      maxLength: '{field} darf höchstens {max} Zeichen lang sein',
      pattern: '{field} Format ist ungültig',
    },
    api: {
      serverError: 'Serverfehler. Bitte versuchen Sie es später erneut',
      networkError: 'Netzwerkfehler. Überprüfen Sie Ihre Verbindung',
      unauthorized: 'Sie sind nicht berechtigt, diese Aktion auszuführen',
      forbidden: 'Zugriff verboten',
      notFound: 'Die angeforderte Ressource wurde nicht gefunden',
      timeout: 'Zeitüberschreitung der Anfrage. Bitte versuchen Sie es erneut',
      badRequest: 'Ungültige Anfrage',
      conflict: 'Ressource existiert bereits',
      unknown: 'Ein unbekannter Fehler ist aufgetreten',
    },
    network: {
      offline: 'Sie sind offline',
      slow: 'Langsame Netzwerkverbindung',
      disconnected: 'Verbindung verloren',
      reconnecting: 'Verbindung wird wiederhergestellt...',
    },
  },
  zh: {
    validation: {
      required: '{field}为必填项',
      email: '请输入有效的电子邮件地址',
      password: '密码必须至少8个字符',
      passwordMatch: '密码不匹配',
      minLength: '{field}必须至少{min}个字符',
      maxLength: '{field}最多{max}个字符',
      pattern: '{field}格式无效',
    },
    api: {
      serverError: '服务器错误。请稍后再试',
      networkError: '网络错误。请检查您的连接',
      unauthorized: '您无权执行此操作',
      forbidden: '访问被禁止',
      notFound: '未找到请求的资源',
      timeout: '请求超时。请重试',
      badRequest: '无效请求',
      conflict: '资源已存在',
      unknown: '发生未知错误',
    },
    network: {
      offline: '您已离线',
      slow: '网络连接缓慢',
      disconnected: '连接丢失',
      reconnecting: '正在重新连接...',
    },
  },
  ja: {
    validation: {
      required: '{field}は必須です',
      email: '有効なメールアドレスを入力してください',
      password: 'パスワードは8文字以上である必要があります',
      passwordMatch: 'パスワードが一致しません',
      minLength: '{field}は{min}文字以上である必要があります',
      maxLength: '{field}は{max}文字以下である必要があります',
      pattern: '{field}の形式が無効です',
    },
    api: {
      serverError: 'サーバーエラー。後でもう一度お試しください',
      networkError: 'ネットワークエラー。接続を確認してください',
      unauthorized: 'この操作を実行する権限がありません',
      forbidden: 'アクセスが禁止されています',
      notFound: '要求されたリソースが見つかりませんでした',
      timeout: 'リクエストタイムアウト。もう一度お試しください',
      badRequest: '無効なリクエスト',
      conflict: 'リソースは既に存在します',
      unknown: '不明なエラーが発生しました',
    },
    network: {
      offline: 'オフラインです',
      slow: 'ネットワーク接続が遅い',
      disconnected: '接続が失われました',
      reconnecting: '再接続中...',
    },
  },
};

/**
 * Get error message for a specific locale
 */
export function getErrorMessage(
  locale: Locale,
  category: keyof ErrorMessages,
  key: string,
  replacements?: Record<string, string | number>
): string {
  const messages = errorMessages[locale];
  let message = (messages[category] as any)[key] || errorMessages.en.api.unknown;

  // Replace placeholders
  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      message = message.replace(`{${placeholder}}`, String(value));
    });
  }

  return message;
}
