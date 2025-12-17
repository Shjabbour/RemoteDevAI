# i18n Installation Guide

## Required Dependencies

To complete the i18n setup, you need to install the following dependencies:

### Web App (apps/web)

```bash
cd apps/web
npm install next-intl@^3.22.4
```

**package.json addition:**
```json
{
  "dependencies": {
    "next-intl": "^3.22.4"
  }
}
```

### Mobile App (apps/mobile)

```bash
cd apps/mobile
npm install i18next@^23.7.6 react-i18next@^14.0.0 expo-localization@~15.0.0
```

**package.json additions:**
```json
{
  "dependencies": {
    "i18next": "^23.7.6",
    "react-i18next": "^14.0.0",
    "expo-localization": "~15.0.0"
  }
}
```

### Translation Extraction Script

```bash
cd scripts
npm install --save-dev glob@^10.3.10
```

Or install at root level:
```bash
npm install --save-dev glob@^10.3.10
```

## Next.js Configuration

Update `apps/web/next.config.js`:

```javascript
const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config
};

module.exports = withNextIntl(nextConfig);
```

## Middleware Setup (Optional)

If you want locale-based routing (e.g., /en/dashboard, /es/dashboard), create `apps/web/src/middleware.ts`:

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // or 'always' for /en/page format
});

export const config = {
  matcher: ['/', '/(de|en|es|fr|ja|zh)/:path*']
};
```

## Root Layout Update

Update `apps/web/src/app/layout.tsx`:

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## Mobile App Initialization

Update `apps/mobile/App.tsx` or your root component:

```typescript
import './src/i18n'; // Import i18n config

// Rest of your app
export default function App() {
  return (
    // Your app content
  );
}
```

## Babel Configuration (Mobile)

Update `apps/mobile/babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... your existing plugins
    ],
  };
};
```

## TypeScript Configuration

Add type definitions to `apps/web/src/types/i18n.d.ts`:

```typescript
import en from '@/messages/en.json';

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
```

## Verification Steps

After installation, verify everything works:

### 1. Web App

```bash
cd apps/web
npm run dev
```

Visit `http://localhost:3000` and check:
- [ ] No console errors related to i18n
- [ ] Language switcher appears and works
- [ ] Translations load correctly

### 2. Mobile App

```bash
cd apps/mobile
npm start
```

- [ ] No i18n-related errors on app load
- [ ] Device language is detected correctly
- [ ] Language can be changed in settings

### 3. Backend API

```bash
cd apps/cloud
npm run dev
```

Test with curl:
```bash
# English
curl -H "Accept-Language: en" http://localhost:3000/api/test

# Spanish
curl -H "Accept-Language: es" http://localhost:3000/api/test
```

### 4. Run Translation Extraction

```bash
npm run extract-translations
```

Should output:
```
🔍 Scanning codebase for translation usage...
✅ Found X translation key usages
📚 Loading translation files...
✅ No missing translations found
✅ Translation check passed
```

## Troubleshooting

### Issue: Module not found 'next-intl'

**Solution:**
```bash
cd apps/web
npm install next-intl
```

### Issue: i18next not initialized

**Solution:**
Make sure you import the i18n config file:
```typescript
import './i18n'; // or import '../i18n'
```

### Issue: Translations not loading

**Solution:**
1. Check file paths are correct
2. Verify JSON files are valid
3. Check console for errors
4. Clear build cache: `npm run clean && npm run build`

### Issue: TypeScript errors with useTranslations

**Solution:**
Add type definitions:
```typescript
// types/i18n.d.ts
import 'next-intl';
```

## Optional Enhancements

### 1. Add to package.json scripts

```json
{
  "scripts": {
    "extract-translations": "tsx scripts/extract-translations.ts",
    "i18n:check": "npm run extract-translations",
    "i18n:export": "tsx scripts/export-translations.ts"
  }
}
```

### 2. Pre-commit Hook

Add to `.husky/pre-commit`:
```bash
#!/bin/sh
npm run i18n:check
```

### 3. CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Check translations
  run: npm run extract-translations
```

## Production Deployment

### Environment Variables

No additional environment variables needed for basic i18n.

Optional:
```bash
# Default locale (fallback)
DEFAULT_LOCALE=en

# Supported locales
SUPPORTED_LOCALES=en,es,fr,de,zh,ja
```

### Build Optimization

Translations are automatically optimized during build:
- Code splitting by locale
- Tree shaking of unused translations
- Minification of JSON files

### CDN Configuration

If using a CDN, ensure translation files are cached appropriately:
```
Cache-Control: public, max-age=31536000, immutable
```

## Migration Checklist

- [ ] Install dependencies (web, mobile, backend)
- [ ] Update Next.js config
- [ ] Update root layout
- [ ] Create middleware (optional)
- [ ] Initialize mobile i18n
- [ ] Add language switchers to UI
- [ ] Test in all supported languages
- [ ] Run translation extraction script
- [ ] Update documentation
- [ ] Train team on i18n usage
- [ ] Set up CI/CD checks

## Next Steps

1. Review the [I18N.md](./I18N.md) documentation
2. Add language switchers to your navigation
3. Start translating hardcoded strings
4. Set up the admin panel at `/admin/translations`
5. Configure your deployment pipeline

## Support

For installation issues:
1. Check this guide
2. Verify all dependencies are installed
3. Check package.json versions
4. Clear node_modules and reinstall
5. Open an issue with error details
