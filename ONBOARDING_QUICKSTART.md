# Onboarding System - Quick Start Guide

Get the onboarding system up and running in 5 minutes.

## Step 1: Run Database Migration

```bash
cd apps/cloud

# Option A: Using Prisma (recommended)
npx prisma migrate dev --name add_onboarding_fields
npx prisma generate

# Option B: Manual SQL (if Prisma not available)
psql $DATABASE_URL < prisma/migrations/add_onboarding_fields.sql
```

## Step 2: Register API Routes

Edit `apps/cloud/src/server.ts`:

```typescript
// Add import at top
import onboardingRoutes from './routes/onboarding.routes';

// Add route registration (after other routes)
app.use('/api/onboarding', onboardingRoutes);
```

## Step 3: Rebuild Shared Package

```bash
cd packages/shared
npm run build
```

## Step 4: Add Components to Layouts

### Web Layout

Edit `apps/web/src/app/layout.tsx`:

```typescript
import Help from '@/components/Help';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Help />
        <KeyboardShortcuts />
      </body>
    </html>
  );
}
```

### Mobile Layout (optional)

Edit `apps/mobile/app/_layout.tsx`:

```typescript
import { useUser } from '@clerk/clerk-expo';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  const { user, isLoaded } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inOnboarding = segments[0] === 'onboarding';
    const onboardingCompleted = user?.publicMetadata?.onboardingCompleted;

    if (!onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding/step-1');
    } else if (onboardingCompleted && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoaded]);

  return <Stack />;
}
```

## Step 5: Add Onboarding Check to Dashboard

Edit `apps/web/src/app/dashboard/layout.tsx` or middleware:

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      const onboardingCompleted = user.publicMetadata?.onboardingCompleted;
      if (!onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

## Step 6: Test the Flow

### Web Testing

1. Start the dev server:
```bash
npm run dev:web
```

2. Sign up as a new user
3. Should automatically redirect to `/onboarding`
4. Complete the flow
5. Verify redirect to dashboard

### Mobile Testing

1. Start the mobile app:
```bash
npm run dev:mobile
```

2. Sign up as a new user
3. Should show onboarding steps
4. Complete the flow
5. Verify redirect to main tabs

### API Testing

Test endpoints with curl:

```bash
# Get onboarding progress
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/onboarding/progress

# Complete a step
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"step": 1, "data": {"name": "John", "role": "developer"}}' \
  http://localhost:3001/api/onboarding/complete-step

# Skip onboarding
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/onboarding/skip
```

## Step 7: Customize (Optional)

### Update Download Links

Edit `apps/web/src/components/onboarding/PlatformDownload.tsx`:

```typescript
const DOWNLOAD_LINKS = {
  windows: {
    x64: 'https://your-domain.com/downloads/RemoteDevAI-Setup-x64.exe',
    arm64: 'https://your-domain.com/downloads/RemoteDevAI-Setup-arm64.exe',
  },
  // ... update other platforms
};
```

### Add Real QR Code Library

```bash
cd apps/web
npm install qrcode.react
```

Edit `apps/web/src/components/onboarding/QRCodeConnect.tsx`:

```typescript
import QRCode from 'qrcode.react';

export default function QRCodeConnect({ connectionCode }: QRCodeConnectProps) {
  const qrValue = `remotedevai://connect/${connectionCode}`;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
        <QRCode value={qrValue} size={256} level="H" />
      </div>
      {/* ... rest of component */}
    </div>
  );
}
```

### Enable Analytics

The system automatically tracks events. To view analytics:

```typescript
// In your admin dashboard
const response = await fetch('/api/onboarding/statistics?dateFrom=2025-01-01');
const stats = await response.json();

console.log(`Completion rate: ${stats.completionRate}%`);
console.log(`Total completed: ${stats.totalCompleted}`);
```

## Common Issues

### Onboarding doesn't show for new users

**Check:**
1. User's Clerk metadata doesn't have `onboardingCompleted: true`
2. Redirect logic in layout/middleware is correct
3. Routes are properly registered

**Fix:**
```typescript
// Reset a user's onboarding status
await fetch('/api/onboarding/reset', { method: 'POST' });
```

### API routes return 404

**Check:**
1. Routes are imported in `server.ts`
2. Server is restarted after changes
3. Correct base path (`/api/onboarding`)

### Database migration fails

**Check:**
1. Database is running and accessible
2. Connection string is correct
3. Prisma is up to date

**Fix:**
```bash
npm install prisma@latest @prisma/client@latest
npx prisma generate
```

### Components not styled

**Check:**
1. TailwindCSS is configured
2. `globals.css` is imported
3. Class names are correct

## Next Steps

1. ✅ Read full documentation: `ONBOARDING.md`
2. ✅ Customize step content and styling
3. ✅ Add real download links
4. ✅ Set up analytics dashboard
5. ✅ Test with real users
6. ✅ Monitor completion rates
7. ✅ Iterate based on feedback

## Getting Help

- **Documentation:** See `ONBOARDING.md`
- **Issues:** GitHub Issues
- **Questions:** Discord community
- **Email:** support@remotedevai.com

## Checklist

- [ ] Database migration completed
- [ ] API routes registered
- [ ] Shared package rebuilt
- [ ] Help components added to layout
- [ ] Onboarding check added to dashboard
- [ ] Tested web flow
- [ ] Tested mobile flow (if applicable)
- [ ] Download links updated
- [ ] QR code library added (optional)
- [ ] Analytics verified

Once all items are checked, your onboarding system is ready! 🎉

---

**Happy onboarding!** 🚀
